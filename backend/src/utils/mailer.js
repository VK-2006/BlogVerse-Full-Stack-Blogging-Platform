const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export function emailDeliveryConfigured() {
  return brevoConfigured();
}

function sender() {
  return {
    email: process.env.BREVO_SENDER_EMAIL,
    name: process.env.BREVO_SENDER_NAME || "BlogVerse"
  };
}

async function sendEmail({ to, toName, subject, text, html }) {
  if (!brevoConfigured()) {
    return { sent: false, reason: "BREVO_NOT_CONFIGURED" };
  }

  const payload = {
    sender: sender(),
    to: [{ email: to, name: toName || undefined }],
    subject,
    textContent: text,
    htmlContent: html
  };

  if (process.env.BREVO_REPLY_TO_EMAIL) {
    payload.replyTo = {
      email: process.env.BREVO_REPLY_TO_EMAIL,
      name: process.env.BREVO_REPLY_TO_NAME || "BlogVerse Support"
    };
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number(process.env.BREVO_TIMEOUT_MS) || 12000)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Brevo email failed: ${body.message || body.code || `HTTP ${response.status}`}`);
  }

  return { sent: true, provider: "brevo", id: body.messageId || null };
}

export async function sendPasswordResetOtp({ to, name, otp, expiresMinutes = 10 }) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  return sendEmail({
    to,
    toName: name,
    subject: "Your BlogVerse password reset code",
    text: `Hello ${name}, your BlogVerse password reset code is ${otp}. It expires in ${expiresMinutes} minutes. Never share this code with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;color:#101828;background:#ffffff">
        <div style="font-size:24px;font-weight:800;color:#6d4aff;margin-bottom:24px">BlogVerse</div>
        <h1 style="font-size:28px;margin:0 0 12px">Password reset code</h1>
        <p style="line-height:1.7;color:#475467">Hello ${safeName}, use this one-time code to continue resetting your BlogVerse password.</p>
        <div style="display:inline-block;margin:18px 0;padding:16px 24px;border-radius:12px;background:#f4f1ff;border:1px solid #ddd6fe;color:#4c1d95;font-size:30px;font-weight:800;letter-spacing:8px">${safeOtp}</div>
        <p style="line-height:1.7;color:#667085">This code expires in ${expiresMinutes} minutes. BlogVerse support will never ask you to share it.</p>
      </div>`
  });
}

export async function sendContactReplyEmail({ to, name, ticketCode, subject, reply }) {
  const safeName = escapeHtml(name);
  const safeTicket = escapeHtml(ticketCode);
  const safeSubject = escapeHtml(subject);
  const safeReply = escapeHtml(reply);

  return sendEmail({
    to,
    toName: name,
    subject: `BlogVerse support reply — ${ticketCode}`,
    text: `Hello ${name}, BlogVerse support replied to your request "${subject}".\n\n${reply}\n\nTicket: ${ticketCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:32px;color:#101828;background:#ffffff">
        <div style="font-size:24px;font-weight:800;color:#6d4aff;margin-bottom:24px">BlogVerse Support</div>
        <p style="color:#475467;line-height:1.7">Hello ${safeName},</p>
        <h1 style="font-size:26px;margin:0 0 12px">We replied to your request</h1>
        <p style="color:#667085;line-height:1.7"><strong>Ticket:</strong> ${safeTicket}<br/><strong>Subject:</strong> ${safeSubject}</p>
        <div style="margin:22px 0;padding:20px;border-radius:14px;background:#f4f1ff;border:1px solid #ddd6fe;color:#1f2937;line-height:1.75;white-space:pre-wrap">${safeReply}</div>
      </div>`
  });
}
