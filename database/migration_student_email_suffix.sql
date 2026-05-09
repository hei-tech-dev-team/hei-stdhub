ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_student_email;
ALTER TABLE users ADD CONSTRAINT chk_student_email CHECK (
  (role = 'student' AND email ~ '^hei\.[a-zA-Z0-9._%+-]+(\.\d+)?@gmail\.com$')
  OR role IN ('teacher','admin','bde')
);
