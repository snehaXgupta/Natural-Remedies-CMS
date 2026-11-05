import { resolveSession, SESSION_COOKIE } from '../services/authService.js';

/** Require a valid session; attaches req.user and req.permissions. */
export async function authenticate(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query?.token;
  const { user, permissions } = await resolveSession(token);
  req.user = user;
  req.permissions = new Set(permissions);
  next();
}
