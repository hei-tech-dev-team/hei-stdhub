-- Table invitations pour le register sur invitation
CREATE TABLE IF NOT EXISTS invitations (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(20) UNIQUE NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('student','teacher','alumni')),
  used        BOOLEAN DEFAULT FALSE,
  used_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMP NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);