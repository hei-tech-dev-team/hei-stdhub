-- ============================================================================
-- DEV / TEST SEED ONLY — NEVER RUN THIS AGAINST PRODUCTION.
--
-- Creates well-known accounts (ADMIN001, STD25001, PROF001, DEV001) that all
-- share the publicly documented password "password". On a production database
-- these accounts are a backdoor (DEV001 is a hidden, platform-wide superuser).
--
-- Usage (local/CI):
--   psql "$DATABASE_URL" -f backend/db/schema.sql
--   psql "$DATABASE_URL" -f backend/db/seed.dev.sql
-- ============================================================================

INSERT INTO users (ref, nom, prenom, email, pseudo, password, role) VALUES
  ('ADMIN001', 'Admin', 'HEI', 'stdhub.admin@gmail.com', 'ADMIN',
   '$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji', 'admin'),
  ('STD25001', 'Rafanomezantsoa', 'Ny Fatratra', 'hei.fatratra@gmail.com', '2spicy4uwu',
   '$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji', 'student'),
  ('PROF001','Tester','PROF','tester@gmail.com','PROFTEST',
   '$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji','teacher'),
  ('DEV001','Developer','HEI','hei.dev@gmail.com','DEV',
   '$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji','developer');
