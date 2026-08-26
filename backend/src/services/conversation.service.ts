import { prisma } from '../lib/prisma';

/** Find the active conversation for a customer, or create one */
export async function findOrCreateActive(customerId: string) {
  let conversation = await prisma.conversation.findFirst({
    where: { customerId, status: 'active' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { customerId, status: 'active', handledBy: 'bot' },
    });
  }

  return conversation;
}

/** Set conversation handled_by to 'human' (admin takeover) */
export async function takeover(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { handledBy: 'human' },
  });
}

/** Set conversation handled_by back to 'bot' (release) */
export async function release(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { handledBy: 'bot' },
  });
}

/** Close a conversation */
export async function close(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'closed', endedAt: new Date() },
  });
}

/** Get the active conversation for a customer */
export async function getActiveByCustomerId(customerId: string) {
  return prisma.conversation.findFirst({
    where: { customerId, status: 'active' },
  });
}
