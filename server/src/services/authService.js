import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { permissionsFor } from './roleService.js';
import * as audit from './auditService.js';
import { mailer } from '../mail/mailer.js';
import { passwordResetEmail } from '../mail/templates.js';
import logger from '../config/logger.js';

// With HTTPS the __Host- prefix makes browsers refuse the cookie unless it is
// Secure, host-only and path=/, so a subdomain cannot overwrite the session.
export const SESSION_COOKIE = env.COOKIE_SECURE ? '__Host-sfa_session' : 'sfa_session';

// Compared against when the email is unknown, so response time does not
// reveal which emails have accounts. bcrypt hash of a random string.
const DUMMY_HASH = '$2b$12$Nve71FonH3HhfhLMNNME8O5AkT275MECjegUAm0lT3u5X43jEa9aG';

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
}

export function issueSessionToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
    issuer: 'sfa-cms',
  });
}

/**
 * Resolve a session token to an active user with permissions, or throw 401.
 * The token version check means a password change, deactivation or
 * "sign out everywhere" ends existing sessions immediately.
 */
export async function resolveSession(token) {
  if (!token) throw AppError.unauthenticated();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'sfa-cms' });
  } catch {
    throw AppError.unauthenticated('Your session has ended. Sign in again.');
  }
  const user = await User.findById(payload.sub).select('+tokenVersion').populate('department', 'name code');
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    throw AppError.unauthenticated('Your session has ended. Sign in again.');
  }
  const permissions = await permissionsFor(user.roles);
  return { user, permissions };
}

export async function login({ email, password }, context) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +failedLoginAttempts +lockUntil +tokenVersion',
  );

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw AppError.unauthenticated('Email or password is incorrect.');
  }

  if (user.isLocked()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw AppError.locked(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or ask an administrator to reset your password.`);
  }

  const valid = await user.verifyPassword(password);

  if (!valid || !user.isActive) {
    if (valid && !user.isActive) {
      // Correct password on a deactivated account: say so plainly.
      throw AppError.forbidden('This account is deactivated. Contact an administrator.');
    }
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    let lockedNow = false;
    if (user.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + env.LOGIN_LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
      lockedNow = true;
    }
    await user.save();
    await audit.record({
      actor: user,
      action: lockedNow ? 'auth.lockout' : 'auth.login.failed',
      entityType: 'User',
      entityId: user._id,
      context,
    });
    throw AppError.unauthenticated('Email or password is incorrect.');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  await audit.record({ actor: user, action: 'auth.login', entityType: 'User', entityId: user._id, context });
  await user.populate('department', 'name code');

  const permissions = await permissionsFor(user.roles);
  return { user, permissions, token: issueSessionToken(user) };
}

export async function changePassword(userId, { currentPassword, newPassword }, context) {
  const user = await User.findById(userId).select('+passwordHash +tokenVersion');
  if (!user) throw AppError.unauthenticated();
  if (!(await user.verifyPassword(currentPassword))) {
    throw AppError.validation([{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
  }
  if (await user.verifyPassword(newPassword)) {
    throw AppError.validation([{ field: 'newPassword', message: 'Choose a password different from the current one.' }]);
  }
  await user.setPassword(newPassword);
  user.mustChangePassword = false;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion += 1; // signs out other sessions
  await user.save();
  await audit.record({ actor: user, action: 'auth.password.change', entityType: 'User', entityId: user._id, context });
  return { user, token: issueSessionToken(user) };
}

/**
 * Request password reset link sent to user email.
 * Always resolves without revealing whether the email exists.
 */
export async function requestPasswordReset(email, context) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  const user = await User.findOne({ email: normalizedEmail, isActive: true });
  if (!user) {
    // Timing mitigation: perform a dummy sha256 calculation
    crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
    return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  // Generate 32-byte secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await user.save();

  const resetUrl = `${env.APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
  const template = passwordResetEmail({ user, resetUrl });

  try {
    await mailer().send({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (err) {
    logger.error({ err, userId: user._id, email: user.email }, 'Failed to send password reset email');
  }

  await audit.record({
    actor: user,
    action: 'auth.password.reset_requested',
    entityType: 'User',
    entityId: user._id,
    context,
  });

  return { success: true, message: 'If an account exists with this email, a password reset link has been sent.' };
}

/**
 * Reset password using token received via email.
 */
export async function resetPassword({ token, newPassword }, context) {
  if (!token) {
    throw AppError.badRequest('Password reset token is required.');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
    isActive: true,
  }).select('+passwordResetToken +passwordResetExpires +passwordHash +tokenVersion');

  if (!user) {
    throw AppError.badRequest('Password reset link is invalid or has expired. Please request a new one.');
  }

  await user.setPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.mustChangePassword = false;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
  await user.save();

  await audit.record({
    actor: user,
    action: 'auth.password.reset_completed',
    entityType: 'User',
    entityId: user._id,
    context,
  });

  return { success: true, message: 'Your password has been successfully reset. You can now sign in with your new password.' };
}

export async function signOutEverywhere(user, context) {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  await audit.record({ actor: user, action: 'auth.logout.all', entityType: 'User', entityId: user._id, context });
}

export function sessionPayload(user, permissions) {
  return {
    user: user.toJSON(),
    permissions,
  };
}
