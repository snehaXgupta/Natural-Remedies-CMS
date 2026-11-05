import mongoose from 'mongoose';
import { Complaint, ComplaintAssignment, ComplaintStageRecord, Role, User } from '../models/index.js';
import { STATUSES as S } from '../config/workflow.js';
import { PERMISSIONS as P } from '../auth/permissions.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { d2FrpAssigned, d2Completed } from '../mail/templates.js';
import { findVisible, getDetail } from './complaintService.js';
import { validateSelections } from './lookupService.js';
import * as workflow from './workflowService.js';
import * as notifications from './notificationService.js';
import * as audit from './auditService.js';
import * as inApp from './inAppNotificationService.js';
import { d2SlaExtensionRequest } from '../mail/templates.js';
import { getFrpManager } from './d3ReviewService.js';

const who = (user, permissions, context) => ({ actor: user, permissions, context });

/* ---------------- Start D2 ---------------- */

export async function start(id, { idempotencyKey }, { user, permissions, context }) {
  await findVisible(id, user, permissions, { lean: true });
  await workflow.perform(id, 'startD2', { ...who(user, permissions, context), idempotencyKey });
  return getDetail(id, user, permissions);
}

/* ---------------- Save D2 fields ---------------- */

const EDITABLE_STATUSES = [S.D2_IN_PROGRESS];

/**
 * Save verified product information, the preliminary investigation and the
 * priority. Allowed only while D2 is in progress, by users with
 * complaint.d2.edit. Dropdown values are checked against the admin lists.
 * The version guard refuses a save based on stale data.
 */
