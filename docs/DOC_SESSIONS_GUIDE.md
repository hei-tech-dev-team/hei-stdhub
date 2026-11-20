# Sessions et authentification

Ce guide décrit l'architecture de session mise en place pour fermer les constats
H-01 et H-02 de l'audit de sécurité de novembre 2026. Il remplace les anciennes
règles « JWT de 7 jours dans `localStorage` » : l'accès est désormais porté par un
jeton court en mémoire, le renouvellement par un cookie `HttpOnly` rotatif, et
chaque session est révocable côté serveur.

## Vue d'ensemble

```
Navigateur                         Vercel                    Render
┌──────────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│ access token (mémoire)│─────▶│ /api/auth/* proxy│─────▶│ API Express          │
│ cookie hei_refresh    │      │  (fonction)      │      │ + PostgreSQL         │
│ hei_csrf (localStorage)│     └──────────────────┘      │ + Socket.IO          │
└──────────────────────┘                                  └─────────────────────┘
            │                                                        │
            └────────────── reste de l'API + Socket.IO ─────────────┘
                    Authorization: Bearer <access token>
```

Le proxy d'authentification rend le cookie de refresh **first-party** sur le
domaine Vercel. Les autres appels (API métier, Socket.IO) partent directement
vers Render avec l'en-tête `Authorization`, car le cookie est limité à
`Path=/api/auth`.

## Les trois secrets

### Access token

- JWT signé en **HS256** avec `JWT_SECRET`.
- Durée de vie : **15 minutes** (`ACCESS_TOKEN_TTL_SECONDS=900`).
- Conservé **uniquement en mémoire** dans `tokenStore.js`. Aucun `localStorage`,
  aucun cookie.
- Claims : `sub` (id utilisateur), `sid` (id de session), `tv` (token version),
  `iss`, `aud`, `iat`, `exp`. Aucun rôle, pseudo ou UE n'est embarqué.
- Vérification : algorithme épinglé, `issuer` et `audience` contrôlés, puis
  chargement de la session et de l'utilisateur en base.

### Refresh token

- 32 octets aléatoires encodés en base64url.
- Stocké **haché en SHA-256** dans `sessions.refresh_token_hash`. Le token en
  clair n'existe que dans le cookie du navigateur.
- Cookie `hei_refresh` avec `HttpOnly`, `Secure` en production,
  `SameSite=Strict`, `Path=/api/auth`, sans attribut `Domain` (cookie host-only),
  et une durée de **30 jours**.
- Rotation à chaque refresh réussi. L'ancien hash est conservé dans
  `previous_refresh_token_hash` avec une fenêtre de grâce de **15 secondes**.
- Réutilisation hors grâce : la session est révoquée avec la raison `reuse`, ce
  qui déconnecte aussi ses sockets.

### Jeton CSRF

- Généré en même temps que la session, stocké haché dans
  `sessions.csrf_token_hash`.
- Renvoyé au client lors de la connexion, de l'inscription et du changement de
  mot de passe. Il est conservé dans `localStorage` sous `hei_csrf` pour être
  partagé entre les onglets.
- Exigé dans l'en-tête `X-CSRF-Token` pour `/api/auth/refresh` et
  `/api/auth/logout`.
- Il reste stable pendant toute la vie de la session ; il n'est pas régénéré à
  chaque rotation du refresh token.

## Rôles et responsabilités

