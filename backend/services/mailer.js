const http = require("http");
const https = require("https");

const FLASKMAIL_URL = () =>
  (process.env.FLASKMAIL_URL || "http://localhost:5050").replace(/\/+$/, "");

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

function httpRequest(url, method, body) {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname } = new URL(url);
    const mod = url.startsWith("https") ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname,
      port,
      path: pathname,
      method,
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    };
    const req = mod.request(options, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(chunks) });
        } catch {
          resolve({ status: res.statusCode, data: chunks });
        }
      });
    });
    req.on("error", (err) => reject(err));
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    if (data) req.write(data);
    req.end();
  });
}

async function sendViaFlaskMail({ user, token }) {
  const url = `${FLASKMAIL_URL()}/send-reset-email`;
  const body = {
    email: user.email,
    token,
    prenom: user.prenom || "",
  };
  const res = await httpRequest(url, "POST", body);
  if (res.status === 200) {
    console.info("Email sent via Flask-Mail to " + user.email);
    return true;
  }
  throw new Error(res.data?.error || `Flask-Mail returned HTTP ${res.status}`);
}

async function sendViaNodemailer({ user, token }) {
  const nodemailer = require("nodemailer");
  const resetUrl = buildResetUrl(token);
  const displayName = user.prenom || user.pseudo || "";

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = port === 465;
  const userCred = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!userCred || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: userCred, pass },
  });

  const from =
    process.env.SMTP_FROM
    || process.env.EMAIL_FROM
    || process.env.MAIL_FROM
    || process.env.SMTP_USER
    || "HEI STDhub <no-reply@hei-stdhub.local>";

  await transporter.sendMail({
    from,
    to: user.email,
    subject: "Réinitialisation de votre mot de passe HEI STDhub",
    text:
      `Bonjour ${displayName},\n\n` +
      `Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.\n` +
      `Ce lien est valable pendant 1 heure :\n${resetUrl}\n\n` +
      `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html:
      `<p>Bonjour ${displayName},</p>` +
      `<p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>` +
      `<p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>` +
      `<p>Ce lien est valable pendant 1 heure.</p>` +
      `<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  });
  console.info("Email sent via Nodemailer to " + user.email);
}

const sendPasswordResetEmail = async ({ user, token }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const resetUrl = buildResetUrl(token);

  try {
    await sendViaFlaskMail({ user, token });
    return { skipped: false, provider: "flaskmail", resetUrl };
  } catch (flaskErr) {
    console.warn("Flask-Mail unavailable, falling back to Nodemailer:", flaskErr.message);
    try {
      await sendViaNodemailer({ user, token });
      return { skipped: false, provider: "nodemailer", resetUrl };
    } catch (smtpErr) {
      console.error("Both Flask-Mail and Nodemailer failed:", smtpErr.message);
      console.info("No email sent. Reset link:", resetUrl);
      return { skipped: true, resetUrl, logUrl: resetUrl };
    }
  }
};

const sendEmail = async ({ user, subject, text, html }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  try {
    const url = `${FLASKMAIL_URL()}/send-email`;
    await httpRequest(url, "POST", { email: user.email, subject, text, html: html || text });
    console.info("Email sent via Flask-Mail to " + user.email);
    return { skipped: false, provider: "flaskmail" };
  } catch (flaskErr) {
    console.warn("Flask-Mail unavailable, falling back to Nodemailer:", flaskErr.message);
    try {
      const nodemailer = require("nodemailer");
      const host = process.env.SMTP_HOST || "smtp.gmail.com";
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const secure = port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const from =
        process.env.SMTP_FROM
        || process.env.EMAIL_FROM
        || process.env.MAIL_FROM
        || process.env.SMTP_USER
        || "HEI STDhub <no-reply@hei-stdhub.local>";
      await transporter.sendMail({ from, to: user.email, subject, text, html: html || text });
      console.info("Email sent via Nodemailer to " + user.email);
      return { skipped: false, provider: "nodemailer" };
    } catch (smtpErr) {
      console.error("Both Flask-Mail and Nodemailer failed:", smtpErr.message);
      return { skipped: true };
    }
  }
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
  sendEmail,
};
