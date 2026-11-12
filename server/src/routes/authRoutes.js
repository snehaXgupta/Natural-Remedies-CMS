import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimits.js';
import { loginBody, changePasswordBody, forgotPasswordBody, resetPasswordBody } from '../validation/authSchemas.js';

const r = Router();

r.post('/login', loginLimiter, validate({ body: loginBody }), c.login);
r.post('/logout', c.logout);
// The routes below work even while a password change is pending.
r.get('/me', authenticate, c.me);
r.post('/logout-all', authenticate, c.logoutAll);
r.post('/change-password', authenticate, validate({ body: changePasswordBody }), c.changePassword);

r.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordBody }), c.forgotPassword);
r.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordBody }), c.resetPassword);

export default r;
