import { InquirySource, InquiryStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { sendInquiryNotification } from '../../services/email.service';

interface CreateInquiryInput {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
}

interface ListInquiriesOptions {
  page: number;
  limit: number;
  status?: InquiryStatus;
  source?: InquirySource;
  assignedToId?: string;
  search?: string;
}

const inquirySelect = {
  id: true,
  source: true,
  fullName: true,
  email: true,
  phone: true,
  service: true,
  message: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true
    }
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      note: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      }
    }
  }
} satisfies Prisma.InquirySelect;

export type InquiryResponse = Prisma.InquiryGetPayload<{ select: typeof inquirySelect }>;

export const createInquiry = async (
  source: InquirySource,
  payload: CreateInquiryInput
): Promise<InquiryResponse> => {
  const inquiry = await prisma.inquiry.create({
    data: {
      source,
      fullName: payload.name,
      email: payload.email,
      phone: payload.phone?.trim() || null,
      service: payload.service?.trim() || null,
      message: payload.message.trim()
    },
    select: inquirySelect
  });

  await sendInquiryNotification({
    id: inquiry.id,
    source: inquiry.source,
    fullName: inquiry.fullName,
    email: inquiry.email,
    phone: inquiry.phone,
    service: inquiry.service,
    message: inquiry.message,
    status: inquiry.status,
    submittedAt: inquiry.submittedAt,
    assignedToId: null,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt
  });

  return inquiry;
};

export const listInquiries = async (options: ListInquiriesOptions): Promise<{
  items: InquiryResponse[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const where: Prisma.InquiryWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.assignedToId ? { assignedToId: options.assignedToId } : {}),
    ...(options.search
      ? {
          OR: [
            { fullName: { contains: options.search, mode: 'insensitive' } },
            { email: { contains: options.search, mode: 'insensitive' } },
            { service: { contains: options.search, mode: 'insensitive' } },
            { message: { contains: options.search, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip,
      take: options.limit,
      select: inquirySelect
    }),
    prisma.inquiry.count({ where })
  ]);

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1
    }
  };
};

export const getInquiryById = async (id: string): Promise<InquiryResponse> => {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: inquirySelect
  });

  if (!inquiry) {
    throw new AppError(404, 'INQUIRY_NOT_FOUND', 'Inquiry not found');
  }

  return inquiry;
};

export const updateInquiry = async (
  id: string,
  payload: { status?: InquiryStatus; assignedToId?: string | null }
): Promise<InquiryResponse> => {
  await getInquiryById(id);

  if (payload.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: payload.assignedToId },
      select: { id: true, isActive: true }
    });

    if (!assignee || !assignee.isActive) {
      throw new AppError(400, 'INVALID_ASSIGNEE', 'Assigned user is not active or does not exist');
    }
  }

  return prisma.inquiry.update({
    where: { id },
    data: {
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.assignedToId !== undefined ? { assignedToId: payload.assignedToId } : {})
    },
    select: inquirySelect
  });
};

export const addInquiryNote = async (
  inquiryId: string,
  authorId: string,
  note: string
): Promise<InquiryResponse> => {
  await getInquiryById(inquiryId);

  await prisma.inquiryNote.create({
    data: {
      inquiryId,
      authorId,
      note
    }
  });

  return getInquiryById(inquiryId);
};