| Composant | Rôle |
|-----------|------|
| `backend/config/auth.js` | Centralise les durées, noms de cookie, issuer/audience et limites. |
| `backend/services/tokenAuth.js` | Signe et vérifie les access tokens, applique HS256 + issuer/audience + session. |
| `backend/services/sessionService.js` | Crée, tourne, révoque, liste et vérifie les sessions ; gère le cache et les sockets. |
| `backend/services/sessionCleanupJob.js` | Purge quotidienne à 03:30 des sessions expirées ou révoquées depuis plus de 30 jours. |
| `backend/middleware/auth.js` | Extrait le Bearer, attache `req.user` chargé depuis la base. |
| `backend/middleware/clientIp.js` | Ne fait confiance à `X-Forwarded-For` que si le proxy Vercel présente `AUTH_PROXY_SECRET`. |
| `backend/routes/auth.js` | Connexion, inscription, refresh, logout, logout global, liste/révocation des sessions, mot de passe. |
| `backend/routes/admin.js` | Révoque les sessions de la cible lors d'un changement de rôle, d'email ou d'une suppression. |
| `backend/server.js` | Authentifie les sockets, crée les rooms `session:<sid>` et `user:<uid>`, coupe les connexions à l'expiration ou à la révocation. |
| `frontend/src/api/tokenStore.js` | Garde l'access token en mémoire et le jeton CSRF dans `localStorage`. |
| `frontend/src/api/authApi.js` | Client axios du proxy `/api/auth` (même origine par défaut), avec `withCredentials`, Bearer et CSRF automatiques. |
| `frontend/src/api/session.js` | Refresh mono-flight, application des réponses d'authentification, purge locale. |
| `frontend/src/api/axios.js` | Ajoute le Bearer, tente un refresh sur 401, rejoue une fois la requête. |
| `frontend/src/context/AuthContext.jsx` | Restaure la session au démarrage, rafraîchit avant expiration, réagit à la révocation. |
| `frontend/src/socket.js` | Connexion Socket.IO avec l'access token, refresh sur `auth:expired`, écoute `session:revoked`. |
| `frontend/api/auth/[...path].js` | Proxy Vercel de `/api/auth/*` vers Render, avec transmission du cookie et de l'IP client. |
| `frontend/src/pages/ProfilePage.jsx` | Liste les sessions actives, permet de révoquer un appareil ou tous les appareils. |

## Rôles utilisateur

Le rôle n'est **jamais** lu dans le jeton. Il est chargé depuis `users.role` à
chaque requête authentifiée, avec un cache mémoire de 15 secondes par session
(`AUTH_CACHE_TTL_MS`). Le cache est vidé immédiatement lors d'une révocation,
d'un changement de rôle, d'un changement de mot de passe ou d'une mise à jour de
profil.

| Rôle | Accès aux sessions | Accès métier |
|------|--------------------|--------------|
| `student` | Liste et révoque ses propres sessions. | Routes étudiant, chat, suggestions, archives. |
| `teacher` | Liste et révoque ses propres sessions. | Routes enseignant, archives, chat, suggestions. |
| `bde` | Liste et révoque ses propres sessions. | Routes BDE et événements socket `bde:*`. |
| `admin` | Liste et révoque ses propres sessions. Ne peut pas révoquer la session d'un autre utilisateur via `/auth/sessions/:id`. | Administration des utilisateurs, invitations, annonces, UEs. |
| `developer` | Liste et révoque ses propres sessions. | Administration complète, y compris les rôles sensibles. |

Un changement de rôle révoque toutes les sessions de la cible et incrémente
`users.token_version`. Un administrateur ne peut pas modifier un compte
`developer` ni attribuer ce rôle ; seul un `developer` le peut.

## Cycle de vie d'une session

| Action | Effet serveur | Cookie | Sockets |
|--------|---------------|--------|---------|
| Connexion / inscription | Crée une ligne `sessions`, renvoie access token + CSRF. | Nouveau `hei_refresh`. | Connexion possible avec le nouvel access token. |
| Refresh réussi | Tourne le refresh token, met à jour `last_used_at`, `ip`, `user_agent`. | Nouveau cookie. | Aucune coupure. |
| Réutilisation dans les 15 s | Accepte l'ancien token, ne tourne rien. | Inchangé. | Aucune coupure. |
| Réutilisation hors grâce | Révoque la session (`reuse`). | Effacé côté client au prochain échec. | `session:revoked` puis déconnexion. |
| Logout | Révoque la session courante (`logout`). | Effacé. | `session:revoked` puis déconnexion. |
| Logout global | Révoque toutes les sessions (`logout_all`) et incrémente `token_version`. | Effacé. | `session:revoked` puis déconnexion de toutes les sockets. |
| Changement de mot de passe | Révoque les autres sessions (`password_change`), incrémente `token_version`, crée une nouvelle session pour l'appareil courant. | Nouveau cookie. | Déconnexion sans événement, pour laisser l'onglet courant se reconnecter. |
| Réinitialisation de mot de passe | Révoque toutes les sessions (`password_reset`) et incrémente `token_version`. | Effacé. | `session:revoked` puis déconnexion. |
| Changement de rôle / email | Révoque toutes les sessions de la cible (`role_change`, `email_change`). | Effacé au prochain refresh. | `session:revoked` puis déconnexion. |
| Suppression de compte | Les sessions sont supprimées en cascade. | Effacé au prochain refresh. | Déconnexion. |
| Expiration | `expires_at` atteint : le refresh renvoie 401 et révoque la ligne (`expired`). | Effacé. | L'access token expire au plus tard 15 min après le dernier refresh. |
| Limite de sessions | À la 21e connexion, la plus ancienne session est révoquée (`limit`). | Inchangé pour les autres. | La session révoquée est déconnectée. |

