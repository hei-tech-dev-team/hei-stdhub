-- Migration pour la fonctionnalité de message de bienvenue sur le profil
-- Permet de configurer le thème et l'activation du message automatique

ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_message_theme TEXT DEFAULT 'simple';
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_message_enabled BOOLEAN DEFAULT FALSE;