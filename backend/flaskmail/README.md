# Flask-Mail — Service d'envoi d'emails

Micro-service Python qui remplace nodemailer pour l'envoi d'emails (mot de passe oublié, notifications).

## Prérequis

- Python 3.10+
- pip

## Installation

```bash
# Depuis la racine du projet
make flaskmail-install

# Ou manuellement
cd backend/flaskmail
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

## Configuration

Les variables SMTP sont lues depuis `backend/.env` (ou la racine `.env`) :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre.email@gmail.com
SMTP_PASS=mot-de-passe-application
SMTP_FROM="HEI STDhub <votre.email@gmail.com>"
CLIENT_URL=http://localhost:5173
```

**Obtenir un mot de passe d'application Gmail :**
1. https://myaccount.google.com/security → Activer la validation en 2 étapes
2. https://myaccount.google.com/apppasswords → Générer pour "Mail"
3. Copier le code à 16 caractères dans `SMTP_PASS`

## Démarrage

```bash
# Terminal 1 — Flask-Mail (port 5050)
make flaskmail

# Terminal 2 — Backend Node.js (port 3001)
cd backend && npm run dev

# Terminal 3 — Frontend React (port 5173)
cd frontend && npm run dev
```

Le backend Node.js appelle automatiquement Flask-Mail via HTTP sur `http://localhost:5050`.

## Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/send-reset-email` | Envoie un email de réinitialisation |
| `POST` | `/send-email` | Envoie un email générique |
| `GET` | `/health` | Healthcheck |

### POST /send-reset-email

```json
{ "email": "user@example.com", "token": "abc123...", "prenom": "Jean" }
```

### POST /send-email

```json
{ "email": "user@example.com", "subject": "Sujet", "text": "Corps texte", "html": "<p>Corps HTML</p>" }
```

## Test

```bash
curl -X POST http://localhost:5050/send-reset-email \
  -H "Content-Type: application/json" \
  -d '{"email":"destinataire@example.com","token":"test-123","prenom":"Test"}'
```

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_SECURE` | (vide) | `true` pour SSL (port 465) |
| `SMTP_USER` | — | Identifiant SMTP |
| `SMTP_PASS` | — | Mot de passe d'application |
| `SMTP_FROM` | `SMTP_USER` | Expéditeur |
| `CLIENT_URL` | `http://localhost:5173` | URL du frontend (pour le lien de reset) |
| `FLASKMAIL_PORT` | `5050` | Port d'écoute du service |
