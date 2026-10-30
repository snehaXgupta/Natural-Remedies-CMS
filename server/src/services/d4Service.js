import mongoose from 'mongoose';
import { Complaint, CapaRecord, User, RootCause } from '../models/index.js';
import { STATUSES as S, STAGES } from '../config/workflow.js';
import { AppError } from '../utils/AppError.js';
import { findVisible, getDetail } from './complaintService.js';
import * as inApp from './inAppNotificationService.js';
import * as notifications from './notificationService.js';
import {
  capaImplementationAssignment,
  capaImplementationRejected,
  erpAssignment,
  capaClosedNotice,
  movedToD4Stage,
  complaintSuccessfullyClosed,
} from '../mail/templates.js';
import { generateComplaintPdfBuffer } from './pdfReportService.js';

/**
 * D4 & CAPA Lifecycle Service implementing business rules from the Process Manual:
 * - Multi-tier CAPA implementation approvals (FRP, Handler, QA)
 * - Cost of Poor Quality (COPQ in INR)
 * - Effectiveness Responsible Person (ERP) assignment & review
 * - Final Complaint closure
 */


/**
 * Automatically resolve the Complaint Handler's Manager from database mapping.
 */
export async function getHandlerManager(complaint) {
  if (!complaint?.coordinator) return null;
  const coord = await User.findById(complaint.coordinator)
    .populate('manager', 'name email designation roles isActive')
    .lean();
  if (coord?.manager && coord.manager.isActive) {
    return coord.manager;
  }
  return null;
}

export async function updateCopq(complaintId, { logisticsCost = 0, testingCost = 0, reprocessingCost = 0 }, { user, permissions }) {
  const complaint = await findVisible(complaintId, user, permissions);
  const totalCost = Number(logisticsCost || 0) + Number(testingCost || 0) + Number(reprocessingCost || 0);
  complaint.set('d4.copq', {
    logisticsCost: Number(logisticsCost || 0),
    testingCost: Number(testingCost || 0),
    reprocessingCost: Number(reprocessingCost || 0),
    totalCost,
  });
  complaint.lastActivityAt = new Date();
  await complaint.save();
  return getDetail(complaintId, user, permissions);
}

export async function updateCapaImplementation(capaId, { actionImplemented, forwardForReview }, { user, permissions }) {
  const capa = await CapaRecord.findById(capaId);
  if (!capa) throw AppError.notFound('CAPA record not found.');
  const complaint = await Complaint.findById(capa.complaint);

  capa.actionImplemented = actionImplemented;
  capa.forwardForReview = Boolean(forwardForReview);
  if (forwardForReview) {
    capa.actionStatus = 'IN_PROGRESS';
    const isFrpSameAsRp = complaint.frp && String(complaint.frp) === String(capa.responsiblePerson || user._id);
    const now = new Date();

    if (isFrpSameAsRp) {
      // Case 1: FRP == Responsible Person -> Auto-accepted
      capa.frpImplementationApproval = {
        status: 'APPROVED',
        comments: 'Auto-accepted (FRP is Responsible Person)',
        approver: user._id,
        date: now,
      };
      capa.approvalHistory.push({
        step: 'FRP CAPA Implementation Approval',
        status: 'Approved',
        assignedTo: user.name,
        actualApprover: user.name,
        date: now,
        comments: 'Auto-accepted',
      });
      capa.handlerImplementationApproval = { status: 'PENDING' };

      // Notify Complaint Handler
      const handlers = await User.find({ roles: { $in: ['admin', 'quality_coordinator'] } }, { _id: 1, email: 1, name: 1 }).lean();
      for (const h of handlers) {
        await inApp.createNotification({
          recipient: h._id,
          complaint: complaint._id,
          title: 'CAPA Review Required (Handler)',
          message: `The CAPA implementation has been completed by ${user.name} and requires your review as Complaint Handler for ${capa.capaNumber}.`,
          link: `/complaints/${complaint._id}?tab=D3`,
        });
      }
    } else {
      // Case 2: FRP != Responsible Person -> Manual FRP Approval required
      capa.frpImplementationApproval = { status: 'PENDING' };
      if (complaint.frp) {
        const frp = await User.findById(complaint.frp).lean();
        if (frp) {
          await inApp.createNotification({
            recipient: frp._id,
            complaint: complaint._id,
            title: 'CAPA Review Required - FRP',
            message: `The CAPA implementation has been completed by ${user.name} and requires your review as FRP for ${capa.capaNumber}.`,
            link: `/complaints/${complaint._id}?tab=D3`,
          });
        }
      }
    }
  }

  await capa.save();
  return capa;
}

