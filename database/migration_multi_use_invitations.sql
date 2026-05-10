-- Add multi-use support to invitations table
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Set use_count to 1 for codes already used
UPDATE invitations SET use_count = 1 WHERE used = TRUE;

-- Update the specific code: 1000 max uses, expires 2026-05-25
UPDATE invitations
SET max_uses = 1000,
    use_count = 1,
    expires_at = '2026-05-25 23:59:59',
    used = FALSE
WHERE code = 'HEI-STD-9UVRPM';
