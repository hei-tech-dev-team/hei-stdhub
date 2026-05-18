-- Adds customization columns for profile cover and avatar
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cover_border_color VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS avatar_border_color VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS cover_parallax BOOLEAN NULL;