La session a une durée **absolue de 30 jours** : la rotation ne prolonge pas
`expires_at`. Un utilisateur doit donc se reconnecter au moins une fois tous les
30 jours.

### Pourquoi une grâce de 15 secondes

Plusieurs onglets peuvent appeler `/refresh` en parallèle avec le même cookie.
Le premier tourne le token ; les suivants présentent l'ancien token pendant la
fenêtre de grâce et reçoivent un access token sans nouvelle rotation. Sans cette
fenêtre, une simple course entre onglets révoquerait la session.

## Endpoints

| Méthode | Chemin | Authentification | CSRF | Description |
|---------|--------|------------------|------|-------------|
| `POST` | `/api/auth/login` | Non | Non | Crée une session, renvoie `token`, `expires_in`, `csrf_token`, `user`. |
| `POST` | `/api/auth/register` | Invitation ou admin | Non | Crée le compte et une session. |
| `POST` | `/api/auth/refresh` | Cookie `hei_refresh` | Oui | Tourne le refresh token et renvoie un nouvel access token. |
| `POST` | `/api/auth/logout` | Cookie + CSRF | Oui | Révoque la session courante. |
| `POST` | `/api/auth/logout-all` | Bearer | Non | Révoque toutes les sessions de l'utilisateur. |
| `GET` | `/api/auth/sessions` | Bearer | Non | Liste les sessions actives, avec `current: true` pour la session appelante. |
| `DELETE` | `/api/auth/sessions/:id` | Bearer | Non | Révoque une session appartenant à l'utilisateur. |
| `PATCH` | `/api/auth/password` | Bearer | Non | Change le mot de passe, révoque les autres sessions et renvoie une nouvelle session. |
| `GET` | `/api/auth/me` | Bearer | Non | Renvoie l'utilisateur courant chargé depuis la base. |
| `PATCH` | `/api/auth/profile` | Bearer | Non | Met à jour le pseudo et invalide le cache utilisateur. |
| `PATCH` | `/api/auth/avatar` | Bearer | Non | Met à jour l'avatar et invalide le cache utilisateur. |

`/api/auth/refresh` et `/api/auth/logout` vérifient aussi `Origin` lorsque
l'en-tête est présent. Les origines autorisées sont `CLIENT_URL`,
`http://localhost:5173`, `http://localhost:3000` et
`https://hei-stdhub.vercel.app`.

## Base de données

Migration : `database/migration_sessions.sql`.

| Colonne | Rôle |
|---------|------|
| `id` | UUID de session, repris dans le claim `sid`. |
| `user_id` | Propriétaire, `ON DELETE CASCADE`. |
| `refresh_token_hash` | SHA-256 du refresh token courant. |
| `previous_refresh_token_hash` | SHA-256 du token précédent, pour la grâce. |
| `previous_valid_until` | Fin de la fenêtre de grâce. |
| `csrf_token_hash` | SHA-256 du jeton CSRF. |
| `token_version` | Version attendue au moment de la création. |
| `user_agent`, `ip` | Contexte affiché dans la liste des sessions. |
| `created_at`, `last_used_at`, `expires_at` | Cycle de vie. |
| `revoked_at`, `revoked_reason` | Révocation et cause (`reuse`, `logout`, `logout_all`, `password_change`, `password_reset`, `role_change`, `email_change`, `expired`, `version`, `limit`). |

Index : `(user_id) WHERE revoked_at IS NULL`, `expires_at`, `revoked_at`,
`previous_refresh_token_hash`.

La purge supprime les lignes dont `expires_at` date de plus de 30 jours ou dont
`revoked_at` date de plus de 30 jours. Elle tourne tous les jours à 03:30 via
`node-cron`. En production, appliquer la migration avant de déployer le code.

## Configuration

### Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `JWT_SECRET` | requis | Secret HS256. |
| `JWT_ISSUER` | `hei-stdhub-api` | Claim `iss` attendu. |
| `JWT_AUDIENCE` | `hei-stdhub-web` | Claim `aud` attendu. |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Durée de l'access token. |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Durée absolue de la session. |
| `REFRESH_REUSE_GRACE_SECONDS` | `15` | Fenêtre de grâce multi-onglets. |
| `AUTH_CACHE_TTL_MS` | `15000` | Cache utilisateur par session ; `0` en test. |
| `MAX_SESSIONS_PER_USER` | `20` | Sessions actives maximum ; `1000` en test. |
| `SESSION_RETENTION_DAYS` | `30` | Rétention après expiration ou révocation. |
| `AUTH_PROXY_SECRET` | vide | Secret partagé avec le proxy Vercel pour faire confiance à `X-Forwarded-For`. |
| `CLIENT_URL` | requis | Origine frontend autorisée par CORS et `Origin`. |

### Frontend

| Variable | Défaut | Description |
|----------|--------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | API métier et Socket.IO, appelés directement. |
| `VITE_AUTH_API_URL` | même origine en production | Origine du proxy d'authentification (sans `/api/auth`) ; en développement, l'API locale est utilisée. Ne pas viser Render directement en production : le cookie est host-only et `SameSite=Strict`. |

## Déploiement : Option B (proxy Vercel)

Cette option est la configuration actuelle.

1. Le projet Vercel doit avoir **Root Directory = `frontend`** pour que
   `frontend/api/auth/[...path].js` soit déployé comme fonction serverless.
2. Variables Vercel :
   - `API_URL` : URL publique de Render, par exemple
     `https://hei-stdhub-api.onrender.com`.
   - `AUTH_PROXY_SECRET` : valeur aléatoire longue, identique à celle de Render.
   - `VITE_API_URL` : URL publique de Render pour les appels directs et Socket.IO.
3. Variables Render :
   - `CLIENT_URL` : URL Vercel exacte, par exemple
     `https://hei-stdhub.vercel.app`.
   - `AUTH_PROXY_SECRET` : même valeur que sur Vercel.
   - `JWT_ISSUER` et `JWT_AUDIENCE` si vous voulez des valeurs autres que les
     défauts.
4. Le proxy transmet `cookie`, `origin`, `user-agent`, `x-csrf-token` et l'IP
   client. Il ajoute `X-Proxy-Secret`, que Render vérifie avant de lire
   `X-Forwarded-For`.
5. Le cookie reste host-only sur le domaine Vercel et n'est jamais envoyé aux
   appels directs vers Render.

Ne pas exposer `/api/auth/avatar` via le proxy : l'upload d'avatar est un
`multipart/form-data` qui passe par l'API directe avec le Bearer et n'a pas
besoin du cookie.

### Migration future vers des sous-domaines (Option A)

L'objectif est de supprimer la fonction proxy en servant l'API et le frontend
sous un même domaine parent, par exemple `app.example.com` et
`api.example.com`. Il faudra alors :

- configurer `VITE_AUTH_API_URL` vers l'origine d'authentification ;
- ajouter un attribut `Domain=.example.com` au cookie de refresh, actuellement
  host-only, via une nouvelle variable de configuration ;
- étendre `CLIENT_URL` et l'allowlist `Origin` aux deux sous-domaines ;
- conserver `SameSite=Strict` et la protection CSRF.

Tant que le cookie reste host-only, l'Option A ne fonctionnera pas telle quelle :
le cookie posé par `api.example.com` ne serait pas envoyé par
`app.example.com`. C'est pourquoi l'Option B est conservée pour l'instant.

## Flux frontend

1. Au démarrage, `AuthContext` lit `hei_csrf`. S'il est absent, aucun refresh
   n'est tenté et l'utilisateur reste déconnecté.
2. Si le jeton CSRF est présent, `refreshAccessToken()` appelle `/api/auth/refresh`
   avec le cookie. L'access token est stocké en mémoire, l'utilisateur est chargé.
3. Toutes les requêtes API passent par `axios.js`, qui ajoute le Bearer. Sur 401,
   un refresh unique est tenté (`refreshPromise`), puis la requête est rejouée une
   fois.
4. Un timer vérifie toutes les 30 secondes si l'access token expire dans moins de
   90 secondes, et le rafraîchit. Le retour au premier plan déclenche la même
   vérification.
5. Socket.IO utilise `handshake.auth.token`. Sur `auth:expired`, le client
   rafraîchit puis se reconnecte. Sur `session:revoked`, il vide l'état local,
   ferme la socket et redirige vers `/login`.
6. La page Profil liste les sessions et permet de révoquer un appareil. La
   révocation de l'appareil courant redirige vers `/login`.

Aucun access token ni objet utilisateur n'est écrit dans `localStorage`. Le
stockage local ne contient que `hei_csrf`, nécessaire au refresh same-origin.