export async function update(id, { version, verifiedProduct, investigation, priority, sendMailToFrp, assigneeId }, { user, permissions, context }) {
  if (!permissions.has(P.COMPLAINT_D2_EDIT)) throw AppError.forbidden();
  const complaint = await findVisible(id, user, permissions);
  if (!EDITABLE_STATUSES.includes(complaint.status)) {
    throw AppError.conflict(
      complaint.status === S.D1_ACKNOWLEDGED
        ? 'Start D2 before entering D2 information.'
        : 'D2 information is locked once D2 is completed.',
    );
  }
  if (complaint.__v !== version) {
    throw AppError.conflict('Someone else changed this complaint after you opened it. Reload to see their changes, then edit again.');
  }

  const currentInv = complaint.d2?.investigation?.toObject?.() || {};
  if (investigation) await validateSelections(investigation, currentInv);

  const before = { d2: complaint.toObject().d2, priority: complaint.priority };
  if (verifiedProduct) complaint.set('d2.verifiedProduct', verifiedProduct);
  if (investigation) {
    if (investigation.slaHoursD3D4 !== undefined) {
      investigation.slaHoursD3 = investigation.slaHoursD3D4;
      investigation.slaHoursD4 = investigation.slaHoursD3D4;
    }
    const a = Number(investigation?.occurrences?.score);
    const b = Number(investigation?.affectedQuantity?.score);
    const c = Number(investigation?.severity?.score);
    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && investigation.occurrences?.score != null && investigation.affectedQuantity?.score != null && investigation.severity?.score != null) {
      investigation.rpn = a * b * c;
    }
    complaint.set('d2.investigation', investigation);
  }
  if (priority !== undefined) complaint.priority = priority || undefined;
  if (sendMailToFrp !== undefined) complaint.set('d2.sendMailToFrp', Boolean(sendMailToFrp));

  let newlyAssignedUser = null;
  if (assigneeId && String(assigneeId) !== String(complaint.frp)) {
    const candidates = await frpCandidates();
    const assignee = candidates.find((u) => String(u._id) === String(assigneeId));
    if (assignee) {
      const now = new Date();
      await ComplaintAssignment.findOneAndUpdate(
        { complaint: complaint._id, role: 'FRP', active: true },
        { $set: { active: false, endedAt: now, endedBy: user._id } },
      );
      await ComplaintAssignment.create([
        { complaint: complaint._id, role: 'FRP', assignee: assignee._id, assignedBy: user._id, assignedAt: now, reason: 'Assigned during D2 update' }
      ]);
      complaint.frp = assignee._id;
      newlyAssignedUser = assignee;
    }
  }

  complaint.lastActivityAt = new Date();
  await complaint.save();

  // In Salesforce D2 stage:
  // 1. A Salesforce in-app notification is ALWAYS sent to the designated FRP user upon assignment.
  // 2. If "Send Mail to FRP" is selected, an email notification is also sent to the FRP.
  if (newlyAssignedUser) {
    await inApp.createNotification({
      recipient: newlyAssignedUser._id,
      complaint: complaint._id,
      title: 'You Have Been Assigned as First Responsible Person',
      message: `You have been designated as the First Responsible Person (FRP) for complaint ${complaint.complaintNumber}. Kindly review and initiate the required actions.`,
      link: `/complaints/${complaint._id}?tab=D2`,
    });
  }

  // If sendMailToFrp is selected/true, dispatch the Step 8.b FRP assignment email!
  if (Boolean(sendMailToFrp) && complaint.frp) {
    const targetFrp = newlyAssignedUser || (await User.findById(complaint.frp).lean());
    if (targetFrp?.email) {
      await notifications.enqueue({
        type: 'D2_FRP_ASSIGNED',
        complaint: complaint._id,
        recipient: targetFrp.email,
        recipientUser: targetFrp._id,
        dedupeKey: `FRP_ASSIGNED:${complaint._id}:${targetFrp._id}:${Date.now()}`,
        message: d2FrpAssigned(complaint, targetFrp),
      });
      notifications.nudge();

      if (!newlyAssignedUser) {
        await inApp.createNotification({
          recipient: targetFrp._id,
          complaint: complaint._id,
          title: 'You Have Been Assigned as First Responsible Person',
          message: `You have been designated as the First Responsible Person (FRP) for complaint ${complaint.complaintNumber}. Kindly review and initiate the required actions.`,
          link: `/complaints/${complaint._id}?tab=D2`,
        });
      }
    }
  }

  const after = { d2: complaint.toObject().d2, priority: complaint.priority };
  const flat = (o) => ({
    ...Object.fromEntries(Object.entries(o.d2?.verifiedProduct || {}).map(([k, v]) => [`verifiedProduct.${k}`, v])),
    ...Object.fromEntries(Object.entries(o.d2?.investigation || {}).map(([k, v]) => [`investigation.${k}`, v])),
    priority: o.priority,
  });
  const changes = audit.diff(flat(before), flat(after));
  if (Object.keys(changes.after).length || Object.keys(changes.before).length) {
    await audit.record({
      actor: user,
      action: 'complaint.d2.update',
      entityType: 'Complaint',
      entityId: complaint._id,
      complaint: complaint._id,
      summary: 'Edited D2 information',
      ...changes,
      context,
    });
  }
  return getDetail(id, user, permissions);
}

/* ---------------- FRP candidates and assignment ---------------- */

/** Active users whose roles let them do D3 work, i.e. who can act as FRP. */
export async function frpCandidates({ search } = {}) {
  const roles = await Role.find({ permissions: P.COMPLAINT_D3_EDIT }, { key: 1 }).lean();
  const filter = { isActive: true, roles: { $in: roles.map((r) => r.key) } };
  if (search) filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find(filter, { name: 1, email: 1, designation: 1, department: 1 })
    .sort({ name: 1 })
    .limit(100)
    .populate('department', 'name')
    .lean();
  const load = await Complaint.aggregate([
    { $match: { frp: { $in: users.map((u) => u._id) }, status: { $ne: S.CLOSED } } },
    { $group: { _id: '$frp', n: { $sum: 1 } } },
  ]);
  const byId = new Map(load.map((l) => [String(l._id), l.n]));
  return users.map((u) => ({ ...u, openComplaints: byId.get(String(u._id)) || 0 }));
}

