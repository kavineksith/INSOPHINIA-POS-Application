import nodemailer from 'nodemailer';
import db from '@/lib/db';
import { generateBillHtml, BillTemplateData, ShopData } from '@/lib/billTemplate';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  const settingsRaw = await db.setting.findMany({
    where: { key: { startsWith: 'email_' } }
  });
  const settings: Record<string, string> = {};
  settingsRaw.forEach(s => settings[s.key] = s.value || '');

  const host = settings.email_host || process.env.EMAIL_HOST || '';
  const port = parseInt(settings.email_port || process.env.EMAIL_PORT || '587', 10);
  const user = settings.email_username || process.env.EMAIL_USERNAME || '';
  const pass = settings.email_password || process.env.EMAIL_PASSWORD || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const settingsRaw = await db.setting.findMany({ where: { key: { in: ['email_enabled', 'email_from'] } } });
  const settings: Record<string, string> = {};
  settingsRaw.forEach(s => settings[s.key] = s.value || '');

  // Determine if email is enabled: Environment variable acts as a master switch
  let isEnabled = false;
  if (process.env.EMAIL_ENABLED === 'true') {
    isEnabled = true;
  } else if (process.env.EMAIL_ENABLED === 'false') {
    isEnabled = false;
  } else {
    // Fallback to database settings if environment variable is not explicitly true/false
    isEnabled = settings.email_enabled === '1' || settings.email_enabled === 'true';
  }

  if (!isEnabled) {
    const reason = process.env.EMAIL_ENABLED === 'false' ? 'disabled by environment variable' : 'disabled in settings';
    console.log(`Email sending ${reason}. Would have sent:`, params.subject);
    return false;
  }

  try {
    const transport = await getTransporter();
    await transport.sendMail({
      from: settings.email_from || process.env.EMAIL_FROM || 'noreply@luckybookshop.com',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export function generateBillEmailHtml(bill: BillTemplateData, shop: ShopData): string {
  return generateBillHtml(bill, shop);
}
