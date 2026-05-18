-- Migration pour la bibliothèque de bulles de bienvenue
CREATE TABLE IF NOT EXISTS welcome_bubbles (
    id SERIAL PRIMARY KEY,
    file_path TEXT NOT NULL,             -- Chemin relatif (ex: /uploads/bulles/bubble1.png)
    filename VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ajout de la référence de la bulle choisie dans la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bubble_url TEXT NULL;