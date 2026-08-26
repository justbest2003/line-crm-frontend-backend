import { prisma } from '../lib/prisma';

/** Create a notification */
export async function create(params: {
  customerId?: string;
  adminId?: string | null;
  type: string;
  message: string;
}) {
  return prisma.notification.create({
    data: {
      customerId: params.customerId ?? null,
      adminId: params.adminId ?? null,
      type: params.type,
      message: params.message,
    },
  });
}

/** Get notifications, optionally filtered by admin and read status */
export async function list(params: {
  adminId?: string;
  unread?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { adminId, unread, page = 1, pageSize = 20 } = params;

  const where: any = {};
  if (adminId) {
    where.OR = [{ adminId }, { adminId: null }]; // assigned + broadcast
  }
  if (unread !== undefined) {
    where.isRead = !unread;
  }

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        customer: { select: { id: true, displayName: true, pictureUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/** Mark a notification as read */
export async function markRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/** Count unread notifications for an admin */
export async function countUnread(adminId?: string) {
  const where: any = { isRead: false };
  if (adminId) {
    where.OR = [{ adminId }, { adminId: null }];
  }
  return prisma.notification.count({ where });
}
