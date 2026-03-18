import nodemailer from 'nodemailer';
import type { Inquiry } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';

const smtpConfigured = Boolean(env.SMTP_HOST);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    })
  : null;

export const canSendEmail = Boolean(transporter);

export const sendSecurityCodeEmail = async (params: {
  to: string;
  code: string;
  purposeLabel: string;
  expiresInMinutes: number;
}): Promise<boolean> => {
  if (!transporter) return false;

  const subject = `MMK security code (${params.purposeLabel})`;
  const text = [
    `Your MMK security code is: ${params.code}`,
    '',
    `This code expires in ${params.expiresInMinutes} minutes.`,
    'If you did not request this, you can ignore this email.'
  ].join('\n');

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: params.to,
      subject,
      text
    });
    return true;
  } catch (error) {
    logger.error({ err: error, email: params.to }, 'Failed to send security code email');
    return false;
  }
};

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