export async function decideImplementationApproval(capaId, { tier, decision, comments }, { user, permissions }) {
  const capa = await CapaRecord.findById(capaId);
  if (!capa) throw AppError.notFound('CAPA record not found.');
  const complaint = await Complaint.findById(capa.complaint);
  const now = new Date();
  const isApproved = decision === 'APPROVED';

  // Normalize tier name (handle 'FRP_MANAGER' or 'FRP')
  const normalizedTier = tier === 'FRP_MANAGER' ? 'FRP' : tier;

  if (normalizedTier === 'FRP') {
    capa.frpImplementationApproval = { status: isApproved ? 'APPROVED' : 'REJECTED', comments, approver: user._id, date: now };
    capa.approvalHistory.push({
      step: 'FRP CAPA Implementation Approval',
      status: isApproved ? 'Approved' : 'Rejected',
      assignedTo: user.name,
      actualApprover: user.name,
      date: now,
      comments,
    });
    if (isApproved) {
      capa.handlerImplementationApproval = { status: 'PENDING' };
      // Notify Complaint Handlers
      const handlers = await User.find({ roles: { $in: ['admin', 'quality_coordinator'] } }, { _id: 1, email: 1, name: 1 }).lean();
      for (const h of handlers) {
        await inApp.createNotification({
          recipient: h._id,
          complaint: complaint._id,
          title: 'CAPA Review Required (Handler)',
          message: `CAPA implementation for ${capa.capaNumber} was approved by FRP (${user.name}) and requires Handler review.`,
          link: `/complaints/${complaint._id}?tab=D3`,
        });
      }
    }
  } else if (normalizedTier === 'HANDLER') {
    capa.handlerImplementationApproval = { status: isApproved ? 'APPROVED' : 'REJECTED', comments, approver: user._id, date: now };
    capa.approvalHistory.push({
      step: 'Handler CAPA Implementation Approval',
      status: isApproved ? 'Approved' : 'Rejected',
      assignedTo: user.name,
      actualApprover: user.name,
      date: now,
      comments,
    });
    if (isApproved) {
      capa.qaImplementationApproval = { status: 'PENDING' };
      // Notify QA reviewers (including Handler Manager from database mapping)
      const handlerManager = await getHandlerManager(complaint);
      const qas = await User.find({ roles: { $in: ['admin', 'reviewer'] } }, { _id: 1, email: 1, name: 1 }).lean();
      const targetQas = handlerManager && !qas.some((q) => String(q._id) === String(handlerManager._id))
        ? [handlerManager, ...qas]
        : qas;

      for (const q of targetQas) {
        await inApp.createNotification({
          recipient: q._id,
          complaint: complaint._id,
          title: 'CAPA Approval Required (QA / Handler Manager)',
          message: `CAPA implementation for ${capa.capaNumber} was approved by Complaint Handler (${user.name}) and requires QA approval.`,
          link: `/complaints/${complaint._id}?tab=D3`,
        });
      }
    }
  } else if (normalizedTier === 'QA') {
    capa.qaImplementationApproval = { status: isApproved ? 'APPROVED' : 'REJECTED', comments, approver: user._id, date: now };
    capa.approvalHistory.push({
      step: 'QA CAPA Implementation Approval',
      status: isApproved ? 'Approved' : 'Rejected',
      assignedTo: user.name,
      actualApprover: user.name,
      date: now,
      comments,
    });
    if (isApproved) {
      capa.actionStatus = 'COMPLETED';
    }
  }

  // If rejected at ANY tier: reset forwardForReview and notify Responsible Person per SOP Points 28-30
  if (!isApproved) {
    capa.forwardForReview = false;
    capa.actionStatus = 'IN_PROGRESS';

    const rpUser = capa.responsiblePerson ? await User.findById(capa.responsiblePerson).lean() : null;
    if (rpUser) {
      await inApp.createNotification({
        recipient: rpUser._id,
        complaint: complaint._id,
        title: `CAPA Implementation Rejected (${normalizedTier})`,
        message: `Your CAPA implementation for ${capa.capaNumber} was rejected by ${user.name} (${normalizedTier}). Remarks: ${comments || 'No remarks provided'}. Please revise and resubmit.`,
        link: `/complaints/${complaint._id}?tab=D3`,
      });

      if (rpUser.email) {
        await notifications.enqueue({
          type: 'CAPA_IMPLEMENTATION_REJECTED',
          complaint: complaint._id,
          recipient: rpUser.email,
          recipientUser: rpUser._id,
          dedupeKey: `CAPA_IMPL_REJECT:${capa._id}:${normalizedTier}:${Date.now()}`,
          message: capaImplementationRejected(complaint, capa, {
            recipientName: rpUser.name,
            rejectedBy: user.name,
            tier: normalizedTier,
            remarks: comments,
          }),
        });
        notifications.nudge();
      }
    }
  }

  await capa.save();

  // If approved at QA, check if all CAPAs are approved -> Move to D4 Stage
  if (normalizedTier === 'QA' && isApproved) {
    const allCapas = await CapaRecord.find({ complaint: complaint._id, deletedAt: null });
    const allApproved = allCapas.every((c) => c.qaImplementationApproval?.status === 'APPROVED');
    if (complaint.stage !== STAGES.D4 && complaint.stage !== STAGES.CLOSED && allApproved && allCapas.length > 0) {
      complaint.stage = STAGES.D4;
      complaint.status = S.D4_IN_PROGRESS;
      complaint.lastActivityAt = new Date();
      await complaint.save();

      // Dispatch 2 emails for moving to D4 (SOP Point 32):
      // - Complaint Handler: WITH official PDF report attachment
      // - FRP: WITHOUT attachment
      // - Requester: NO email
      const frp = complaint.frp ? await User.findById(complaint.frp).lean() : null;
      const handlers = await User.find({ roles: { $in: ['admin', 'quality_coordinator'] } }).lean();

      const pdfBuf = await generateComplaintPdfBuffer(complaint);
      const attachments = pdfBuf
        ? [{ filename: `customerComplaintReport-${complaint.complaintNumber}.pdf`, content: pdfBuf, contentType: 'application/pdf' }]
        : undefined;

      for (const h of handlers) {
        await notifications.enqueue({
          type: 'D4_NOTICE',
          complaint: complaint._id,
          recipient: h.email,
          recipientUser: h._id,
          attachments,
          dedupeKey: `D4_NOTICE_HANDLER:${complaint._id}:${h.email}`,
          message: movedToD4Stage(complaint, { recipientName: h.name }),
        });
        await inApp.createNotification({
          recipient: h._id,
          complaint: complaint._id,
          title: 'Complaint Moved to D4 Stage',
          message: `Complaint ${complaint.complaintNumber} has completed CAPA Implementation and moved to D4 Stage.`,
          link: `/complaints/${complaint._id}?tab=D4`,
        });
      }

      if (frp) {
        await notifications.enqueue({
          type: 'D4_NOTICE',
          complaint: complaint._id,
          recipient: frp.email,
          recipientUser: frp._id,
          dedupeKey: `D4_NOTICE_FRP:${complaint._id}:${frp.email}`,
          message: movedToD4Stage(complaint, { recipientName: frp.name }),
        });
        await inApp.createNotification({
          recipient: frp._id,
          complaint: complaint._id,
          title: 'CAPA Implementation Completed',
          message: `CAPA Implementation for ${complaint.complaintNumber} is complete. Complaint is now in D4 stage.`,
          link: `/complaints/${complaint._id}?tab=D4`,
        });
      }
      notifications.nudge();
    }
  }

  return capa;
}

