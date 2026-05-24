const getFlaskmailUrl = () =>
  (process.env.FLASKMAIL_URL || "http://localhost:5050").replace(/\/$/, "");

const getFrontendUrl = () =>
  (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/$/, "");

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const sendPasswordResetEmail = async ({ user, token }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  const resetUrl = buildResetUrl(token);

  try {
    const response = await fetch(`${getFlaskmailUrl()}/send-reset-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        token,
        prenom: user.prenom || user.pseudo || "",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Flaskmail error (${response.status}): ${body}`);
    }

    console.info("Email de réinitialisation envoyé via Flask-Mail à " + user.email);
    return { skipped: false, provider: "flaskmail", resetUrl };
  } catch (err) {
    console.error("Flask-Mail échoué:", err.message);
    console.info("Aucun email envoyé à " + user.email + ". Lien: " + resetUrl);
    return { skipped: true, resetUrl, logUrl: resetUrl };
  }
};

const sendEmail = async ({ user, subject, text, html }) => {
  if (!user?.email?.trim()) throw new Error("User email is required");

  try {
    const response = await fetch(`${getFlaskmailUrl()}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, subject, text, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Flaskmail error (${response.status}): ${body}`);
    }

    console.info("Email envoyé via Flask-Mail à " + user.email);
    return { skipped: false, provider: "flaskmail" };
  } catch (err) {
    console.error("Flask-Mail échoué:", err.message);
    return { skipped: true };
  }
};

module.exports = {
  buildResetUrl,
  sendPasswordResetEmail,
  sendEmail,
};
