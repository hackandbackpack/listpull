import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDatabase } from '../db/index.js';
import { users, UserRole } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Verify user still exists
    const db = getDatabase();
    const user = db.select().from(users).where(eq(users.id, payload.userId)).get();

    if (!user) {
      return next(createError('User not found', 401, 'USER_NOT_FOUND'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    return next(createError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole('staff', 'admin')(req, res, next);
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole('admin')(req, res, next);
}
