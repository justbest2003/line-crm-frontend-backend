import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

/** Find customer by LINE user ID, or create a new one with profile data */
export async function findOrCreateByLineUserId(
  lineUserId: string,
  profile?: { displayName?: string; pictureUrl?: string },
) {
  let customer = await prisma.customer.findUnique({
    where: { lineUserId },
    include: { customerTags: { include: { tag: true } } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        lineUserId,
        displayName: profile?.displayName ?? null,
        pictureUrl: profile?.pictureUrl ?? null,
        status: 'new_lead',
      },
      include: { customerTags: { include: { tag: true } } },
    });
  }

  return customer;
}

/** Update last_message_at timestamp */
export async function updateLastMessageAt(customerId: string) {
  return prisma.customer.update({
    where: { id: customerId },
    data: { lastMessageAt: new Date() },
  });
}

/** Get single customer by ID with tags and assigned admin */
export async function getById(customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, isDeleted: false },
    include: {
      customerTags: { include: { tag: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

/** List customers with filters, search, and pagination */
export async function list(params: {
  status?: string;
  tagName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, tagName, search, page = 1, pageSize = 10 } = params;

  const where: Prisma.CustomerWhereInput = { isDeleted: false };

  if (status) where.status = status;
  if (tagName) {
    where.customerTags = { some: { tag: { name: tagName } } };
  }
  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        customerTags: { include: { tag: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/** Update customer fields */
export async function update(
  customerId: string,
  data: Prisma.CustomerUpdateInput,
) {
  return prisma.customer.update({
    where: { id: customerId },
    data,
    include: {
      customerTags: { include: { tag: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });
}

/** Soft-delete a customer */
export async function softDelete(customerId: string) {
  return prisma.customer.update({
    where: { id: customerId },
    data: { isDeleted: true },
  });
}

/** Add a tag to a customer */
export async function addTag(customerId: string, tagId: string) {
  return prisma.customerTag.create({
    data: { customerId, tagId },
    include: { tag: true },
  });
}

/** Remove a tag from a customer */
export async function removeTag(customerId: string, tagId: string) {
  return prisma.customerTag.delete({
    where: { customerId_tagId: { customerId, tagId } },
  });
}
