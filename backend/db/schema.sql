DROP TABLE IF EXISTS messages    CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS supports    CASCADE;
DROP TABLE IF EXISTS posts       CASCADE;
DROP TABLE IF EXISTS users       CASCADE;

DROP TYPE IF EXISTS user_role   CASCADE;
DROP TYPE IF EXISTS user_level  CASCADE;
DROP TYPE IF EXISTS post_type   CASCADE;
DROP TYPE IF EXISTS submit_type CASCADE;

CREATE TYPE user_role   AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE user_level  AS ENUM ('L1', 'L2', 'L3');
CREATE TYPE post_type   AS ENUM ('cours', 'td', 'examen');
CREATE TYPE submit_type AS ENUM ('TD', 'Examen');

CREATE TABLE users (
  id         SERIAL       PRIMARY KEY,
  ref        VARCHAR(20)  NOT NULL UNIQUE,
  nom        VARCHAR(100) NOT NULL,
  prenom     VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  pseudo     VARCHAR(100) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       user_role    NOT NULL,
  level      user_level   NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_student_level CHECK (
    (role = 'student' AND level IS NOT NULL)
    OR (role IN ('teacher','admin') AND level IS NULL)
  ),
  CONSTRAINT chk_ref_format CHECK (
    (role = 'student' AND ref ~ '^STD[0-9]{5,}$')
    OR (role = 'teacher' AND ref ~ '^PROF[0-9]{3,}$')
    OR (role = 'admin'   AND ref ~ '^ADMIN[0-9]{3,}$')
  ),
  CONSTRAINT chk_student_email CHECK (
    (role = 'student' AND email ~ '^hei\.[a-zA-Z0-9._%+-]+@gmail\.com$')
    OR role IN ('teacher','admin')
  )
);

CREATE TABLE posts (
  id          SERIAL       PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NULL,
  ue          VARCHAR(30)  NOT NULL,
  type        post_type    NOT NULL,
  file_name   VARCHAR(255) NULL,
  file_path   VARCHAR(500) NULL,
  link        VARCHAR(500) NULL,
  author_id   INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_post_source CHECK (
    file_path IS NOT NULL OR link IS NOT NULL
  ),
  CONSTRAINT chk_post_ue CHECK (ue IN (
    'WEB1','WEB2','WEB3',
    'PROG1','PROG2-POO','PROG2-API','PROG3','PROG4','PROG5',
    'SYS1','SYS2','SYS3',
    'DONNEES1','DONNEES2',
    'THEORIE1-P1','THEORIE1-P2',
    'MGT2','IA1','MOB1','SECU1','SECU2'
  ))
);

CREATE TABLE supports (
  id         SERIAL       PRIMARY KEY,
  ue         VARCHAR(30)  NOT NULL,
  label      VARCHAR(255) NOT NULL,
  url        VARCHAR(500) NOT NULL,
  author_id  INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_support_ue CHECK (ue IN (
    'WEB1','WEB2','WEB3',
    'PROG1','PROG2-POO','PROG2-API','PROG3','PROG4','PROG5',
    'SYS1','SYS2','SYS3',
    'DONNEES1','DONNEES2',
    'THEORIE1-P1','THEORIE1-P2',
    'MGT2','IA1','MOB1','SECU1','SECU2'
  )),
  CONSTRAINT chk_support_url CHECK (url ~ '^https?://')
);

CREATE TABLE submissions (
  id         SERIAL       PRIMARY KEY,
  student_id INTEGER      NULL REFERENCES users(id) ON DELETE SET NULL,
  nom        VARCHAR(100) NOT NULL,
  prenom     VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  ref        VARCHAR(20)  NOT NULL,
  level      user_level   NOT NULL,
  groupe     VARCHAR(10)  NOT NULL,
  ue         VARCHAR(30)  NOT NULL,
  type       submit_type  NOT NULL,
  file_name  VARCHAR(255) NULL,
  file_path  VARCHAR(500) NULL,
  link       VARCHAR(500) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_submission_source CHECK (
    file_path IS NOT NULL OR link IS NOT NULL
  ),
  CONSTRAINT chk_groupe_level CHECK (
    (level = 'L1' AND groupe IN ('N1','N2','N3','N4'))
    OR (level = 'L2' AND groupe IN ('K1','K2','K3'))
    OR (level = 'L3' AND groupe IN ('J1','J2'))
  )
);

CREATE TABLE messages (
  id          SERIAL    PRIMARY KEY,
  sender_id   INTEGER   NULL REFERENCES users(id) ON DELETE SET NULL,
  receiver_id INTEGER   NULL REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT      NOT NULL CHECK (content <> ''),
  is_global   BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_message_receiver CHECK (
    (is_global = TRUE  AND receiver_id IS NULL)
    OR (is_global = FALSE AND receiver_id IS NOT NULL)
  ),
  CONSTRAINT chk_no_self_message CHECK (
    sender_id IS NULL OR sender_id <> receiver_id
  )
);

CREATE INDEX idx_posts_ue      ON posts(ue);
CREATE INDEX idx_posts_type    ON posts(type);
CREATE INDEX idx_posts_author  ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_supports_ue   ON supports(ue);
CREATE INDEX idx_subs_student  ON submissions(student_id);
CREATE INDEX idx_subs_ue       ON submissions(ue);
CREATE INDEX idx_subs_type     ON submissions(type);
CREATE INDEX idx_subs_groupe   ON submissions(groupe);
CREATE INDEX idx_msg_global    ON messages(is_global);
CREATE INDEX idx_msg_sender    ON messages(sender_id);
CREATE INDEX idx_msg_receiver  ON messages(receiver_id);
CREATE INDEX idx_msg_created   ON messages(created_at ASC);

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

INSERT INTO users (ref, nom, prenom, email, pseudo, password, role, level) VALUES
  ('ADMIN001', 'Admin', 'HEI', 'admin@hei.mg', 'ADMIN',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'admin', NULL),
  ('STD25001', 'Rafanomezantsoa', 'Ny Fatratra', 'hei.fatratra@gmail.com', '2spicy4uwu',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'student', 'L1');
   ('PROF001','Tester','PROF','tester@gmail.com','PROFTEST','$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi','teacher',NULL)