-- 1. Mise à jour de la table users pour le stockage direct et la personnalisation
-- On stocke maintenant des chemins/URLs et non plus du binaire
ALTER TABLE users ALTER COLUMN avatar TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN profile_background TYPE VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_border_color VARCHAR(50) DEFAULT 'rgba(255,255,255,0.08)';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_border_color VARCHAR(50) DEFAULT 'rgba(212,175,55,0.6)';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_parallax BOOLEAN DEFAULT TRUE;

-- 2. Création de la table pour les fonds de profil sélectionnables
CREATE TABLE IF NOT EXISTS profile_backgrounds (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,             -- Chemin relatif ou URL (ex: /uploads/backgrounds/bg1.jpg)
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(50),
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Index pour optimiser les performances si la table grandit
CREATE INDEX IF NOT EXISTS idx_users_ref ON users(ref);

-- Note : Pour insérer une image par défaut dans profile_backgrounds, 
-- INSERT INTO profile_backgrounds (file_path, filename, label) VALUES ('/uploads/backgrounds/default.jpg', 'default.jpg', 'Montagne');