const ASSIGNABLE = [S.D2_IN_PROGRESS, S.D2_COMPLETED, S.D3_IN_PROGRESS, S.D3_PENDING_APPROVAL, S.D3_REWORK, S.D3_APPROVED, S.D4_IN_PROGRESS];

/**
 * Assign or reassign the First Responsible Person.
 *
 * One transaction: end the current assignment (kept for history), create the
 * new one, set complaint.frp, queue the assignment email to the new FRP and
 * write the audit entry. If sendMailToFrp is selected, the Step 8.b email is
 * dispatched informing them of their assignment.
 */
export async function assignFrp(id, { assigneeId, reason, sendMail = true, sendMailToFrp }, { user, permissions, context }) {
  if (!permissions.has(P.COMPLAINT_ASSIGN)) throw AppError.forbidden();
  const visible = await findVisible(id, user, permissions, { lean: true });
  if (!ASSIGNABLE.includes(visible.status)) {
    throw AppError.conflict(
      visible.status === S.CLOSED ? 'A closed complaint cannot be reassigned.' : 'Start D2 before assigning the First Responsible Person.',
    );
  }

  const shouldSendMail = sendMailToFrp !== undefined ? Boolean(sendMailToFrp) : Boolean(sendMail);

  const candidates = await frpCandidates();
  const assignee = candidates.find((u) => String(u._id) === String(assigneeId));
  if (!assignee) {
    throw AppError.validation([{ field: 'assigneeId', message: 'Choose an active employee whose role can investigate complaints.' }]);
  }

  const reassigning = Boolean(visible.frp);
  if (reassigning && String(visible.frp) === String(assignee._id)) {
    if (shouldSendMail) {
      const complaintDoc = await Complaint.findById(visible._id);
      complaintDoc.set('d2.sendMailToFrp', true);
      await complaintDoc.save();

      await notifications.enqueue({
        type: 'D2_FRP_ASSIGNED',
        complaint: complaintDoc._id,
        recipient: assignee.email,
        recipientUser: assignee._id,
        dedupeKey: `FRP_ASSIGNED:${complaintDoc._id}:${assignee._id}:${Date.now()}`,
        message: d2FrpAssigned(complaintDoc, assignee),
      });
      notifications.nudge();

      await inApp.createNotification({
        recipient: assignee._id,
        complaint: visible._id,
        title: 'You Have Been Assigned as First Responsible Person',
        message: `You have been designated as the First Responsible Person (FRP) for complaint ${visible.complaintNumber}. Kindly review and initiate the required actions.`,
        link: `/complaints/${visible._id}?tab=D2`,
      });
    }
    return { ...(await getDetail(id, user, permissions)), unchanged: true, mailSent: shouldSendMail };
  }
  const note = reason?.trim();
  if (reassigning && !note) {
    throw AppError.validation([{ field: 'reason', message: 'Give a reason for reassigning the First Responsible Person.' }]);
  }

  let queued = false;
  try {
    await mongoose.connection.transaction(async (session) => {
      queued = false;
      const now = new Date();
      const previous = await ComplaintAssignment.findOneAndUpdate(
        { complaint: visible._id, role: 'FRP', active: true },
        { $set: { active: false, endedAt: now, endedBy: user._id } },
        { session, returnDocument: 'before' },
      );
      const [assignment] = await ComplaintAssignment.create(
        [{ complaint: visible._id, role: 'FRP', assignee: assignee._id, assignedBy: user._id, assignedAt: now, reason: note }],
        { session },
      );
      // Conditional on the FRP we read, so a parallel reassignment cannot be lost.
      const complaint = await Complaint.findOneAndUpdate(
        { _id: visible._id, frp: visible.frp ?? null },
        { $set: { frp: assignee._id, 'd2.sendMailToFrp': shouldSendMail, lastActivityAt: now }, $inc: { __v: 1 } },
        { session, returnDocument: 'after' },
      );
      if (!complaint) throw AppError.conflict('Someone else changed the assignment at the same moment. Reload and try again.');

      if (shouldSendMail) {
        await notifications.enqueue({
          type: 'D2_FRP_ASSIGNED',
          complaint: complaint._id,
          recipient: assignee.email,
          recipientUser: assignee._id,
          dedupeKey: `FRP_ASSIGNED:${assignment._id}`,
          message: d2FrpAssigned(complaint, assignee),
          session,
        });
        queued = true;
      }

      const previousUser = previous ? await User.findById(previous.assignee, { name: 1 }).session(session).lean() : null;
      await audit.record({
        actor: user,
        action: reassigning ? 'complaint.frp.reassign' : 'complaint.frp.assign',
        entityType: 'Complaint',
        entityId: complaint._id,
        complaint: complaint._id,
        summary: reassigning
          ? `Reassigned the FRP from ${previousUser?.name || 'previous FRP'} to ${assignee.name}`
          : `Assigned ${assignee.name} as First Responsible Person`,
        before: { frp: previousUser?.name },
        after: { frp: assignee.name, ...(note ? { remarks: note } : {}) },
        context,
        session,
      });
    });
  } catch (err) {
    if (err?.code === 11000) throw AppError.conflict('Someone else changed the assignment at the same moment. Reload and try again.');
    throw err;
  }
  if (queued) {
    notifications.nudge();
  }
  // Salesforce notification to FRP is always sent upon assignment (SOP Step 8.a)
  await inApp.createNotification({
    recipient: assignee._id,
    complaint: visible._id,
    title: 'You Have Been Assigned as First Responsible Person',
    message: `You have been designated as the First Responsible Person (FRP) for complaint ${visible.complaintNumber}. Kindly review and initiate the required actions.`,
    link: `/complaints/${visible._id}?tab=D2`,
  });
  return getDetail(id, user, permissions);
}

