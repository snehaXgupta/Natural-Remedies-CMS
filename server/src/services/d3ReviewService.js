import mongoose from 'mongoose';
import {
  ComplaintAssignment,
  ComplaintStageRecord,
  RootCauseAnalysis,
  FishboneCause,
  RootCause,
  CapaRecord,
  Role,
  User,
} from '../models/index.js';
import { STATUSES as S } from '../config/workflow.js';
import { PERMISSIONS as P } from '../auth/permissions.js';
import { AppError } from '../utils/AppError.js';
import { d3ApprovalRequest, d3CapaRejected, capaImplementationAssignment, rootCausesApprovedNotice } from '../mail/templates.js';
import * as inApp from './inAppNotificationService.js';
import { findVisible, getDetail } from './complaintService.js';
import { canEdit, buildTree } from './d3Service.js';
import * as workflow from './workflowService.js';
import * as notifications from './notificationService.js';
import * as audit from './auditService.js';

/*
 * D3 submission and review.
 *
 * Submit:  the FRP picks a reviewer (any active user whose role can review D3,
 *          never themselves) and submits. Everything is checked first, and the
 *          exact submitted version is stored as a snapshot.
 * Decide:  only the assigned reviewer may approve or reject. Administrators
 *          (users.manage + complaint.d3.review) may decide if the reviewer is
 *          unavailable. Nobody may decide on their own submission.
 * Reject:  remarks are mandatory; the FRP is emailed once per CAPA ("CAPA
 *          Rejected – Action Required"); the complaint returns to rework and
 *          the rejected version stays readable in the review history.
 */

/* ---------------- Readiness ---------------- */

/** Everything that must be true before submitting, as plain-language messages. */
export async function readinessIssues(complaintId) {
  let analysis = await RootCauseAnalysis.findOne({ complaint: complaintId }).lean();
  if (!analysis) return ['Start the analysis first.'];

  // Auto-backfill problem statement from complaint.shortDescription if missing
  if (!analysis.problemStatement?.trim()) {
    const complaint = await mongoose.model('Complaint').findById(complaintId).lean();
    if (complaint?.shortDescription?.trim()) {
      await RootCauseAnalysis.updateOne(
        { _id: analysis._id },
        { $set: { problemStatement: complaint.shortDescription.trim() } }
      );
      analysis.problemStatement = complaint.shortDescription.trim();
    }
  }

  // Auto-default methods to WHY_WHY if empty
  if (!analysis.methods?.length) {
    await RootCauseAnalysis.updateOne(
      { _id: analysis._id },
      { $set: { methods: ['WHY_WHY'] } }
    );
    analysis.methods = ['WHY_WHY'];
  }

  const issues = [];
  if (!analysis.methods?.length) issues.push('Choose an analysis method: Why-Why, Fishbone or both.');
  if (!analysis.problemStatement?.trim()) issues.push('Enter the problem statement.');
  if (analysis.methods?.includes('WHY_WHY') && !analysis.whyWhy?.some((w) => w.why?.trim() && w.because?.trim())) {
    issues.push('Complete at least one Why-Why level with both the question and the answer.');
  }
  if (analysis.methods?.includes('FISHBONE') && !(await FishboneCause.exists({ analysis: analysis._id, deletedAt: null }))) {
    issues.push('Add at least one cause to the fishbone diagram.');
  }
  const rootCauses = await RootCause.find({ analysis: analysis._id, deletedAt: null }).lean();
  if (!rootCauses.length) issues.push('Record at least one root cause.');
  const capas = await CapaRecord.find({ complaint: complaintId, deletedAt: null }).lean();
  for (const rc of rootCauses) {
    if (!capas.some((c) => String(c.rootCause) === String(rc._id))) {
      issues.push(`Add a CAPA record (or record that CAPA is not required) for the root cause “${rc.description.slice(0, 60)}”.`);
    }
  }
  for (const c of capas) {
    if (c.capaRequired && (!c.correctiveAction || !c.responsiblePerson || !c.targetDate)) {
      issues.push(`${c.capaNumber} needs a corrective action, a responsible person and a target date.`);
    }
  }
  return issues;
}


/**
 * Automatically resolve the FRP's Manager from database mapping.
 * Strategy: FRP direct manager (user.manager) -> Department manager (department.manager) -> Designated FRP Manager (Thippeswamy).
 */
