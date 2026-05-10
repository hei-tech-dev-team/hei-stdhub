-- Add alumni and bde to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bde';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'alumni';

-- Update chk_student_level to allow bde (with level) and alumni (without level)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_level;
ALTER TABLE users ADD CONSTRAINT chk_student_level CHECK (
  (role IN ('student', 'bde') AND level IS NOT NULL)
  OR (role IN ('teacher','admin','alumni') AND level IS NULL)
);

-- Update chk_ref_format to allow alumni and bde (same STD format as students)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_ref_format;
ALTER TABLE users ADD CONSTRAINT chk_ref_format CHECK (
  (role IN ('student', 'alumni', 'bde') AND ref ~ '^STD[0-9]{5,}$')
  OR (role = 'teacher' AND ref ~ '^PROF[0-9]{3,}$')
  OR (role = 'admin'   AND ref ~ '^ADMIN[0-9]{3,}$')
);

-- Update chk_student_email to allow alumni and bde
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_email;
ALTER TABLE users ADD CONSTRAINT chk_student_email CHECK (
  (role = 'student' AND email ~ '^hei\.[a-zA-Z0-9._%+-]+(\.\d+)?@gmail\.com$')
  OR role IN ('teacher','admin','bde','alumni')
);

-- Update invitations role check to allow alumni
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('student','teacher','alumni'));
