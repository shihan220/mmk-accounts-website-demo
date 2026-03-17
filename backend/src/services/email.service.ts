import nodemailer from 'nodemailer';
import type { Inquiry } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';

const shouldEnableEmail = Boolean(env.SMTP_HOST && env.NOTIFICATION_TO);

const transporter = shouldEnableEmail
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    })
  : null;

export const sendInquiryNotification = async (inquiry: Inquiry): Promise<void> => {
  if (!transporter || !env.NOTIFICATION_TO) return;

  const subject = `[MMK Website] New ${inquiry.source.toLowerCase()} inquiry from ${inquiry.fullName}`;

  const text = [
    `Inquiry ID: ${inquiry.id}`,
    `Source: ${inquiry.source}`,
    `Name: ${inquiry.fullName}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone ?? 'N/A'}`,
    `Service: ${inquiry.service ?? 'N/A'}`,
    '',
    'Message:',
    inquiry.message
  ].join('\n');

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: env.NOTIFICATION_TO,
      subject,
      text
    });
  } catch (error) {
    logger.error({ err: error, inquiryId: inquiry.id }, 'Failed to send inquiry notification email');
  }
};
