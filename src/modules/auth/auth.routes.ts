import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { login, logout, refresh, register } from './auth.controller';

export const authRouter = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Keyed by the attempted email, not the caller's IP: many different emails
  // from one IP are unrestricted, but 5 tries against one email trips the limit.
  keyGenerator: (req) =>
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown',
  message: { error: 'Too many login attempts, please try again later' },
});

authRouter.post('/register', register);
authRouter.post('/login', loginRateLimiter, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
