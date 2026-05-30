# Configuration Email — HEI STDhub

## Architecture

Le service email utilise un micro-service **Python Flask-Mail** qui tourne à côté du backend Node.js.

```
Frontend → Backend Node.js (POST /api/auth/forgot-password)
                ↓
         Flask-Mail (Python) sur port 5050 (HTTP)
                ↓
           SMTP Gmail (ou autre fournisseur)
```

Si Flask-Mail est indisponible, le backend **tombe automatiquement** sur Nodemailer (SMTP direct).

## Prérequis

- Python 3.10+
- pip

## Installation Flask-Mail

```bash
# Depuis la racine
make flaskmail-install

# Ou manuellement
cd backend/flaskmail
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

## Démarrage

### Local (développement)

```bash
# Démarre Flask-Mail + Node.js automatiquement
cd backend && npm start

# Ou séparément (deux terminaux) :
make flaskmail          # Terminal 1 : Flask-Mail sur :5050
cd backend && npm run dev  # Terminal 2 : Node sur :3001

# Terminal 3 — Frontend
cd frontend && npm run dev  # React sur :5173
```

Le backend détecte automatiquement Flask-Mail via `FLASKMAIL_URL` (défaut: `http://localhost:5050`).

### Production (Render)

Le `npm start` (via `start.sh`) lance automatiquement Flask-Mail en arrière-plan puis démarre le serveur Node.js.

**Configuration Render nécessaire :**
1. Python 3 est préinstallé sur Render (gratuit)
2. Ajouter le Build Pack Python si nécessaire
3. Les variables SMTP doivent être configurées dans le dashboard Render

### Variables d'environnement (backend)

| Variable | Défaut | Description |
|----------|--------|-------------|
| `FLASKMAIL_URL` | `http://localhost:5050` | URL du microservice Flask-Mail |
| `SMTP_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `SMTP_PORT` | `587` | Port SMTP (587 = STARTTLS, 465 = SSL) |
| `SMTP_SECURE` | (vide) | `true` pour SSL (port 465) |
| `SMTP_USER` | — | Identifiant SMTP |
| `SMTP_PASS` | — | Mot de passe d'application |
| `SMTP_FROM` | `SMTP_USER` | Expéditeur des emails |
| `CLIENT_URL` | `http://localhost:5173` | URL du frontend (pour le lien de reset) |

**Obtenir un mot de passe d'application Gmail :**
1. Va sur https://myaccount.google.com/security
2. Active la Validation en deux étapes
3. Va sur https://myaccount.google.com/apppasswords
4. Génère un mot de passe pour "Mail"
5. Copie le code à 16 caractères

## Flux "Mot de passe oublié"

1. **Frontend** → user entre son email → `POST /api/auth/forgot-password`
2. **Backend** : cherche l'utilisateur par email, génère un token SHA-256, stocke en DB (5 min)
3. **Backend** : répond immédiatement (message générique de sécurité)
4. **Backend** : appelle Flask-Mail via HTTP (`POST /send-reset-email`)
5. **Flask-Mail** : envoie l'email via SMTP Gmail
6. **User** : clique sur le lien → `ResetPasswordPage` → nouveau mot de passe

## Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Flask ne répond pas | Service non démarré | Vérifier que `start.sh` lance Flask-Mail |
| SMTP 535 "Authentication failed" | Mauvais mot de passe | Régénérer sur https://myaccount.google.com/apppasswords |
| Timeout SMTP | Port bloqué | Vérifier le pare-feu, utiliser le port 587 |
| Aucun email reçu | Flask-Mail ou SMTP défaillant | Vérifier les logs (le backend tombe sur Nodemailer) |
| "Flask-Mail did not start in time" | Python/venv manquant | Exécuter `make flaskmail-install` |

## Test rapide

```bash
# Tester Flask-Mail directement
curl -X POST http://localhost:5050/send-reset-email \
  -H "Content-Type: application/json" \
  -d '{"email":"destinataire@example.com","token":"test-123","prenom":"Test"}'

# Healthcheck
curl http://localhost:5050/health
```

## Référence

- Code du service : `backend/flaskmail/`
- Script de démarrage : `backend/start.sh`
- Service mailer Node.js : `backend/services/mailer.js` (appelle Flask-Mail, fallback Nodemailer)
