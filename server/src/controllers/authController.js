import * as authService from '../services/authService.js';
import { ok } from '../utils/http.js';
import { requestContext } from '../utils/http.js';
import { isOriginAllowed } from '../middleware/originCheck.js';

const { SESSION_COOKIE, sessionCookieOptions } = authService;

export async function login(req, res) {
  const { user, permissions, token } = await authService.login(req.body, requestContext(req));
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  return ok(res, authService.sessionPayload(user, permissions));
}

export async function me(req, res) {
  return ok(res, authService.sessionPayload(req.user, [...req.permissions].sort()));
}

export async function logout(_req, res) {
  const { maxAge, ...opts } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
  return res.status(204).end();
}

export async function logoutAll(req, res) {
  await authService.signOutEverywhere(req.user, requestContext(req));
  const { maxAge, ...opts } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
  return res.status(204).end();
}

export async function changePassword(req, res) {
  const { user, token } = await authService.changePassword(req.user._id, req.body, requestContext(req));
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  await user.populate('department', 'name code');
  return ok(res, authService.sessionPayload(user, [...req.permissions].sort()));
}

export async function forgotPassword(req, res) {
  let origin = null;
  const originHeader = req.get('origin');
  if (originHeader && isOriginAllowed(originHeader)) {
    origin = originHeader;
  } else if (req.get('referer')) {
    try {
      const refOrigin = new URL(req.get('referer')).origin;
      if (isOriginAllowed(refOrigin)) origin = refOrigin;
    } catch {}
  } else if (req.get('x-forwarded-host')) {
    const proto = req.get('x-forwarded-proto') || 'https';
    const candidate = `${proto}://${req.get('x-forwarded-host')}`;
    if (isOriginAllowed(candidate)) origin = candidate;
  }

  const result = await authService.requestPasswordReset(req.body.email, {
    ...requestContext(req),
    origin,
  });
  return ok(res, result);
}

export async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body, requestContext(req));
  return ok(res, result);
}
