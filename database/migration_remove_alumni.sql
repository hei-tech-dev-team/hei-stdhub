-- Migration : suppression du rôle alumni
-- À exécuter AVANT le déploiement du backend sans alumni.
-- Rejouable : s'arrête à la première erreur (psql -v ON_ERROR_STOP=1).
BEGIN;

-- 0. Rattrapage idempotent (schema.sql était désynchronisé de la prod)
CREATE TABLE IF NOT EXISTS invitations (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20) UNIQUE NOT NULL,
  role       VARCHAR(20) NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  used_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  max_uses   INTEGER DEFAULT 1,
  use_count  INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titre         VARCHAR(255) NOT NULL,
  contenu       TEXT NOT NULL,
  anonyme       BOOLEAN NOT NULL DEFAULT FALSE,
  statut        VARCHAR(20) NOT NULL DEFAULT 'recu',
  justification TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id INTEGER NULL
  REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS message_reactions (
  id         SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

-- 1. Les contraintes qui référencent l'enum doivent sauter avant le swap
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_level;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_ref_format;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_email;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_email_format;

-- 2. Les alumni deviennent des étudiants comme les autres
--    (la migration suivante, migration_remove_levels.sql, supprime la
--     colonne level : chk_student_level n'est donc pas recréée ici)
UPDATE users SET role = 'student', level = 'L3' WHERE role = 'alumni';

-- 3. Suppression des données alumni
DELETE FROM push_notifications WHERE type = 'alumni_tip';
DROP TABLE IF EXISTS alumni_tip_reactions;
DROP TABLE IF EXISTS alumni_spotlight;

DELETE FROM invitations WHERE role = 'alumni';
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations
  ADD CONSTRAINT invitations_role_check CHECK (role IN ('student','teacher'));

-- 4. Swap de l'enum (Postgres ne sait pas DROP VALUE)
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('student','teacher','admin','bde','developer');
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
DROP TYPE user_role_old;

-- 5. Contraintes sans alumni
--    Le format hei.*@gmail.com des étudiants passe côté backend
--    (les anciens alumni n'y correspondent pas).
ALTER TABLE users ADD CONSTRAINT chk_email_format CHECK (
  email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
);

COMMIT;
