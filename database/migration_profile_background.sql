-- Migration: add profile_background to users

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_background TEXT NULL;
