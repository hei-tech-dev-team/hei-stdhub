# Configuration Email — HEI STDhub

## Architecture

Le service email utilise un micro-service **Python Flask-Mail** qui tourne à côté du backend Node.js.

```
Frontend → Backend Node.js (POST /api/auth/forgot-password)
                ↓
         Flask-Mail (Python) sur port 5050
                ↓
          SMTP Gmail (gratuit)
```

## Prérequis

- Python 3.10+
- pip

## Installation Flask-Mail

```bash
# Depuis la racine
make flaskmail-install

# Ou via npm postinstall (automatique après npm install)
cd backend && npm install

# Ou manuellement
cd backend/flaskmail
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

## Démarrage en développement

```bash
# Terminal 1 — Flask-Mail
make flaskmail

# Terminal 2 — Backend
cd backend && npm run dev

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Le backend détecte automatiquement Flask-Mail sur `http://localhost:5050`.

## Production (Render)

Le `npm start` (via `start.sh`) lance automatiquement Flask-Mail en arrière-plan puis démarre le serveur Node.js.

**Avant le déploiement, assurez-vous :**
1. Que le build Render a Python 3 installé (c'est le cas par défaut)
2. Que les variables SMTP sont configurées dans Render

## Variables d'environnement

```env
# SMTP Gmail (gratuit)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hei.fatratra@gmail.com
SMTP_PASS=le-mot-de-passe-d-application
SMTP_FROM=HEI STDhub <hei.fatratra@gmail.com>

CLIENT_URL=http://localhost:5173
FLASKMAIL_URL=http://localhost:5050
```

**Obtenir un mot de passe d'application Gmail :**
1. Va sur https://myaccount.google.com/security
2. Active la Validation en deux étapes
3. Va dans https://myaccount.google.com/apppasswords
4. Génère un mot de passe pour "Mail"
5. Copie le code à 16 caractères

## Flux "Mot de passe oublié"

1. **Frontend** → user entre son email → `POST /api/auth/forgot-password`
2. **Backend** : cherche l'utilisateur par email, génère un token SHA-256, stocke en DB (5 min)
3. **Backend** : répond immédiatement (message générique de sécurité)
4. **Backend** : appelle Flask-Mail via HTTP
5. **Flask-Mail** : envoie l'email via SMTP Gmail
6. **User** : clique sur le lien → `ResetPasswordPage` → nouveau mot de passe

## Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Flask ne répond pas | Service non démarré | Lancer `make flaskmail` ou vérifier le log Render |
| SMTP 535 "Authentication failed" | Mauvais mot de passe | Régénérer sur https://myaccount.google.com/apppasswords |
| Timeout SMTP | Port bloqué | Vérifier le pare-feu, utiliser le port 587 |
| Aucun email reçu | Flask-Mail non lancé | Vérifier que `start.sh` s'exécute correctement |

## Test rapide

```bash
# Tester Flask-Mail directement
curl -X POST http://localhost:5050/send-reset-email \
  -H "Content-Type: application/json" \
  -d '{"email":"destinataire@example.com","token":"test-123","prenom":"Test"}'
```

## Référence

- Code du service : `backend/flaskmail/`
- Script de démarrage : `backend/start.sh`
