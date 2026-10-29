import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (origin === env.CLIENT_ORIGIN) return true;
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    // Local development
    if (host === 'localhost' || host === '127.0.0.1') return true;
    // Allow ngrok tunnels (all domains and subdomains)
    if (
      host.endsWith('.ngrok-free.app') ||
      host.endsWith('.ngrok-free.dev') ||
      host.endsWith('.ngrok.io') ||
      host.endsWith('.ngrok.app')
    ) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * CSRF defence for cookie sessions. SameSite=Lax already blocks most
 * cross-site POSTs; this also rejects state-changing requests whose Origin
 * (or Referer) is not the web app or an authorized development tunnel.
 */
export function originCheck(req, _res, next) {
  if (SAFE.has(req.method)) return next();
  let origin = req.get('origin') || null;
  if (!origin && req.get('referer')) {
    try {
      origin = new URL(req.get('referer')).origin;
    } catch {
      return next(AppError.forbidden('Request origin not allowed.'));
    }
  }
  if (!origin || isOriginAllowed(origin)) return next();
  return next(AppError.forbidden('Request origin not allowed.'));
}
