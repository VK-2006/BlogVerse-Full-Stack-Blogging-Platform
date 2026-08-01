import nodemailer from "nodemailer";


function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
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

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your BlogVerse password",
    text: `Hello ${name}, reset your password using this link: ${resetUrl}. This link expires in 30 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;color:#101828">
        <div style="font-size:24px;font-weight:800;color:#6d4aff;margin-bottom:24px">BlogVerse</div>
        <h1 style="font-size:28px;margin:0 0 12px">Reset your password</h1>
        <p style="line-height:1.7;color:#475467">Hello ${name}, we received a request to reset your BlogVerse password.</p>
        <a href="${resetUrl}" style="display:inline-block;margin:18px 0;padding:14px 22px;border-radius:12px;background:#6d4aff;color:white;text-decoration:none;font-weight:700">Reset password</a>
        <p style="line-height:1.7;color:#667085">This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>
      </div>
    `
  });

  return { sent: true };
}

export async function sendContactReplyEmail({ to, name, ticketCode, subject, reply }) {
  const safeName = escapeHtml(name);
  const safeTicket = escapeHtml(ticketCode);
  const safeSubject = escapeHtml(subject);
  const safeReply = escapeHtml(reply);
  const transporter = createTransporter();
  if (!transporter) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
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

  return { sent: true };
}