export async function assignmentHistory(id, user, permissions) {
  const complaint = await findVisible(id, user, permissions, { lean: true });
  return ComplaintAssignment.find({ complaint: complaint._id, role: 'FRP' })
    .sort({ assignedAt: -1 })
    .populate('assignee', 'name email designation')
    .populate('assignedBy', 'name')
    .populate('endedBy', 'name')
    .lean();
}

/* ---------------- Complete D2 ---------------- */

/** Resolve D2_COMPLETED_NOTIFY into { email, name, userId } recipients (SOP Step 13: Handler and FRP). */
async function completionRecipients(complaint, completer) {
  const out = new Map();
  // 1. FRP
  if (complaint.frp) {
    const frp = await User.findById(complaint.frp, { name: 1, email: 1 }).lean();
    if (frp?.email) out.set(frp.email.toLowerCase(), { email: frp.email, name: frp.name, userId: frp._id });
  }
  // 2. Complaint Handler (Coordinator)
  if (complaint.coordinator) {
    const handler = await User.findById(complaint.coordinator, { name: 1, email: 1 }).lean();
    if (handler?.email) out.set(handler.email.toLowerCase(), { email: handler.email, name: handler.name, userId: handler._id });
  }
  // 3. Completer or extra env emails
  for (const token of (env.D2_COMPLETED_NOTIFY || '').split(',').map((t) => t.trim()).filter(Boolean)) {
    if (token === 'completer' && completer?.email) {
      out.set(completer.email.toLowerCase(), { email: completer.email, name: completer.name, userId: completer._id });
    } else if (token.includes('@')) {
      out.set(token.toLowerCase(), { email: token.toLowerCase() });
    }
  }
  return [...out.values()];
}

/**
 * Complete D2. The workflow refuses it unless an FRP is assigned and the
 * required D2 fields are filled. In the same transaction: completedBy/At,
 * a stage record with a snapshot of D2, the completion notices and audit.
 */
