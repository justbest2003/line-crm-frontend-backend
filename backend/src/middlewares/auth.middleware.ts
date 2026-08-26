import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types';

/** Verify JWT and attach admin to request */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET || '';
    const payload = jwt.verify(token, secret) as { id: string };

    const admin = await prisma.admin.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!admin) {
      res.status(401).json({ error: 'Admin not found' });
      return;
    }

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