export async function getFrpManager(complaint) {
  if (complaint?.frp) {
    const frpUser = await User.findById(complaint.frp)
      .populate('manager', 'name email designation roles isActive')
      .populate({
        path: 'department',
        populate: { path: 'manager', select: 'name email designation roles isActive' },
      })
      .lean();

    if (frpUser?.manager && frpUser.manager.isActive && frpUser.manager.email?.includes('@')) {
      return frpUser.manager;
    }
    if (frpUser?.department?.manager && frpUser.department.manager.isActive && frpUser.department.manager.email?.includes('@')) {
      return frpUser.department.manager;
    }
  }

  // Fallback 1: Specifically designated FRP Manager (Thippeswamy)
  const designated = await User.findOne(
    {
      $or: [{ email: 'thippeswamy@naturalremedies.com' }, { name: /Thippeswamy/i }],
      isActive: true,
    },
    { _id: 1, name: 1, email: 1, designation: 1, roles: 1 }
  ).lean();
  if (designated && designated.email?.includes('@')) {
    return designated;
  }

  // Fallback 2: Any active reviewer with a naturalremedies email
  const reviewer = await User.findOne(
    {
      roles: 'reviewer',
      isActive: true,
      email: /@naturalremedies\.com$/i,
    },
    { _id: 1, name: 1, email: 1, designation: 1, roles: 1 }
  ).lean();
  if (reviewer && reviewer.email?.includes('@')) {
    return reviewer;
  }

  return null;
}

export async function readiness(id, user, permissions) {
  const complaint = await findVisible(id, user, permissions, { lean: true });
  const frpManager = await getFrpManager(complaint);
  return {
    issues: await readinessIssues(complaint._id),
    frpManager: frpManager ? {
      _id: frpManager._id,
      name: frpManager.name,
      email: frpManager.email,
      designation: frpManager.designation,
    } : null,
  };
}

/** Active users who may review D3, excluding the person asking. */
export async function reviewerCandidates(excludeUserId) {
  const roles = await Role.find({ permissions: P.COMPLAINT_D3_REVIEW }, { key: 1 }).lean();
  const filter = { isActive: true, roles: { $in: roles.map((r) => r.key) }, email: /@/ };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  return User.find(
    filter,
    { name: 1, email: 1, designation: 1, department: 1 },
  )
    .sort({ name: 1 })
    .populate('department', 'name')
    .lean();
}

/* ---------------- Snapshot ---------------- */

/** The complete analysis as submitted, stored with the submission record. */
async function snapshot(complaintId, session) {
  const analysis = await RootCauseAnalysis.findOne({ complaint: complaintId }).session(session).lean();
  const [causes, rootCauses, capas] = await Promise.all([
    FishboneCause.find({ analysis: analysis._id, deletedAt: null }).session(session).lean(),
    RootCause.find({ analysis: analysis._id, deletedAt: null }).sort({ createdAt: 1 }).session(session).lean(),
    CapaRecord.find({ complaint: complaintId, deletedAt: null }).sort({ createdAt: 1 }).populate('responsiblePerson', 'name').session(session).lean(),
  ]);
  return {
    methods: analysis.methods,
    problemStatement: analysis.problemStatement,
    whyWhy: analysis.whyWhy.map(({ level, why, because }) => ({ level, why, because })),
    fishbone: buildTree(causes),
    rootCauses: rootCauses.map((r) => ({
      _id: r._id,
      category: r.category,
      description: r.description,
      capas: capas
        .filter((c) => String(c.rootCause) === String(r._id))
        .map((c) => ({
          _id: c._id,
          capaNumber: c.capaNumber,
          capaRequired: c.capaRequired,
          category: c.category,
          description: c.description,
          correctiveAction: c.correctiveAction,
          preventiveAction: c.preventiveAction,
          responsiblePerson: c.responsiblePerson?.name,
          targetDate: c.targetDate,
          actionStatus: c.actionStatus,
        })),
    })),
  };
}

/* ---------------- Submit / resubmit ---------------- */

