import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

export interface SendSelfEmailInput {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Buffer; contentType: string };
}

/**
 * Sends to exactly the address passed in -- callers must pass the
 * authenticated user's own account email. There is no recipient override
 * anywhere in this module on purpose: nothing in this backend can email a
 * third party.
 */
export async function sendSelfEmail(input: SendSelfEmailInput) {
  const t = getTransporter();
  if (!t) {
    return { sent: false, reason: 'SMTP is not configured on this server (set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM).' };
  }
  await t.sendMail({
    from: env.smtp.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: input.attachment ? [input.attachment] : undefined,
  });
  return { sent: true as const };
}