export async function assignErp(capaId, { erpId, scheduleType, scheduleTimeline, scheduleFrequency }, { user }) {
  const capa = await CapaRecord.findById(capaId);
  if (!capa) throw AppError.notFound('CAPA record not found.');
  const complaint = await Complaint.findById(capa.complaint);

  capa.erp = erpId;
  capa.scheduleType = scheduleType;
  if (scheduleType === 'Timeline') {
    capa.scheduleTimeline = scheduleTimeline ? new Date(scheduleTimeline) : undefined;
    capa.scheduleFrequency = undefined;
  } else {
    capa.scheduleFrequency = scheduleFrequency;
    capa.scheduleTimeline = undefined;
  }
  await capa.save();

  if (erpId) {
    const erpUser = await User.findById(erpId).lean();
    if (erpUser) {
      await inApp.createNotification({
        recipient: erpUser._id,
        complaint: complaint._id,
        title: 'Effectiveness Review Assigned to You',
        message: `You have been assigned as Effectiveness Responsible Person for CAPA: ${capa.capaNumber} on complaint: ${complaint.complaintNumber}. Please review and action accordingly.`,
        link: `/complaints/${complaint._id}?tab=D4`,
      });

      // SOP Point 36: Send email notification to ERP
      if (erpUser.email) {
        const scheduleDetail = scheduleType === 'Timeline'
          ? (capa.scheduleTimeline ? capa.scheduleTimeline.toISOString().slice(0, 10) : 'Timeline')
          : (capa.scheduleFrequency || 'Frequency');

        await notifications.enqueue({
          type: 'ERP_ASSIGNMENT',
          complaint: complaint._id,
          recipient: erpUser.email,
          recipientUser: erpUser._id,
          dedupeKey: `ERP_ASSIGN:${capa._id}:${erpUser._id}`,
          message: erpAssignment(complaint, capa, {
            erpName: erpUser.name,
            scheduleType,
            scheduleDetail,
          }),
        });
        notifications.nudge();
      }
    }
  }
  return capa;
}

