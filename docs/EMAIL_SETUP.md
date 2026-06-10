# Configuration Email — HEI STDhub

## Architecture Actuelle

Le système de réinitialisation de mot de passe utilise désormais un **code à 6 caractères envoyé via notification push** (Web Push API), plutôt qu'un email.

```
Utilisateur → Frontend → POST /api/auth/forgot-password
                              ↓
                         Backend génère un code à 6 caractères
                              ↓
                         Envoi via Web Push (notificationService.js)
                              ↓
                         L'utilisateur reçoit le code sur son appareil
                              ↓
                         Saisie du code → POST /api/auth/forgot-password/verify-code
                              ↓
                         Réinitialisation du mot de passe
```

## Configuration du Service Email (Obsolète pour le Reset)

Le backend conserve la capacité d'envoyer des emails via un service de mailer, mais cette fonctionnalité **n'est plus utilisée pour le flux "mot de passe oublié"**. Le code du service mailer (`backend/services/mailer.js`) existe toujours et peut être utilisé pour d'autres besoins futurs.

### Providers supportés (dans l'ordre de priorité)

1. **Resend API** — si `RESEND_API_KEY` est configuré
2. **SMTP** — si `SMTP_HOST` est configuré (Nodemailer)
3. **Fallback** — log dans la console (en développement)

### Variables d'environnement (optionnelles)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM` | Expéditeur Resend |
| `SMTP_HOST` / `EMAIL_HOST` | Serveur SMTP |
| `SMTP_PORT` / `EMAIL_PORT` | Port SMTP (défaut: 587) |
| `SMTP_USER` / `EMAIL_USER` | Identifiant SMTP |
| `SMTP_PASS` / `EMAIL_PASS` | Mot de passe SMTP |
| `SMTP_FROM` / `EMAIL_FROM` / `MAIL_FROM` | Expéditeur |
| `SMTP_SECURE` / `EMAIL_SECURE` | TLS pour port 465 |

### Test rapide (si le service mailer est configuré)

```bash
# Test via l'endpoint forgot-password (envoie via push, pas email)
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"utilisateur@example.com"}'
```

---

## Notes Importantes

- Le flux de réinitialisation de mot de passe ne nécessite **aucune configuration email** en production
- Les codes de réinitialisation sont envoyés **exclusivement via notification push**
- L'utilisateur doit être abonné aux notifications push (via le navigateur/PWA) pour recevoir le code
- Un fallback console.log existe si le push ne peut pas être délivré
- Les tokens de réinitialisation (SHA-256) ont une validité de 1 heure et sont à usage unique
