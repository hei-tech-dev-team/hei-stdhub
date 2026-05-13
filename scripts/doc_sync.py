import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

IGNORE_DIRS = {'node_modules', 'dist', '.git', 'uploads', 'test', 'scripts', '__pycache__', '.venv'}

DOC_MAPPINGS = {
    "FOR_BACK_DEV.md": {
        "source_dirs": ["backend"],
        "extensions": {'.js', '.sql', '.ts'},
        "prompt_type": "backend",
        "description": "Backend, routes, API, services"
    },
    "FOR_FRONT_DEV.md": {
        "source_dirs": ["frontend"],
        "extensions": {'.jsx', '.js', '.tsx', '.ts', '.css'},
        "prompt_type": "frontend",
        "description": "Frontend, composants, pages, styles"
    },
    "FOR_DB_SCHEMA.md": {
        "source_dirs": ["backend"],
        "extensions": {'.sql'},
        "prompt_type": "database",
        "description": "Schéma de base de données"
    },
}

PROMPTS = {
    "backend": """Tu es un archiviste technique rigoureux. Ta mission est de synchroniser le fichier documentation avec le code source du backend fourni.

### RÈGLES D'OR (NE PAS TRANSGRESSER) :
1. INTERDICTION DE SUPPRIMER : Ne supprime aucune route, aucun paramètre ou aucune table SQL existante.
2. INTÉGRITÉ : Si une route est déjà documentée et qu'elle n'a pas changé, RECOPIE-LA à l'identique.
3. AJOUTS : Identifie les nouvelles fonctions, middlewares ou routes et insère-les.
4. FORMAT : Conserve strictement le format @route, @middleware, @param, @returns, @status.
5. STRUCTURE : Respecte l'ordre actuel (Entry Point, Routes, Services, Database Schema).

### CODE SOURCE :
{code_content}""",

    "frontend": """Tu es un archiviste technique rigoureux. Ta mission est de synchroniser la documentation avec le code source frontend fourni.

### RÈGLES D'OR :
1. INTERDICTION DE SUPPRIMER : Ne supprime aucun composant ou page documentée.
2. INTÉGRITÉ : Si un composant est documenté et inchangé, RECOPIE-LE à l'identique.
3. AJOUTS : Identifie les nouveaux composants, pages et insère-les.
4. FORMAT : Conserve @component, @props, @returns, @usage.
5. STRUCTURE : Respecte l'organisation (Components, Pages, Hooks, Styles).

### CODE SOURCE :
{code_content}""",

    "database": """Tu es un archiviste technique. Ta mission est de documenter le schéma de base de données.

### RÈGLES D'OR :
1. INTÉGRITÉ : Préserve les tables et colonnes existantes documentées.
2. AJOUTS : Ajoute les nouvelles tables et colonnes.
3. FORMAT : @table, @column, @type, @constraints, @relationships.
4. COMPLÉTUDE : Documente clés primaires, étrangères et index.

### CODE SQL SOURCE :
{code_content}"""
}

def get_codebase(source_dirs, extensions):
    """Récupère le code source pertinent."""
    context = ""
    total_files = 0

    for source_dir in source_dirs:
        target_dir = BASE_DIR / source_dir
        if not target_dir.exists():
            print(f"  ⚠️  Répertoire introuvable: {target_dir}")
            continue

        for path in target_dir.rglob('*'):
            if path.is_file() and path.suffix in extensions:
                if any(ignore in path.parts for ignore in IGNORE_DIRS):
                    continue
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        rel_path = path.relative_to(BASE_DIR)
                        context += f"\n\n--- FILE: {rel_path} ---\n{f.read()}"
                        total_files += 1
                except Exception as e:
                    print(f"  ❌ Erreur lecture {path.relative_to(BASE_DIR)}: {e}")

    return context, total_files

def sync_documentation(code_content, prompt_type):
    """Synchronise la documentation via IA."""
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = PROMPTS.get(prompt_type, PROMPTS["backend"])
    response = model.generate_content(prompt.format(code_content=code_content))
    return response.text

def main():
    print("=" * 60)
    print("🔄 DOC SYNC - Synchronisation automatique des FOR_*.md")
    print("=" * 60)

    results = []

    for doc_file, config in DOC_MAPPINGS.items():
        doc_path = BASE_DIR / doc_file

        print(f"\n📄 Traitement de {doc_file}...")
        print(f"   {config['description']}")
        print(f"   Répertoires: {', '.join(config['source_dirs'])}")

        code_base, file_count = get_codebase(
            config["source_dirs"],
            config["extensions"]
        )

        if not code_base:
            print(f"  ⚠️  Aucun code source trouvé")
            results.append((doc_file, "⚠️ Aucun code"))
            continue

        print(f"  ✓ {file_count} fichiers analysés")

        try:
            print(f"  🔄 Synchronisation via IA...")
            updated_md = sync_documentation(code_base, config["prompt_type"])

            with open(doc_path, "w", encoding="utf-8") as f:
                f.write(updated_md)

            print(f"  ✅ {doc_file} mis à jour avec succès")
            results.append((doc_file, f"✅ {file_count} fichiers"))

        except Exception as e:
            print(f"  ❌ Erreur: {e}")
            results.append((doc_file, f"❌ {str(e)[:30]}"))

    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    for doc_file, status in results:
        print(f"{status} → {doc_file}")
    print("=" * 60)

if __name__ == "__main__":
    main()
