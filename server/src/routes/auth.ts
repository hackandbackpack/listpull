import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { getDatabase } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

// POST /api/auth/login - Rate limited to prevent brute force
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const db = getDatabase();
    const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();

    if (!user) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // This endpoint exists for API consistency and future session invalidation
  res.json({ success: true });
});

// GET /api/auth/session
router.get('/session', requireAuth, (req: AuthRequest, res) => {
  res.json({
    user: req.user,
  });
});

export default router;
