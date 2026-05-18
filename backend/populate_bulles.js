const fs = require('fs-extra');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { pool: db } = require('./db'); 

// Configuration des chemins
const SOURCE_DIR = path.resolve(__dirname, '../frontend/src/assets/bulles');
const TARGET_DIR = path.resolve(__dirname, 'uploads/bulles');

async function populateBubbles() {
    try {
        // 1. S'assurer que le dossier de destination existe
        await fs.ensureDir(TARGET_DIR);

        // 2. Nettoyage
        console.log('Nettoyage de la bibliothèque de bulles...');
        await db.query('DELETE FROM welcome_bubbles');
        await fs.emptyDir(TARGET_DIR); 

        // 3. Vérification du dossier source
        if (!await fs.pathExists(SOURCE_DIR)) {
            console.error(`Erreur : Dossier source introuvable : ${SOURCE_DIR}`);
            return;
        }

        // 4. Lecture des fichiers
        const files = await fs.readdir(SOURCE_DIR);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext);
        });

        if (imageFiles.length === 0) {
            console.log('Aucune image trouvée dans frontend/src/assets/bulles');
            return;
        }

        console.log(`Importation de ${imageFiles.length} bulles...`);

        for (const file of imageFiles) {
            const sourcePath = path.join(SOURCE_DIR, file);
            const targetPath = path.join(TARGET_DIR, file);
            const relativePath = `/uploads/bulles/${file}`;
            const label = path.parse(file).name.replace(/[-_]/g, ' ');

            // Copie physique vers le backend
            await fs.copy(sourcePath, targetPath);

            // Enregistrement en base de données
            await db.query(
                'INSERT INTO welcome_bubbles (file_path, filename, label) VALUES ($1, $2, $3)',
                [relativePath, file, label]
            );
            console.log(`[OK] ${file}`);
        }

        console.log('Bibliothèque de bulles mise à jour avec succès !');
    } catch (error) {
        console.error('Erreur lors de la population des bulles :', error);
    } finally {
        if (db && typeof db.end === 'function') {
            await db.end();
        }
    }
}

populateBubbles();