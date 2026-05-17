const nodemailer = require("nodemailer");

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const getFromAddress = () =>
  process.env.SMTP_FROM ||
  process.env.EMAIL_FROM ||
  process.env.MAIL_FROM ||
  process.env.SMTP_USER ||
  "HEI STDhub <no-reply@hei-stdhub.local>";

const createTransport = (portOverride) => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!host) return null;

  const port = portOverride || Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.EMAIL_SECURE === "true" ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    family: 4,
    connectionTimeout: 8000,
    tls: { rejectUnauthorized: false },
  });
};

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getEmailTimeoutMs = () =>
  Number(process.env.EMAIL_TIMEOUT_MS || process.env.RESEND_TIMEOUT_MS || 10000);

const readResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return "";

  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
};

const sendWithResend = async ({ user, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getEmailTimeoutMs());

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM ||
          process.env.EMAIL_FROM ||
          process.env.MAIL_FROM ||
          "HEI STDhub <onboarding@resend.dev>",
        to: user.email,
        subject,
        text,
        html,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await readResponseBody(response);
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }

  return response.json();
};

const trySendSmtp = async ({ to, subject, text, html }) => {
  const defaultPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
  const ports = [...new Set([defaultPort, 465, 587])];
  for (const port of ports) {
    const transporter = createTransport(port);
    if (!transporter) return null;
    try {
      await transporter.sendMail({ from: getFromAddress(), to, subject, text, html });
      return { provider: "smtp", port };
    } catch (err) {
      console.error(`SMTP failed on port ${port}:`, err.message);
      transporter.close();
    }
  }
  return null;
};

const sendPasswordResetEmail = async ({ user, token }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const resetUrl = buildResetUrl(token);
  const displayName = user.prenom || user.pseudo || "";
  const subject = "Réinitialisation de votre mot de passe HEI STDhub";
  const text = [
    `Bonjour ${displayName},`,
    "",
    "Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.",
    "Ce lien est valable pendant 5 minutes :",
    resetUrl,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  ].join("\n");
  const html = `
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable pendant 5 minutes.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `;

  // Try SMTP first, then Resend as fallback
  const smtpResult = await trySendSmtp({ to: user.email, subject, text, html });
  if (smtpResult) {
    console.info(`Email de réinitialisation envoyé via SMTP (port ${smtpResult.port}) à ${user.email}`);
    return { skipped: false, resetUrl };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const result = await sendWithResend({ user, subject, text, html });
      console.info(`Email de réinitialisation envoyé via Resend à ${user.email}`);
      return { skipped: false, provider: "resend", result, resetUrl };
    } catch (resendErr) {
      console.error("Resend also failed:", resendErr.message);
    }
  }

  console.info(`Aucun email envoyé à ${user.email}. Lien: ${resetUrl}`);
  return { skipped: true, resetUrl, logUrl: resetUrl };
};

const sendEmail = async ({ user, subject, text, html }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  // Try SMTP first, then Resend as fallback
  const smtpResult = await trySendSmtp({ to: user.email, subject, text, html });
  if (smtpResult) {
    console.info(`Email envoyé via SMTP (port ${smtpResult.port}) à ${user.email}`);
    return { skipped: false };
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const result = await sendWithResend({ user, subject, text, html });
      console.info(`Email envoyé via Resend à ${user.email}`);
      return { skipped: false, provider: "resend", result };
    } catch (resendErr) {
      console.error("Resend also failed:", resendErr.message);
    }
  }

  console.info(`Email non envoyé à ${user.email}.`);
  return { skipped: true };
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
  sendEmail,
};