export async function submit(id, { reviewerId, remarks, idempotencyKey }, { user, permissions, context }) {
  const complaint = await findVisible(id, user, permissions);
  // A retried request (e.g. after a timeout) returns the result it already had.
  if (await workflow.alreadyDone(complaint._id, idempotencyKey)) return getDetail(id, user, permissions);
  if (!permissions.has(P.COMPLAINT_D3_EDIT)) throw AppError.forbidden();
  if (![S.D3_IN_PROGRESS, S.D3_REWORK].includes(complaint.status)) {
    throw AppError.conflict(
      complaint.status === S.D3_PENDING_APPROVAL ? 'This analysis is already waiting for approval.' : 'The analysis cannot be submitted at this stage.',
    );
  }
  if (!canEdit(complaint, user, permissions)) {
    throw AppError.forbidden('Only the First Responsible Person for this complaint can submit the analysis.');
  }
  const action = complaint.status === S.D3_REWORK ? 'resubmitD3' : 'submitD3';

  const issues = await readinessIssues(complaint._id);
  const isAdmin = permissions.has(P.USERS_MANAGE) || user.roles?.includes('admin');
  let reviewer = null;
  if (reviewerId) {
    reviewer = (await reviewerCandidates(isAdmin ? null : user._id)).find((u) => String(u._id) === String(reviewerId));
  }
  if (!reviewer) {
    reviewer = await getFrpManager(complaint);
  }
  if (!reviewer) {
    issues.push(
      String(reviewerId) === String(user._id) && !isAdmin
        ? 'You cannot review your own analysis. Choose another reviewer.'
        : 'Choose an active reviewer whose role can approve D3.',
    );
  }
  if (issues.length) throw AppError.validation(issues.map((message) => ({ field: null, message })));

  let queued = false;
  let submissionComplaint = null;
  let assignedReviewer = null;

  await mongoose.connection.transaction(async (session) => {
    queued = false;
    const { complaint: updated, replayed } = await workflow.perform(id, action, { actor: user, permissions, remarks, idempotencyKey, context, session });
    if (replayed) return;
    submissionComplaint = updated;
    assignedReviewer = reviewer;
    const now = new Date();
    const analysis = await RootCauseAnalysis.findOneAndUpdate(
      { complaint: updated._id },
      { $set: { status: 'PENDING_APPROVAL', lastSubmittedAt: now, lastSubmittedBy: user._id }, $inc: { submissionCount: 1 } },
      { returnDocument: 'after', session },
    );
    const version = analysis.submissionCount;
    await CapaRecord.updateMany(
      { complaint: updated._id, deletedAt: null },
      { $set: { reviewStatus: 'SUBMITTED', approvalStatus: 'PENDING' } },
      { session },
    );

    // The reviewer is recorded as an assignment: it gives them access and keeps history.
    await ComplaintAssignment.updateOne(
      { complaint: updated._id, role: 'REVIEWER', active: true },
      { $set: { active: false, endedAt: now, endedBy: user._id } },
      { session },
    );
    await ComplaintAssignment.create(
      [{ complaint: updated._id, role: 'REVIEWER', assignee: reviewer._id, assignedBy: user._id, assignedAt: now, reason: `D3 submission ${version}` }],
      { session },
    );

    const snap = await snapshot(updated._id, session);
    await ComplaintStageRecord.create(
      [{ complaint: updated._id, stage: 'D3', kind: 'SUBMISSION', actor: user._id, at: now, remarks: remarks?.trim() || undefined, version, snapshot: { ...snap, reviewer: { _id: reviewer._id, name: reviewer.name } } }],
      { session },
    );

    await notifications.enqueue({
      type: 'D3_APPROVAL_REQUEST',
      complaint: updated._id,
      recipient: reviewer.email,
      recipientUser: reviewer._id,
      dedupeKey: `D3_SUBMIT:${updated._id}:${version}`,
      message: d3ApprovalRequest(updated, {
        reviewerName: reviewer.name,
        submitterName: user.name,
        version,
        rootCauses: snap.rootCauses.length,
        capas: snap.rootCauses.reduce((n, r) => n + r.capas.length, 0),
        remarks: remarks?.trim(),
      }),
      session,
    });
    queued = true;

    await audit.record({
      actor: user,
      action: 'complaint.d3.submit',
      entityType: 'Complaint',
      entityId: updated._id,
      complaint: updated._id,
      summary: `${version > 1 ? `Resubmitted (version ${version})` : 'Submitted'} the analysis to ${reviewer.name} for approval`,
      after: { version, reviewer: reviewer.name, ...(remarks?.trim() ? { remarks: remarks.trim() } : {}) },
      context,
      session,
    });
  });

  if (queued) notifications.nudge();

  // Send Salesforce Bell In-App Notification to the Reviewer (FRP Manager)
  if (assignedReviewer?._id && submissionComplaint?._id) {
    await inApp.createNotification({
      recipient: assignedReviewer._id,
      complaint: submissionComplaint._id,
      title: 'D3 Root Cause & CAPA Submitted for Approval',
      message: `${user.name} submitted D3 root cause analysis and CAPA plan for complaint ${submissionComplaint.complaintNumber} for your review and approval.`,
      link: `/complaints/${submissionComplaint._id}?tab=D3`,
    });
  }

  return getDetail(id, user, permissions);
}

