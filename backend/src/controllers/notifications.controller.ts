import { Response } from 'express';
import * as notificationService from '../services/notification.service';
import type { AuthRequest } from '../types';

/** GET /api/notifications */
export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const unread = req.query.unread === 'true';
    const page = req.query.page ? parseInt(String(req.query.page)) : 1;

    const result = await notificationService.list({
      adminId: req.admin!.id,
      unread: unread || undefined,
      page,
    });
    res.json(result);
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const notification = await notificationService.markRead(String(req.params.id));
    res.json(notification);
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** GET /api/notifications/unread-count */
export async function unreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const count = await notificationService.countUnread(req.admin!.id);
    res.json({ count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