## Socket.IO

- À la connexion, le serveur vérifie l'access token puis joint automatiquement
  `session:<sid>` et `user:<uid>`.
- Un timer déconnecte la socket à l'expiration de l'access token et émet
  `auth:expired` pour que le client rafraîchisse.
- Les chemins de révocation (`revokeSession`, `revokeAllForUser`,
  `disconnectUser`) émettent `session:revoked` puis déconnectent les sockets
  concernées. La limite de sessions fait de même pour les sessions évincées.
- Le changement de mot de passe déconnecte les sockets sans émettre
  `session:revoked`, afin que l'onglet courant puisse se reconnecter avec le
  nouveau token.
- Les rooms métier (`bde`, etc.) restent contrôlées par le rôle chargé depuis la
  base, pas par le jeton.

## Exploitation

### Vérifier les sessions actives

```sql
SELECT id, user_id, created_at, last_used_at, expires_at, ip, revoked_at, revoked_reason
FROM sessions
WHERE revoked_at IS NULL AND expires_at > NOW()
ORDER BY last_used_at DESC;
```

### Révoquer toutes les sessions d'un utilisateur

Le plus sûr est de changer son rôle ou son mot de passe depuis l'administration,
ce qui révoque les sessions et incrémente `token_version`. En dernier recours :

```sql
UPDATE sessions
SET revoked_at = NOW(), revoked_reason = 'manual'
WHERE user_id = 42 AND revoked_at IS NULL;

UPDATE users SET token_version = token_version + 1 WHERE id = 42;
```

Le cache de session expire au bout de 15 secondes. Pour couper immédiatement
les sockets, préférer l'API d'administration ou `logout-all`.

### Purger manuellement

```bash
cd backend
node -e "require('./services/sessionCleanupJob').purgeExpiredSessions().then(console.log)"
```

### Faire tourner `JWT_SECRET`

Faire tourner `JWT_SECRET` invalide les access tokens en circulation, mais **pas**
les refresh tokens : les sessions restent valides et peuvent émettre de nouveaux
access tokens. Pour déconnecter tout le monde, révoquer aussi les sessions
(par exemple en incrémentant `token_version` de chaque compte).

### Surveiller

- Taux de 401 sur `/api/auth/refresh` : cookies expirés ou vols de refresh.
- Lignes `sessions` avec `revoked_reason='reuse'` : tentative de rejeu.
- Nombre de sessions actives par utilisateur : proche de 20 = appareils
  oubliés ou abus.
- Erreurs 502 du proxy Vercel : Render indisponible ou `API_URL` incorrecte.

## Tests

Les tests backend couvrent les scénarios critiques :

- `backend/test/session.test.js` : claims, cookie, CSRF, rotation, grâce,
  réutilisation, logout, logout global, liste/révocation, changement de mot de
  passe, changement de rôle, purge.
- `backend/test/socket-join-auth.test.js` : rooms liées à l'identité authentifiée
  et déconnexion sur révocation.
- `backend/test/token-revocation.test.js` : `token_version`, rôle lu en base,
  token sans `sid`, algorithmes alternatifs.

Commande :

```bash
cd backend
NODE_ENV=test node node_modules/mocha/bin/mocha.js "test/**/*.test.js"
```

Utiliser Node 20 : Mocha ne démarre pas correctement sous Node 26 avec la
configuration actuelle.

## Limites connues

- Le jeton CSRF est dans `localStorage` : une XSS peut le lire. Le cookie de
  refresh reste `HttpOnly`, mais une XSS peut appeler `/api/auth/refresh` depuis
  la page et obtenir un access token. La défense principale contre la XSS reste
  l'échappement, DOMPurify et une future CSP stricte.
- La fenêtre de grâce de 15 secondes autorise le rejeu de l'ancien refresh token
  pendant ce délai. C'est un compromis assumé pour les onglets multiples.
- Le cache utilisateur de 15 secondes peut retarder la prise en compte d'une
  modification faite directement en base, hors des services applicatifs.
- La révocation prend effet à la requête suivante (le cache de session est vidé)
  et les sockets concernées sont coupées immédiatement. Une révocation faite
  directement en base, hors des services applicatifs, peut rester invisible
  jusqu'à 15 secondes.
- La purge est quotidienne ; les lignes révoquées restent 30 jours pour l'audit.
- Le proxy Vercel ajoute un aller-retour réseau et un démarrage à froid
  supplémentaires aux appels d'authentification.
