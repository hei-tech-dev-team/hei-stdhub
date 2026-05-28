const nodemailer = require("nodemailer");

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const createTransport = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";

  if (!user || !pass) {
    console.warn("mailer: SMTP_USER or SMTP_PASS not set, emails will be logged only");
    return null;
  }

  const secure = process.env.SMTP_SECURE?.toLowerCase() === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const sendPasswordResetEmail = async ({ user, token }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const resetUrl = buildResetUrl(token);
  const displayName = user.prenom || user.pseudo || "";

  const subject = "Réinitialisation de votre mot de passe HEI STDhub";
  const bodyText =
    `Bonjour ${displayName},\n\n` +
    `Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.\n` +
    `Ce lien est valable pendant 5 minutes :\n${resetUrl}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;
  const bodyHtml =
    `<p>Bonjour ${displayName},</p>` +
    `<p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>` +
    `<p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>` +
    `<p>Ce lien est valable pendant 5 minutes.</p>` +
    `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;

  return sendEmail({
    user,
    subject,
    text: bodyText,
    html: bodyHtml,
  });
};

const sendEmail = async ({ user, subject, text, html }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const transporter = createTransport();
  if (!transporter) {
    console.info("mailer: SMTP not configured, logging email to " + user.email);
    console.info("mailer: Subject:", subject);
    console.info("mailer: Body:", text);
    return { skipped: true };
  }

  try {
    const from = process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || "HEI STDhub <no-reply@hei-stdhub.local>";

    await transporter.sendMail({
      from,
      to: user.email,
      subject,
      text,
      html: html || text,
    });

    console.info("Email sent to " + user.email);
    return { skipped: false, provider: "smtp" };
  } catch (err) {
    console.error("mailer error:", err.message);
    return { skipped: true };
  }
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
  sendEmail,
};
