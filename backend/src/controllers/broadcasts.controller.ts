import { Response } from 'express';
import { prisma } from '../lib/prisma';
import * as lineService from '../services/line.service';
import type { AuthRequest } from '../types';

/** GET /api/broadcasts */
export async function list(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = 10;

    const [data, total] = await Promise.all([
      prisma.broadcast.findMany({
        include: {
          targetTag: true,
          sentBy: { select: { id: true, name: true } },
          _count: { select: { broadcastLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.broadcast.count(),
    ]);

    res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('List broadcasts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/** POST /api/broadcasts — create and send broadcast */
export async function create(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, content, targetTagId } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'title and content are required' });
      return;
    }

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        title,
        content,
        targetTagId: targetTagId || null,
        sentById: req.admin!.id,
      },
    });

    // Find target customers
    const where: any = { isDeleted: false };
    if (targetTagId) {
      where.customerTags = { some: { tagId: targetTagId } };
    }

    const customers = await prisma.customer.findMany({
      where,
      select: { id: true, lineUserId: true },
    });

    // Send to each customer and log results
    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      try {
        await lineService.pushMessage(customer.lineUserId, content);
        await prisma.broadcastLog.create({
          data: {
            broadcastId: broadcast.id,
            customerId: customer.id,
            status: 'sent',
          },
        });
        sentCount++;
      } catch {
        await prisma.broadcastLog.create({
          data: {
            broadcastId: broadcast.id,
            customerId: customer.id,
            status: 'failed',
          },
        });
        failedCount++;
      }
    }

    res.status(201).json({
      broadcast,
      summary: { total: customers.length, sent: sentCount, failed: failedCount },
    });
  } catch (err) {
    console.error('Create broadcast error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
