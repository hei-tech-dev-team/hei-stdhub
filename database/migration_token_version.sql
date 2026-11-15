-- Server-side JWT revocation: tokens carry `tv`; bumping token_version
-- (password change/reset, forced logout) invalidates every older token.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