/* ---------------- Decide ---------------- */

async function assertMayDecide(complaint, user, permissions) {
  const isAdmin = permissions.has(P.USERS_MANAGE) || user.roles?.includes('admin');
  if (!permissions.has(P.COMPLAINT_D3_REVIEW) && !isAdmin) throw AppError.forbidden();
  const analysis = await RootCauseAnalysis.findOne({ complaint: complaint._id }).lean();
  if (!isAdmin && analysis && String(analysis.lastSubmittedBy) === String(user._id)) {
    throw AppError.forbidden('You submitted this analysis, so someone else must review it.');
  }
  const assignment = await ComplaintAssignment.findOne({ complaint: complaint._id, role: 'REVIEWER', active: true }).lean();
  const isAssigned = assignment && String(assignment.assignee) === String(user._id);
  if (!isAssigned && !isAdmin) {
    throw AppError.forbidden('Only the reviewer this analysis was submitted to can approve or reject it.');
  }
  return analysis;
}

export async function decide(id, decision, { remarks, idempotencyKey }, { user, permissions, context }) {
  const complaint = await findVisible(id, user, permissions);
  if (await workflow.alreadyDone(complaint._id, idempotencyKey)) return getDetail(id, user, permissions);
  if (complaint.status !== S.D3_PENDING_APPROVAL) {
    throw AppError.conflict('This analysis is not waiting for approval. Reload to see its current state.');
  }
  await assertMayDecide(complaint, user, permissions);
  const approve = decision === 'approve';
  const note = remarks?.trim();

  let queued = false;
  await mongoose.connection.transaction(async (session) => {
    queued = false;
    const { complaint: updated, replayed } = await workflow.perform(id, approve ? 'approveD3' : 'rejectD3', {
      actor: user,
      permissions,
      remarks: note,
      idempotencyKey,
      context,
      session,
    });
    if (replayed) return;
    const now = new Date();
    const analysis = await RootCauseAnalysis.findOneAndUpdate(
      { complaint: updated._id },
      { $set: { status: approve ? 'APPROVED' : 'REJECTED', reviewedAt: now, reviewedBy: user._id } },
      { returnDocument: 'after', session },
    );
    await CapaRecord.updateMany(
      { complaint: updated._id, deletedAt: null },
      { $set: { reviewStatus: 'REVIEWED', approvalStatus: approve ? 'APPROVED' : 'REJECTED' } },
      { session },
    );
    await ComplaintAssignment.updateOne(
      { complaint: updated._id, role: 'REVIEWER', active: true },
      { $set: { active: false, endedAt: now, endedBy: user._id } },
      { session },
    );
    await ComplaintStageRecord.create(
      [{ complaint: updated._id, stage: 'D3', kind: approve ? 'APPROVAL' : 'REJECTION', actor: user._id, at: now, remarks: note, version: analysis.submissionCount }],
      { session },
    );

    if (approve) {
      const allCapas = await CapaRecord.find({ complaint: updated._id, deletedAt: null }).session(session).lean();
      const allRootCauses = await RootCause.find({ complaint: updated._id, deletedAt: null }).session(session).lean();

      // 1. Notify FRP confirming all root causes approved by FRP Manager (SOP Page 13, Step 20.n)
      if (updated.frp) {
        const frp = await User.findById(updated.frp, { name: 1, email: 1 }).session(session).lean();
        if (frp?.email) {
          await notifications.enqueue({
            type: 'ROOT_CAUSES_APPROVED',
            complaint: updated._id,
            recipient: frp.email,
            recipientUser: frp._id,
            dedupeKey: `ROOT_CAUSES_APPROVED_FRP:${updated._id}:${analysis.submissionCount}`,
            message: rootCausesApprovedNotice(updated, {
              recipientName: frp.name,
              managerName: user.name,
              isHandler: false,
              count: allRootCauses.length || allCapas.length || 1,
              rootCauses: allCapas,
            }),
            session,
          });
          queued = true;
        }
      }

      // 2. Notify Complaint Handler that root causes have been approved (SOP Page 13, Step 20.o)
      if (updated.coordinator) {
        const handler = await User.findById(updated.coordinator, { name: 1, email: 1 }).session(session).lean();
        if (handler?.email) {
          await notifications.enqueue({
            type: 'ROOT_CAUSES_APPROVED',
            complaint: updated._id,
            recipient: handler.email,
            recipientUser: handler._id,
            dedupeKey: `ROOT_CAUSES_APPROVED_HANDLER:${updated._id}:${analysis.submissionCount}`,
            message: rootCausesApprovedNotice(updated, {
              recipientName: handler.name,
              managerName: user.name,
              isHandler: true,
              count: allRootCauses.length || allCapas.length || 1,
              rootCauses: allCapas,
            }),
            session,
          });
          queued = true;
        }
      }

      // 3. Assign each CAPA to the Responsible Person (SOP Page 14, Step 23)
      for (const capa of allCapas.filter((c) => c.capaRequired)) {
        if (capa.responsiblePerson) {
          const rpUser = await User.findById(capa.responsiblePerson, { name: 1, email: 1 }).session(session).lean();
          if (rpUser?.email) {
            await notifications.enqueue({
              type: 'CAPA_IMPLEMENTATION_ASSIGNMENT',
              complaint: updated._id,
              recipient: rpUser.email,
              recipientUser: rpUser._id,
              dedupeKey: `CAPA_ASSIGNMENT:${capa._id}:${analysis.submissionCount}`,
              message: capaImplementationAssignment(updated, capa, { rpName: rpUser.name }),
              session,
            });
            queued = true;
          }
          await inApp.createNotification({
            recipient: capa.responsiblePerson,
            complaint: updated._id,
            title: 'CAPA Implementation Assignment',
            message: `You have been assigned as Responsible Person to implement CAPA ${capa.capaNumber} for complaint ${updated.complaintNumber}.`,
            link: `/complaints/${updated._id}?tab=D3`,
          });
        }
      }
    }

    if (!approve) {
      const frp = updated.frp ? await User.findById(updated.frp, { name: 1, email: 1 }).session(session).lean() : null;
      if (frp) {
        const capas = await CapaRecord.find({ complaint: updated._id, deletedAt: null }).sort({ createdAt: 1 }).session(session).lean();
        const rootCauses = await RootCause.find({ complaint: updated._id, deletedAt: null }).session(session).lean();
        for (const capa of capas) {
          await notifications.enqueue({
            type: 'D3_REJECTED',
            complaint: updated._id,
            recipient: frp.email,
            recipientUser: frp._id,
            dedupeKey: `D3_REJECT:${capa._id}:${analysis.submissionCount}`,
            message: d3CapaRejected(updated, capa, rootCauses.find((r) => String(r._id) === String(capa.rootCause)), {
              recipientName: frp.name,
              rejectedBy: user.name,
              remarks: note,
            }),
            session,
          });
          queued = true;
        }
      }
    }

    await audit.record({
      actor: user,
      action: approve ? 'complaint.d3.approve' : 'complaint.d3.reject',
      entityType: 'Complaint',
      entityId: updated._id,
      complaint: updated._id,
      summary: approve ? `Approved the analysis (version ${analysis.submissionCount})` : `Rejected the analysis (version ${analysis.submissionCount}) and returned it for rework`,
      after: note ? { remarks: note } : undefined,
      context,
      session,
    });
  });
  if (queued) notifications.nudge();
  return getDetail(id, user, permissions);
}

/* ---------------- Review history ---------------- */

/** Every submission and decision, newest first, with the submitted snapshots. */
export async function history(id, user, permissions) {
  const complaint = await findVisible(id, user, permissions, { lean: true });
  return ComplaintStageRecord.find({ complaint: complaint._id, stage: 'D3' })
    .sort({ at: -1, _id: -1 })
    .populate('actor', 'name')
    .lean();
}

/** Who is currently reviewing (for the UI). */
export async function currentReviewer(complaintId) {
  const a = await ComplaintAssignment.findOne({ complaint: complaintId, role: 'REVIEWER', active: true }).populate('assignee', 'name email').lean();
  return a?.assignee || null;
}

