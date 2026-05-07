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

const createTransport = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.EMAIL_SECURE === "true" ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
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

const sendWithResend = async ({ user, subject, text, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.resend.com/emails", {
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
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }

  return response.json();
};

const sendPasswordResetEmail = async ({ user, token }) => {
  const resetUrl = buildResetUrl(token);
  const transporter = createTransport();
  const displayName = user.prenom || user.pseudo || "";
  const subject = "Réinitialisation de votre mot de passe HEI STDhub";
  const text = [
    `Bonjour ${displayName},`,
    "",
    "Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.",
    "Ce lien est valable pendant 1 heure :",
    resetUrl,
    "",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  ].join("\n");
  const html = `
      <p>Bonjour ${escapeHtml(displayName)},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable pendant 1 heure.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `;

  if (process.env.RESEND_API_KEY) {
    await sendWithResend({ user, subject, text, html });
    return { skipped: false, resetUrl };
  }

  if (!transporter) {
    console.info(
      `Lien de réinitialisation pour ${user.email}: ${resetUrl}`,
    );
    return { skipped: true, resetUrl };
  }

  await transporter.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject,
    text,
    html,
  });

  return { skipped: false, resetUrl };
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
};
