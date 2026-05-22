# Configuration Email — HEI STDhub

## Architecture

Le service email (`mailer.js`) utilise deux fournisseurs avec fallback :

1. **Resend** (essayé en premier) — API REST, rapide
2. **SMTP** (fallback) — via nodemailer, utilisé quand Resend échoue

## Variables d'environnement (`.env`)

### Resend
```
RESEND_API_KEY=re_...          # Clé API Resend
RESEND_FROM=...                # Expéditeur (optionnel, défaut: onboarding@resend.dev)
```

**Attention** : `onboarding@resend.dev` (mode test) ne peut envoyer qu'à l'email du propriétaire du compte Resend. Pour envoyer à d'autres destinataires, il faut :
- Configurer SMTP (recommandé)
- Ou vérifier un domaine sur https://resend.com/domains

### SMTP (Gmail)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hei.fatratra@gmail.com
SMTP_PASS=le-mot-de-passe-d-application
SMTP_FROM=HEI STDhub <hei.fatratra@gmail.com>
```

**Obtenir un mot de passe d'application Gmail :**
1. Va sur https://myaccount.google.com/security
2. Active la Validation en deux étapes
3. Va dans Mots de passe d'application
4. Génère un mot de passe pour "Mail"
5. Copie le code à 16 caractères

### Legacy (alias encore supportés)
```
EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_SECURE / EMAIL_FROM
MAIL_FROM
FRONTEND_URL (alternative à CLIENT_URL)
```

## Flux "Mot de passe oublié"

1. **Frontend** → `POST /api/auth/forgot-password` avec `{ email }`
2. **Backend** : cherche l'utilisateur par email, génère un token SHA-256, stocke en DB (expire 1h)
3. **Backend** : répond immédiatement (message générique de sécurité)
4. **Backend** : appelle `sendPasswordResetEmail()` en arrière-plan
5. **Mailer** : essaie Resend → si échec → essaie SMTP → si échec → loggue le lien

**Schéma DB :**
```sql
CREATE TABLE password_reset_tokens (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64)  NOT NULL UNIQUE,
  expires_at TIMESTAMP    NOT NULL,        -- +1h
  used_at    TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## Résolution des problèmes

| Symptôme | Cause | Solution |
|----------|-------|----------|
| Resend 403 "only send to your own email" | Mode test Resend | Configurer SMTP ou vérifier un domaine |
| SMTP ne fonctionne pas | Mauvais mot de passe d'application | Régénérer sur https://myaccount.google.com/apppasswords |
| Timeout SMTP | Port bloqué (465/587) | Vérifier le pare-feu, utiliser le port 587 |
| L'email arrive dans les spams | Absence de DKIM/SPF | Configurer les enregistrements DNS |

## Test

```bash
cd backend
node -e "
require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/mailer');
sendPasswordResetEmail({
  user: { email: 'destinataire@example.com', prenom: 'Test' },
  token: 'token-de-test-' + Date.now(),
}).then(r => console.log(JSON.stringify(r, null, 2)));
"
```
