import { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest, DashboardSummary } from '../types';

/** GET /api/dashboard/summary */
export async function summary(_req: AuthRequest, res: Response): Promise<void> {
  try {
    // Count by status
    const statusCounts = await prisma.customer.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: true,
    });

    const byStatus: Record<string, number> = {};
    let totalLeads = 0;
    for (const row of statusCounts) {
      byStatus[row.status] = row._count;
      totalLeads += row._count;
    }

    // New leads today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const newToday = await prisma.customer.count({
      where: {
        isDeleted: false,
        createdAt: { gte: todayStart },
      },
    });

    // Last 7 days chart data
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await prisma.customer.count({
        where: {
          isDeleted: false,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      last7Days.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    const result: DashboardSummary = {
      totalLeads,
      newToday,
      byStatus,
      last7Days,
    };

    res.json(result);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
