import mongoose from 'mongoose';
import { Complaint, ComplaintStageRecord, User } from '../models/index.js';
import { PERMISSIONS as P } from '../auth/permissions.js';
import { AppError } from '../utils/AppError.js';
import { d1Acknowledgement, d1CompletionHandler } from '../mail/templates.js';
import { findVisible, getDetail } from './complaintService.js';
import * as workflow from './workflowService.js';
import * as notifications from './notificationService.js';
import * as audit from './auditService.js';

const SNAPSHOT_FIELDS =
  'complaintNumber complaintDate origin requester sbu country headQuarter shortDescription additionalRemarks category customer reportedProduct coordinator';

/** What the requester and coordinator will receive; shown in the confirmation dialog. */
export async function acknowledgementPreview(id, user, permissions) {
  const complaint = await findVisible(id, user, permissions, { lean: true });
  if (!permissions.has(P.COMPLAINT_D1_ACKNOWLEDGE)) throw AppError.forbidden();
  let coordinator = null;
  if (complaint.coordinator) {
    coordinator = await User.findById(complaint.coordinator).select('name email').lean();
  }
  const requesterEmail = d1Acknowledgement(complaint, { recipientName: complaint.requester?.name });
  const handlerEmail = d1CompletionHandler(complaint, { handlerName: coordinator?.name });
  return {
    to: complaint.requester?.email || null,
    coordinatorTo: coordinator?.email || null,
    coordinatorName: coordinator?.name || null,
    coordinatorId: coordinator?._id ? String(coordinator._id) : null,
    subject: requesterEmail.subject,
    text: requesterEmail.text,
    handlerSubject: handlerEmail.subject,
    handlerText: handlerEmail.text,
  };
}

/**
 * Approve D1 acknowledgement.
 *
 * In one transaction:
 *   - status D1_ACK_PENDING → D1_ACKNOWLEDGED (checked by the workflow service:
 *     permission, current status, requester email present)
 *   - acknowledgement.approvedBy / approvedAt / remarks
 *   - manually selected coordinator saved to complaint (if provided)
 *   - a stage record with a snapshot of the D1 data that was acknowledged
 *   - the acknowledgement email queued for requester and coordinator
 *   - an audit entry
 */
export async function acknowledge(id, { remarks, coordinator: coordinatorId, idempotencyKey }, { user, permissions, context }) {
  await findVisible(id, user, permissions, { lean: true });
  let queued = null;

  await mongoose.connection.transaction(async (session) => {
    queued = null;
    const { complaint, replayed } = await workflow.perform(id, 'acknowledge', {
      actor: user,
      permissions,
      remarks,
      idempotencyKey,
      context,
      session,
    });
    if (replayed) return;

    const now = new Date();
    const note = remarks?.trim() || undefined;
    const updateDoc = {
      acknowledgement: { approvedBy: user._id, approvedAt: now, remarks: note },
    };
    const effectiveCoordinator = coordinatorId !== undefined ? (coordinatorId || null) : complaint.coordinator;
    if (effectiveCoordinator !== undefined) {
      updateDoc.coordinator = effectiveCoordinator;
    }

    await Complaint.updateOne(
      { _id: complaint._id },
      { $set: updateDoc },
      { session },
    );

    // Automatically advance to D2_IN_PROGRESS so complaint immediately moves to D2
    try {
      await workflow.perform(id, 'startD2', {
        actor: user,
        permissions,
        context,
        session,
      });
    } catch {
      // Continue if startD2 transition is already completed or replayed
    }

    const snapshot = await Complaint.findById(complaint._id).select(SNAPSHOT_FIELDS).session(session).lean();
    await ComplaintStageRecord.create(
      [{ complaint: complaint._id, stage: 'D1', kind: 'ACKNOWLEDGEMENT', actor: user._id, at: now, remarks: note, snapshot }],
      { session },
    );

    // 1. Acknowledgement email to requester / originator (SOP Page 5, Step 6.b)
    const requesterEmail = d1Acknowledgement(complaint, { recipientName: complaint.requester?.name });
    const { notification, created } = await notifications.enqueue({
      type: 'D1_ACKNOWLEDGEMENT',
      complaint: complaint._id,
      recipient: complaint.requester.email,
      dedupeKey: `D1_ACK:${complaint._id}`,
      message: requesterEmail,
      session,
    });
    queued = created ? notification : null;

    // 2. D1 completion notification email to Complaint Handler (SOP Page 5, Step 6.a)
    if (effectiveCoordinator) {
      const coordUser = await User.findById(effectiveCoordinator).session(session).lean();
      if (coordUser?.email && coordUser.email.toLowerCase() !== complaint.requester?.email?.toLowerCase()) {
        const handlerEmail = d1CompletionHandler(complaint, { handlerName: coordUser.name });
        await notifications.enqueue({
          type: 'D1_COMPLETION_HANDLER',
          complaint: complaint._id,
          recipient: coordUser.email,
          recipientUser: coordUser._id,
          dedupeKey: `D1_COMPLETION_HANDLER:${complaint._id}`,
          message: handlerEmail,
          session,
        });
      }
    }

    // WhatsApp complaints also get a short status message on WhatsApp.
    // Outside WhatsApp's 24-hour reply window Meta requires an approved
    // template; see docs/WHATSAPP.md.
    const waId = complaint.origin === 'WhatsApp' && complaint.requester?.mobile?.replace(/\D/g, '');
    if (waId) {
      await notifications.enqueue({
        type: 'WHATSAPP_STATUS_UPDATE',
        channel: 'whatsapp',
        complaint: complaint._id,
        recipient: waId,
        dedupeKey: `WA_ACK:${complaint._id}`,
        message: {
          subject: `Complaint ${complaint.complaintNumber} acknowledged`,
          text: `Update on complaint *${complaint.complaintNumber}*: our team has acknowledged it and started reviewing it. We have sent the details to ${complaint.requester.email}.`,
        },
        session,
      });
    }

    await audit.record({
      actor: user,
      action: 'complaint.d1.acknowledge',
      entityType: 'Complaint',
      entityId: complaint._id,
      complaint: complaint._id,
      summary: created
        ? `Approved acknowledgement; email queued to ${complaint.requester.email}`
        : 'Approved acknowledgement; acknowledgement email had already been queued',
      after: { remarks: note },
      context,
      session,
    });
  });

  if (queued) notifications.nudge();
  return getDetail(id, user, permissions);
}
