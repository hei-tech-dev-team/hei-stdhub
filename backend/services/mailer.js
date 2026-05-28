const nodemailer = require("nodemailer");

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const createTransport = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const getFromAddress = () =>
  process.env.SMTP_FROM
  || process.env.EMAIL_FROM
  || process.env.MAIL_FROM
  || process.env.SMTP_USER
  || "HEI STDhub <no-reply@hei-stdhub.local>";

const sendPasswordResetEmail = async ({ user, token }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const resetUrl = buildResetUrl(token);
  const displayName = user.prenom || user.pseudo || "";

  const subject = "Réinitialisation de votre mot de passe HEI STDhub";
  const text =
    `Bonjour ${displayName},\n\n` +
    `Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.\n` +
    `Ce lien est valable pendant 5 minutes :\n${resetUrl}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`;
  const html =
    `<p>Bonjour ${displayName},</p>` +
    `<p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>` +
    `<p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>` +
    `<p>Ce lien est valable pendant 5 minutes.</p>` +
    `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: getFromAddress(),
      to: user.email,
      subject,
      text,
      html,
    });
    console.info("Email de réinitialisation envoyé à " + user.email);
    return { skipped: false, provider: "nodemailer", resetUrl };
  } catch (err) {
    console.error("Échec envoi email de réinitialisation:", err.message);
    console.info("Aucun email envoyé à " + user.email + ". Lien: " + resetUrl);
    return { skipped: true, resetUrl, logUrl: resetUrl };
  }
};

const sendEmail = async ({ user, subject, text, html }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: getFromAddress(),
      to: user.email,
      subject,
      text,
      html: html || text,
    });
    console.info("Email envoyé à " + user.email);
    return { skipped: false, provider: "nodemailer" };
  } catch (err) {
    console.error("Échec envoi email:", err.message);
    return { skipped: true };
  }
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
  sendEmail,
};
