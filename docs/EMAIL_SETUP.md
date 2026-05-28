# Configuration Email — HEI STDhub

## Architecture

Le service email utilise **Nodemailer** directement depuis le backend Node.js (plus de micro-service Python).

```
Frontend → Backend Node.js (POST /api/auth/forgot-password)
                ↓
          Nodemailer → SMTP Gmail
```

## Variables d'environnement

Dans `backend/.env` ou les variables d'environnement Render :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hei.fatratra@gmail.com
SMTP_PASS=le-mot-de-passe-d-application
SMTP_FROM="HEI STDhub <hei.fatratra@gmail.com>"
CLIENT_URL=https://hei-stdhub.vercel.app
```

**Obtenir un mot de passe d'application Gmail :**
1. Va sur https://myaccount.google.com/security
2. Active la Validation en deux étapes
3. Va dans https://myaccount.google.com/apppasswords
4. Génère un mot de passe pour "Mail"
5. Copie le code à 16 caractères dans `SMTP_PASS`

## Flux "Mot de passe oublié"

1. **Frontend** → user entre son email → `POST /api/auth/forgot-password`
2. **Backend** : cherche l'utilisateur par email, génère un token SHA-256, stocke en DB (5 min)
3. **Backend** : répond immédiatement (message générique de sécurité)
4. **Backend** : envoie l'email directement via Nodemailer → SMTP Gmail
5. **User** : clique sur le lien → `ResetPasswordPage` → nouveau mot de passe

## Dépannage

| Symptôme | Cause | Solution |
|----------|-------|----------|
| SMTP 535 "Authentication failed" | Mauvais mot de passe | Régénérer sur https://myaccount.google.com/apppasswords |
| Timeout SMTP | Port bloqué | Vérifier le pare-feu, utiliser le port 587 |
| Aucun email reçu | `SMTP_PASS` non défini | Vérifier les variables d'environnement sur Render |

## Test rapide

```bash
# Vérifier que le backend démarre correctement
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hei.mg"}'
```
