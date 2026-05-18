const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); // Le .env est dans le même dossier
const { pool: db } = require('./db'); // On importe le pool directement

// Chemin vers le dossier des images sources dans le frontend
const SOURCE_DIR = path.resolve(__dirname, '../frontend/src/assets/heiSTDhub');
// Chemin vers le dossier de destination des images statiques dans le backend
const TARGET_DIR = path.resolve(__dirname, 'uploads/backgrounds');

async function populateBackgrounds() {
    try {
        // Assure que le dossier de destination existe
        await fs.ensureDir(TARGET_DIR);

        // Efface les fonds de profil existants de la DB et du dossier cible
        console.log('Effacement des fonds de profil existants...');
        await db.query('DELETE FROM profile_backgrounds');
        await fs.emptyDir(TARGET_DIR); // Vide le dossier, mais ne le supprime pas
        console.log('Fonds de profil existants effacés.');

        const files = await fs.readdir(SOURCE_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        });

        if (imageFiles.length === 0) {
            console.log('Aucun fichier image trouvé dans le répertoire source.');
            return;
        }

        console.log(`Trouvé ${imageFiles.length} fichiers image. Population de la base de données...`);

        for (const file of imageFiles) {
            const sourcePath = path.join(SOURCE_DIR, file);
            const targetPath = path.join(TARGET_DIR, file);
            const relativePath = `/uploads/backgrounds/${file}`; // Chemin accessible via l'URL statique
            const mimeType = mime.lookup(file) || 'application/octet-stream'; // Détecte le type MIME
            const label = path.parse(file).name.replace(/[-_]/g, ' '); // Génère un label à partir du nom de fichier

            await fs.copy(sourcePath, targetPath); // Copie le fichier

            await db.query(
                'INSERT INTO profile_backgrounds (file_path, filename, mime_type, label) VALUES ($1, $2, $3, $4)',
                [relativePath, file, mimeType, label]
            );
            console.log(`Inséré : ${file}`);
        }

        console.log('Fonds de profil peuplés avec succès !');
    } catch (error) {
        console.error('Erreur lors du peuplement des fonds de profil :', error);
    } finally {
        // Termine la connexion à la base de données si nécessaire
        if (db && typeof db.end === 'function') {
            await db.end();
            console.log('Pool de base de données terminé.');
        }
    }
}

populateBackgrounds();