export async function complete(id, { idempotencyKey, remarks }, { user, permissions, context }) {
  await findVisible(id, user, permissions, { lean: true });
  let queued = false;
  let finishedComplaint = null;
  await mongoose.connection.transaction(async (session) => {
    queued = false;
    const { complaint, replayed } = await workflow.perform(id, 'completeD2', {
      ...who(user, permissions, context),
      idempotencyKey,
      remarks,
      session,
    });
    if (replayed) return;
    finishedComplaint = complaint;
    const now = new Date();
    await Complaint.updateOne({ _id: complaint._id }, { $set: { 'd2.completedBy': user._id, 'd2.completedAt': now } }, { session });
    await ComplaintStageRecord.create(
      [{ complaint: complaint._id, stage: 'D2', kind: 'COMPLETION', actor: user._id, at: now, remarks: remarks?.trim() || undefined, snapshot: { d2: complaint.toObject().d2, frp: complaint.frp, priority: complaint.priority } }],
      { session },
    );
    const frp = await User.findById(complaint.frp, { name: 1, email: 1 }).session(session).lean();
    for (const r of await completionRecipients(complaint, user)) {
      const message = d2Completed(complaint, { recipientName: r.name, frpName: frp?.name });

      await notifications.enqueue({
        type: 'D2_COMPLETED',
        complaint: complaint._id,
        recipient: r.email,
        recipientUser: r.userId,
        dedupeKey: `D2_COMPLETED:${complaint._id}:${r.email}:${Date.now()}`,
        message,
        session,
      });
      queued = true;
    }
  });
  if (queued) notifications.nudge();

  // In-app notifications to FRP and Handler (SOP Step 13)
  if (finishedComplaint?.frp) {
    await inApp.createNotification({
      recipient: finishedComplaint.frp,
      complaint: finishedComplaint._id,
      title: 'D2 Stage Completed',
      message: `D2 stage for complaint ${finishedComplaint.complaintNumber} has been completed.`,
      link: `/complaints/${finishedComplaint._id}?tab=D3`,
    });
  }
  if (finishedComplaint?.coordinator && String(finishedComplaint.coordinator) !== String(finishedComplaint.frp)) {
    await inApp.createNotification({
      recipient: finishedComplaint.coordinator,
      complaint: finishedComplaint._id,
      title: 'D2 Stage Completed',
      message: `D2 stage for complaint ${finishedComplaint.complaintNumber} has been completed.`,
      link: `/complaints/${finishedComplaint._id}?tab=D3`,
    });
  }

  // If FRP has already acknowledged, automatically transition to D3
  try {
    const current = await findVisible(id, user, permissions);
    if (current.status === S.D2_COMPLETED && current.d2?.frpAcknowledgement?.acknowledged) {
      await workflow.perform(id, 'startD3', { actor: user, permissions, context });
    }
  } catch (err) {
    // Stage transition conflict or already started
  }

  return getDetail(id, user, permissions);
}

export async function requestSlaExtension(id, { hours, reason }, { user, permissions, context }) {
  const complaint = await findVisible(id, user, permissions);
  complaint.set('d2.slaExtension', {
    requestedHours: hours,
    reason,
    requestedBy: user._id,
    requestedAt: new Date(),
    status: 'PENDING',
  });
  await complaint.save();

  // Resolve FRP Manager using centralized logic (SOP Page 7, Step 12)
  const frpManager = await getFrpManager(complaint);
  const frp = complaint.frp ? await User.findById(complaint.frp, { name: 1, email: 1 }).lean() : null;

  // Enqueue email notification to the FRP's manager
  let queued = false;
  if (frpManager?.email) {
    await notifications.enqueue({
      type: 'D2_SLA_EXTENSION',
      complaint: complaint._id,
      recipient: frpManager.email,
      recipientUser: frpManager._id,
      dedupeKey: `D2_SLA_EXTENSION:${complaint._id}:${frpManager.email}:${Date.now()}`,
      message: d2SlaExtensionRequest(complaint, {
        managerName: frpManager.name,
        frpName: frp?.name || user.name,
        hours,
        reason,
      }),
    });
    queued = true;
  }
  if (queued) notifications.nudge();

  // Send in-app notification strictly to the FRP's manager (SOP Step 12)
  if (frpManager?._id) {
    await inApp.createNotification({
      recipient: frpManager._id,
      complaint: complaint._id,
      title: 'D2 SLA Extension Request',
      message: `${frp?.name || user.name || 'FRP'} requested ${hours} hours extension for ${complaint.complaintNumber}: ${reason || 'No reason specified'}`,
      link: `/complaints/${complaint._id}?tab=D2`,
    });
  }

  return getDetail(id, user, permissions);
}

