import { prisma } from '../lib/prisma';

/** Save a new message */
export async function save(params: {
  conversationId: string;
  senderType: 'customer' | 'bot' | 'admin';
  content: string;
  senderId?: string;
  messageType?: string;
  lineMessageId?: string;
}) {
  return prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderType: params.senderType,
      content: params.content,
      senderId: params.senderId ?? null,
      messageType: params.messageType ?? 'text',
      lineMessageId: params.lineMessageId ?? null,
    },
  });
}

/** Get message history for a conversation (ordered by time) */
export async function getHistory(conversationId: string, limit = 50) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

/** Get all messages for a customer across all conversations */
export async function getByCustomerId(customerId: string, page = 1, pageSize = 50) {
  const conversations = await prisma.conversation.findMany({
    where: { customerId },
    select: { id: true },
  });

  const conversationIds = conversations.map((c) => c.id);

  const [data, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: { in: conversationIds } },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.message.count({
      where: { conversationId: { in: conversationIds } },
    }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Format recent messages as a text string for Gemini context.
 * Returns the last N messages formatted as "role: content" lines.
 */
export async function formatHistoryForAI(conversationId: string, limit = 10): Promise<string> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { senderType: true, content: true },
  });

  return messages
    .map((m) => {
      const role = m.senderType === 'customer' ? 'ลูกค้า' : 'แอดมิน';
      return `${role}: ${m.content}`;
    })
    .join('\n');
}