export async function closeCapa(capaId, { effectivenessReview, isClosed }, { user }) {
  const capa = await CapaRecord.findById(capaId);
  if (!capa) throw AppError.notFound('CAPA record not found.');
  const complaint = await Complaint.findById(capa.complaint);

  capa.effectivenessReview = effectivenessReview;
  const wasAlreadyClosed = Boolean(capa.isClosed);
  capa.isClosed = Boolean(isClosed);
  if (isClosed) {
    if (!wasAlreadyClosed) {
      capa.closedAt = new Date();
    }
    capa.actionStatus = 'VERIFIED';
  }
  await capa.save();

  // Notify Complaint Handler only if marking as closed for the first time (SOP Point 37)
  if (isClosed && !wasAlreadyClosed) {
    const handlers = await User.find({ roles: { $in: ['admin', 'quality_coordinator'] } }).lean();
    for (const h of handlers) {
      await inApp.createNotification({
        recipient: h._id,
        complaint: complaint._id,
        title: 'CAPA Process Completed',
        message: `CAPA ${capa.capaNumber} for complaint ${complaint.complaintNumber} has been marked closed by ERP.`,
        link: `/complaints/${complaint._id}?tab=D4`,
      });

      if (h.email) {
        await notifications.enqueue({
          type: 'CAPA_CLOSED',
          complaint: complaint._id,
          recipient: h.email,
          recipientUser: h._id,
          dedupeKey: `CAPA_CLOSED_HANDLER:${capa._id}:${h.email}`,
          message: capaClosedNotice(complaint, capa, {
            recipientName: h.name,
            closedByName: user.name,
            effectivenessReview,
          }),
        });
      }
    }
    notifications.nudge();
  }

  // Check if ALL CAPAs for this complaint are now closed -> Final Complaint Closure (SOP Points 38-39)
  const allCapas = await CapaRecord.find({ complaint: complaint._id, deletedAt: null });
  const allClosed = allCapas.every((c) => c.isClosed);

  if (complaint.status !== S.CLOSED && allClosed && allCapas.length > 0) {
    complaint.stage = STAGES.CLOSED;
    complaint.status = S.CLOSED;
    complaint.closedAt = new Date();
    complaint.set('d4.completedBy', user._id);
    complaint.set('d4.completedAt', new Date());
    await complaint.save();

    // 2 emails:
    // 1. Requester: gets confirmation email WITHOUT report attachment
    if (complaint.requester?.email) {
      await notifications.enqueue({
        type: 'CLOSURE',
        complaint: complaint._id,
        recipient: complaint.requester.email,
        dedupeKey: `CLOSURE_REQUESTER:${complaint._id}`,
        message: complaintSuccessfullyClosed(complaint, { recipientName: complaint.requester.name, isRequester: true }),
      });
    }

    // 2. Complaint Handler: gets closure email WITH official SOP PDF report attachment
    const handlers = await User.find({ roles: { $in: ['admin', 'quality_coordinator'] } }).lean();
    const closurePdfBuf = await generateComplaintPdfBuffer(complaint);
    const closureAttachments = closurePdfBuf
      ? [{ filename: `customerComplaintReport-${complaint.complaintNumber}.pdf`, content: closurePdfBuf, contentType: 'application/pdf' }]
      : undefined;

    for (const h of handlers) {
      await notifications.enqueue({
        type: 'CLOSURE',
        complaint: complaint._id,
        recipient: h.email,
        recipientUser: h._id,
        attachments: closureAttachments,
        dedupeKey: `CLOSURE_HANDLER:${complaint._id}:${h.email}`,
        message: complaintSuccessfullyClosed(complaint, { recipientName: h.name, isRequester: false }),
      });
      await inApp.createNotification({
        recipient: h._id,
        complaint: complaint._id,
        title: 'Complaint Successfully Closed',
        message: `All CAPAs are closed. Complaint ${complaint.complaintNumber} has moved to Closed stage.`,
        link: `/complaints/${complaint._id}?tab=D4`,
      });
    }
    notifications.nudge();
  }

  return capa;
}

export async function startD4(complaintId, { user, permissions }) {
  const complaint = await findVisible(complaintId, user, permissions);
  complaint.stage = STAGES.D4;
  complaint.status = S.D4_IN_PROGRESS;
  complaint.lastActivityAt = new Date();
  await complaint.save();
  return getDetail(complaintId, user, permissions);
}
