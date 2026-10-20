-- Migration : suppression du système de niveaux L1/L2/L3
-- À exécuter APRÈS migration_remove_alumni.sql et AVANT le déploiement
-- du backend sans niveaux.
-- Rejouable : s'arrête à la première erreur (psql -v ON_ERROR_STOP=1).
--
-- Note : la table custom_ues conserve sa colonne level (VARCHAR) — domain
-- archive, supprimé séparément. La table submissions (submit_type,
-- user_level) a déjà été droppée par migration_refactor_td_exams.sql.
BEGIN;

-- 1. La contrainte référence le type enum et doit sauter avant son DROP
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_level;

-- 2. La colonne level de users disparaît (tout le monde est "étudiant",
--    sans distinction de niveau)
ALTER TABLE users DROP COLUMN IF EXISTS level;

-- 3. Les annonces ne ciblent plus de niveau : elles sont visibles par tous
ALTER TABLE announcements DROP COLUMN IF EXISTS target_level;

-- 4. Suppression du type enum (Postgres ne sait pas DROP VALUE)
DROP TYPE IF EXISTS user_level;

COMMIT;
