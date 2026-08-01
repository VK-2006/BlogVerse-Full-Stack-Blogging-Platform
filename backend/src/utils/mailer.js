import nodemailer from "nodemailer";

const RESEND_API_URL = "https://api.resend.com/emails";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export function emailDeliveryConfigured() {
  return resendConfigured() || smtpConfigured();
}

function getFromAddress() {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (resendConfigured()) return "BlogVerse <onboarding@resend.dev>";
  return process.env.SMTP_USER;
}

function createTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 8000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 8000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 12000
  });
}

async function sendWithResend({ to, subject, text, html }) {
  const timeoutMs = Number(process.env.RESEND_TIMEOUT_MS) || 10000;
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "BlogVerse/1.0"
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject,
      text,
      html
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseBody?.message || responseBody?.error || `HTTP ${response.status}`;
    throw new Error(`Resend email failed: ${message}`);
  }

  return {
    sent: true,
    provider: "resend",
    id: responseBody?.id || null
  };
}

async function sendWithSmtp({ to, subject, text, html }) {
  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };

  const info = await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html
  });

  return {
    sent: true,
    provider: "smtp",
    id: info?.messageId || null
  };
}

async function sendEmail(message) {
  if (resendConfigured()) return sendWithResend(message);
  if (smtpConfigured()) return sendWithSmtp(message);
  return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  return sendEmail({
    to,
    subject: "Reset your BlogVerse password",
    text: `Hello ${name}, reset your BlogVerse password using this link: ${resetUrl}. This link expires in 30 minutes. If you did not request this reset, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;color:#101828;background:#ffffff">
        <div style="font-size:24px;font-weight:800;color:#6d4aff;margin-bottom:24px">BlogVerse</div>
        <h1 style="font-size:28px;margin:0 0 12px">Reset your password</h1>
        <p style="line-height:1.7;color:#475467">Hello ${safeName}, we received a request to reset your BlogVerse password.</p>
        <a href="${safeResetUrl}" style="display:inline-block;margin:18px 0;padding:14px 22px;border-radius:12px;background:#6d4aff;color:#ffffff;text-decoration:none;font-weight:700">Reset password</a>
        <p style="line-height:1.7;color:#667085">This secure link expires in 30 minutes and can be used only once.</p>
        <p style="line-height:1.7;color:#667085">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `
  });
}

export async function sendContactReplyEmail({ to, name, ticketCode, subject, reply }) {
  const safeName = escapeHtml(name);
  const safeTicket = escapeHtml(ticketCode);
  const safeSubject = escapeHtml(subject);
  const safeReply = escapeHtml(reply);

  return sendEmail({
    to,
    subject: `BlogVerse support reply — ${ticketCode}`,
    text: `Hello ${name}, BlogVerse support replied to your request “${subject}”.\n\n${reply}\n\nTicket: ${ticketCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:32px;color:#101828;background:#ffffff">
        <div style="font-size:24px;font-weight:800;color:#6d4aff;margin-bottom:24px">BlogVerse Support</div>
        <p style="color:#475467;line-height:1.7">Hello ${safeName},</p>
        <h1 style="font-size:26px;margin:0 0 12px">We replied to your request</h1>
        <p style="color:#667085;line-height:1.7"><strong>Ticket:</strong> ${safeTicket}<br/><strong>Subject:</strong> ${safeSubject}</p>
        <div style="margin:22px 0;padding:20px;border-radius:14px;background:#f4f1ff;border:1px solid #ddd6fe;color:#1f2937;line-height:1.75;white-space:pre-wrap">${safeReply}</div>
        <p style="color:#667085;line-height:1.7">You can also sign in to BlogVerse and open the Contact page to review your support history.</p>
      </div>
    `
  });
}