export async function frpAcknowledge(id, { comments }, { user, permissions, context }) {
  const complaint = await findVisible(id, user, permissions);
  const isFrp = complaint.frp && (
    String(complaint.frp._id || complaint.frp) === String(user._id) ||
    complaint.frp.email === user.email
  );
  const isAdmin = permissions.has(P.COMPLAINT_CLOSE) || user.roles?.some((r) => ['admin', 'qa_manager'].includes(r));
  if (!isFrp && !isAdmin) {
    throw AppError.forbidden('Only the assigned First Responsible Person (FRP) can submit D2 Acknowledgement.');
  }

  complaint.set('d2.frpAcknowledgement', {
    acknowledged: true,
    comments,
    acknowledgedBy: user._id,
    acknowledgedAt: new Date(),
  });
  await complaint.save();
  try {
    await complete(id, { remarks: comments || 'FRP Acknowledged' }, { user, permissions, context });
  } catch (err) {
    // Stage may already be completed or transitioning
  }
  try {
    const updated = await findVisible(id, user, permissions);
    if (updated.status === S.D2_COMPLETED) {
      await workflow.perform(id, 'startD3', { actor: user, permissions, context });
    }
  } catch (err) {
    // Ignore transition conflict
  }
  return getDetail(id, user, permissions);
}

/**
 * Manually trigger or re-send the Step 8.b assignment email to the assigned FRP.
 */
export async function sendFrpEmail(id, { user, permissions, context }) {
  const complaint = await findVisible(id, user, permissions);
  if (!complaint.frp) {
    throw AppError.badRequest('No First Responsible Person assigned to this complaint yet.');
  }
  const assignee = await User.findById(complaint.frp).lean();
  if (!assignee || !assignee.email) {
    throw AppError.badRequest('Assigned First Responsible Person does not have a valid email address.');
  }

  complaint.set('d2.sendMailToFrp', true);
  complaint.lastActivityAt = new Date();
  await complaint.save();

  await notifications.enqueue({
    type: 'D2_FRP_ASSIGNED',
    complaint: complaint._id,
    recipient: assignee.email,
    recipientUser: assignee._id,
    dedupeKey: `FRP_ASSIGNED:${complaint._id}:${assignee._id}:${Date.now()}`,
    message: d2FrpAssigned(complaint, assignee),
  });
  notifications.nudge();

  await inApp.createNotification({
    recipient: assignee._id,
    complaint: complaint._id,
    title: 'First Responsible Person Assignment Notification',
    message: `You have been notified as First Responsible Person for complaint ${complaint.complaintNumber}.`,
    link: `/complaints/${complaint._id}?tab=D2`,
  });

  return getDetail(id, user, permissions);
}

/**
 * Live preview of the Step 8.b FRP assignment email for the given complaint and candidate FRP.
 */
export async function frpEmailPreview(id, { assigneeId } = {}, { user, permissions }) {
  const complaint = await findVisible(id, user, permissions);
  const targetId = assigneeId || complaint.frp;
  const assignee = targetId ? await User.findById(targetId).lean() : null;
  const msg = d2FrpAssigned(complaint, assignee || { name: 'First Responsible Person' });
  return {
    to: assignee?.email || '',
    assigneeName: assignee?.name || '',
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  };
}
