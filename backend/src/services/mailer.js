const nodemailer = require('nodemailer');

function getTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'no-reply@buildwise.local';
  const transport = getTransport();
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log('[MAIL:FALLBACK]', { to, subject, text, html: html ? '[html]' : '' });
    return { ok: false, reason: 'SMTP not configured (logged to console instead)' };
  }
  await transport.sendMail({ from, to, subject, text, html });
  return { ok: true };
}

async function sendInviteEmail({ to, homeName, registerUrl, role }) {
  const subject = `You're invited to collaborate on ${homeName}`;
  const html = `
    <div>
      <p>Hello,</p>
      <p>You have been invited as <b>${role}</b> to the home "<b>${homeName}</b>" on Buildwise.</p>
      <p>Please complete your account setup using the link below:</p>
      <p><a href="${registerUrl}">${registerUrl}</a></p>
      <p>Once registered, you'll have access to this home. No subscription is required.</p>
      <p>— Buildwise</p>
    </div>
  `;
  const text = `You're invited as ${role} to "${homeName}" on Buildwise.
Complete your account: ${registerUrl}
No subscription required.`;
  return sendEmail({ to, subject, html, text });
}

async function sendConfirmEmail({ to, confirmUrl }) {
  const subject = 'Confirm your Buildwise account';
  const html = `
    <div>
      <p>Hello,</p>
      <p>Please confirm your email address to finish setting up your Buildwise account.</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
      <p>— Buildwise</p>
    </div>
  `;
  const text = `Confirm your Buildwise account: ${confirmUrl}`;
  return sendEmail({ to, subject, html, text });
}

module.exports = { sendEmail, sendInviteEmail, sendConfirmEmail };


