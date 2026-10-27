import * as notifications from '../services/notificationService.js';
import * as d1 from '../services/d1Service.js';
import { findVisible } from '../services/complaintService.js';
import { ok, pagination, requestContext } from '../utils/http.js';
import { PERMISSIONS as P } from '../auth/permissions.js';
import { AppError } from '../utils/AppError.js';

export async function list(req, res) {
  const q = req.validQuery;
  const { items, meta } = await notifications.list(q, pagination(q));
  return ok(res, items, meta);
}

export async function get(req, res) {
  const n = await notifications.getOne(req.params.id);
  if (!req.permissions.has(P.NOTIFICATIONS_VIEW)) {
    const complaintId = n.complaint?._id || n.complaint;
    if (!complaintId) throw AppError.forbidden();
    await findVisible(complaintId, req.user, req.permissions, { lean: true });
  }
  return ok(res, n);
}

export async function retry(req, res) {
  return ok(res, await notifications.retry(req.params.id, req.user, requestContext(req)));
}

/** Emails for one complaint: anyone who can see the complaint can see these. */
export async function forComplaint(req, res) {
  const complaint = await findVisible(req.params.id, req.user, req.permissions, { lean: true });
  return ok(res, await notifications.forComplaint(complaint._id));
}

export async function acknowledgementPreview(req, res) {
  return ok(res, await d1.acknowledgementPreview(req.params.id, req.user, req.permissions));
}

export async function acknowledge(req, res) {
  const who = { user: req.user, permissions: req.permissions, context: requestContext(req) };
  return ok(res, await d1.acknowledge(req.params.id, req.body, who));
}
