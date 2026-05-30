import os
import sys
import logging

from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_mail import Mail, Message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("flaskmail")

dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    root_dotenv = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(root_dotenv):
        load_dotenv(root_dotenv)

app = Flask(__name__)

app.config["MAIL_SERVER"] = os.getenv("SMTP_HOST", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.getenv("SMTP_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.getenv("SMTP_SECURE", "").lower() != "true"
app.config["MAIL_USE_SSL"] = os.getenv("SMTP_SECURE", "").lower() == "true"
app.config["MAIL_USERNAME"] = os.getenv("SMTP_USER", "")
app.config["MAIL_PASSWORD"] = os.getenv("SMTP_PASS", "")
app.config["MAIL_DEFAULT_SENDER"] = (
    os.getenv("SMTP_FROM")
    or os.getenv("MAIL_FROM")
    or os.getenv("EMAIL_FROM")
    or app.config["MAIL_USERNAME"]
    or "HEI STDhub <no-reply@hei-stdhub.local>"
)

mail = Mail(app)

CLIENT_URL = (
    os.getenv("CLIENT_URL")
    or os.getenv("FRONTEND_URL")
    or "http://localhost:5173"
).rstrip("/")


def send_reset_email(to_email, prenom, token):
    reset_url = f"{CLIENT_URL}/reset-password?token={token}"
    display_name = prenom or ""

    subject = "Réinitialisation de votre mot de passe HEI STDhub"
    body_text = (
        f"Bonjour {display_name},\n\n"
        f"Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.\n"
        f"Ce lien est valable pendant 1 heure :\n{reset_url}\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
    )
    body_html = (
        f"<p>Bonjour {display_name},</p>"
        f"<p>Vous avez demandé la réinitialisation de votre mot de passe HEI STDhub.</p>"
        f'<p><a href="{reset_url}">Réinitialiser mon mot de passe</a></p>'
        f"<p>Ce lien est valable pendant 1 heure.</p>"
        f"<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>"
    )

    msg = Message(
        subject=subject,
        recipients=[to_email],
        body=body_text,
        html=body_html,
    )
    mail.send(msg)
    logger.info("Reset email sent to %s via Flask-Mail", to_email)


@app.route("/send-reset-email", methods=["POST"])
def handle_send_reset_email():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    to_email = (data.get("email") or "").strip()
    token = (data.get("token") or "").strip()
    prenom = (data.get("prenom") or "").strip()

    if not to_email or not token:
        return jsonify({"error": "email and token are required"}), 400

    try:
        send_reset_email(to_email, prenom, token)
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/send-email", methods=["POST"])
def handle_send_email():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    to_email = (data.get("email") or "").strip()
    subject = (data.get("subject") or "").strip()
    text = (data.get("text") or "").strip()
    html = data.get("html") or ""

    if not to_email or not subject or not text:
        return jsonify({"error": "email, subject and text are required"}), 400

    try:
        msg = Message(subject=subject, recipients=[to_email], body=text, html=html)
        mail.send(msg)
        logger.info("Email sent to %s via Flask-Mail", to_email)
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("FLASKMAIL_PORT", "5050"))
    logger.info("Starting flaskmail on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
