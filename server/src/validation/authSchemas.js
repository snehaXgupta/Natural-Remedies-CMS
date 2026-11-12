import { z } from 'zod';
import { password } from './common.js';

export const loginBody = z.object({
  email: z.email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(128),
  newPassword: password,
});

export const forgotPasswordBody = z.object({
  email: z.email('Enter a valid email address.').max(254),
});

export const resetPasswordBody = z.object({
  token: z.string().min(1, 'Reset token is required.').max(256),
  newPassword: password,
});
