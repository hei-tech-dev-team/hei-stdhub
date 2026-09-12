-- Add developer to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';

-- Update chk_student_level to allow developer (without level)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_level;
ALTER TABLE users ADD CONSTRAINT chk_student_level CHECK (
  (role IN ('student', 'bde') AND level IS NOT NULL)
  OR (role IN ('teacher','admin','alumni','developer') AND level IS NULL)
);

-- Update chk_ref_format to allow developer (DEV format)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_ref_format;
ALTER TABLE users ADD CONSTRAINT chk_ref_format CHECK (
  (role IN ('student', 'alumni', 'bde') AND ref ~ '^STD[0-9]{5,}$')
  OR (role = 'teacher'   AND ref ~ '^PROF[0-9]{3,}$')
  OR (role = 'admin'     AND ref ~ '^ADMIN[0-9]{3,}$')
  OR (role = 'developer' AND ref ~ '^DEV[0-9]{3,}$')
);

-- Update chk_student_email to allow developer (any email format)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_email;
ALTER TABLE users ADD CONSTRAINT chk_student_email CHECK (
  (role = 'student' AND email ~ '^hei\.[a-zA-Z0-9._%+-]+(\.\d+)?@gmail\.com$')
  OR role IN ('teacher','admin','bde','alumni','developer')
);

-- Create bug_reports table if not exists (used by developer for bug tracking)
CREATE TABLE IF NOT EXISTS bug_reports (
  id          SERIAL       PRIMARY KEY,
  reporter_id INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT         NOT NULL,
  page        VARCHAR(255) NULL,
  severity    VARCHAR(20)  NOT NULL DEFAULT 'medium',
  status      VARCHAR(20)  NOT NULL DEFAULT 'open',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP    NULL
);
