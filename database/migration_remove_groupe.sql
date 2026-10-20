-- Migration : suppression du concept de groupe (lettres G, H, J, K, N…)
-- À exécuter APRÈS migration_remove_alumni.sql et
-- migration_remove_levels.sql, AVANT le déploiement du backend sans groupe.
-- Rejouable : s'arrête à la première erreur (psql -v ON_ERROR_STOP=1).
BEGIN;

ALTER TABLE users DROP COLUMN IF EXISTS groupe;

COMMIT;
