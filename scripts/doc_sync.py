import os
import subprocess
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
    "backend": """Tu es un archiviste technique rigoureux. Ta mission est de mettre à jour le fichier de documentation backend en fonction des changements détectés.
 
### RÈGLES D'OR (NE PAS TRANSGRESSER) :
1. INTERDICTION DE SUPPRIMER : Ne supprime aucune route, aucun paramètre ou aucune table SQL existante sauf si elle apparaît dans le diff comme supprimée (ligne préfixée par '-').
2. INTÉGRITÉ : Si une route est déjà documentée et qu'elle n'a pas changé, RECOPIE-LA à l'identique.
3. AJOUTS : Identifie les nouvelles fonctions, middlewares ou routes (lignes préfixées par '+') et insère-les.
4. FORMAT : Conserve strictement le format @route, @middleware, @param, @returns, @status.
5. STRUCTURE : Respecte l'ordre actuel (Entry Point, Routes, Services, Database Schema).
 
### DOCUMENTATION ACTUELLE :
{current_doc}
 
### DIFF GIT (uniquement les changements) :
{diff_content}""",
 
    "frontend": """Tu es un archiviste technique rigoureux. Ta mission est de mettre à jour la documentation frontend en fonction des changements détectés.
 
### RÈGLES D'OR :
1. INTERDICTION DE SUPPRIMER : Ne supprime aucun composant ou page documentée sauf si supprimé dans le diff (ligne '-').
2. INTÉGRITÉ : Si un composant est documenté et inchangé, RECOPIE-LE à l'identique.
3. AJOUTS : Identifie les nouveaux composants, pages (lignes '+') et insère-les.
4. FORMAT : Conserve @component, @props, @returns, @usage.
5. STRUCTURE : Respecte l'organisation (Components, Pages, Hooks, Styles).
 
### DOCUMENTATION ACTUELLE :
{current_doc}
 
### DIFF GIT (uniquement les changements) :
{diff_content}""",
 
    "database": """Tu es un archiviste technique. Ta mission est de mettre à jour la documentation du schéma de base de données.
 
### RÈGLES D'OR :
1. INTÉGRITÉ : Préserve les tables et colonnes existantes documentées sauf si supprimées dans le diff.
2. AJOUTS : Ajoute les nouvelles tables et colonnes (lignes '+').
3. FORMAT : @table, @column, @type, @constraints, @relationships.
4. COMPLÉTUDE : Documente clés primaires, étrangères et index.
 
### DOCUMENTATION ACTUELLE :
{current_doc}
 
### DIFF GIT SQL (uniquement les changements) :
{diff_content}"""
}
 
 
def get_changed_files(base_ref: str = "HEAD") -> set[str]:
    """
    Retourne l'ensemble des fichiers modifiés (staged + unstaged + untracked)
    par rapport à base_ref.
    """
    changed = set()
 
    def _run(cmd):
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
        if result.returncode == 0:
            return result.stdout.strip().splitlines()
        return []
 
    changed.update(_run(["git", "diff", "--name-only", base_ref]))

    changed.update(_run(["git", "diff", "--name-only", "--cached", base_ref]))

    changed.update(_run(["git", "ls-files", "--others", "--exclude-standard"]))
 
    return {f for f in changed if f}
 
 
def get_diff_for_files(file_paths: list[str], base_ref: str = "HEAD") -> str:
    """
    Retourne le diff git combiné pour une liste de fichiers.
    Inclut les fichiers non trackés en lisant leur contenu directement.
    """
    if not file_paths:
        return ""
 
    diff_parts = []
 
    for fp in file_paths:
        full_path = BASE_DIR / fp
 
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", fp],
            capture_output=True, cwd=BASE_DIR
        )
        if result.returncode != 0:
            if full_path.exists():
                try:
                    content = full_path.read_text(encoding="utf-8")
                    lines = "\n".join(f"+{l}" for l in content.splitlines())
                    diff_parts.append(f"--- /dev/null\n+++ b/{fp}\n{lines}")
                except Exception:
                    pass
            continue
 
        for cmd in [
            ["git", "diff", base_ref, "--", fp],
            ["git", "diff", "--cached", base_ref, "--", fp],
        ]:
            r = subprocess.run(cmd, capture_output=True, text=True, cwd=BASE_DIR)
            if r.returncode == 0 and r.stdout.strip():
                diff_parts.append(r.stdout.strip())
 
    return "\n\n".join(diff_parts)
 
 
def is_ignored(filepath: str) -> bool:
    """Vérifie si le chemin contient un répertoire ignoré."""
    parts = Path(filepath).parts
    return any(ign in parts for ign in IGNORE_DIRS)
 
 
def find_relevant_docs(changed_files: set[str]) -> dict[str, list[str]]:
    """
    Pour chaque doc_file, retourne la liste des fichiers modifiés qui lui sont pertinents.
    """
    relevant: dict[str, list[str]] = {}
 
    for doc_file, config in DOC_MAPPINGS.items():
        matched = []
        for cf in changed_files:
            if is_ignored(cf):
                continue
            cf_path = Path(cf)
            if cf_path.suffix not in config["extensions"]:
                continue
            if any(cf_path.parts[0] == src_dir for src_dir in config["source_dirs"]):
                matched.append(cf)
        if matched:
            relevant[doc_file] = matched
 
    return relevant
 
 
def read_current_doc(doc_path: Path) -> str:
    """Lit la documentation existante, ou retourne une chaîne vide."""
    if doc_path.exists():
        try:
            return doc_path.read_text(encoding="utf-8")
        except Exception:
            return ""
    return "*(Documentation non encore créée)*"
 
 
def sync_documentation(current_doc: str, diff_content: str, prompt_type: str) -> str:
    """Envoie le diff + doc actuelle à l'IA et retourne la doc mise à jour."""
    model = genai.GenerativeModel('models/gemini-2.5-flash')
    prompt_template = PROMPTS.get(prompt_type, PROMPTS["backend"])
    prompt = prompt_template.format(
        current_doc=current_doc,
        diff_content=diff_content,
    )
    response = model.generate_content(prompt)
    return response.text
 
 
def main():
    print("=" * 60)
    print("DOC SYNC — Synchronisation par git diff")
    print("=" * 60)
 
    changed_files = get_changed_files()
    if not changed_files:
        print("\nAucun fichier modifié détecté. Documentation déjà à jour.")
        return
 
    print(f"\n{len(changed_files)} fichier(s) modifié(s) détecté(s).")
 
    relevant_docs = find_relevant_docs(changed_files)
    if not relevant_docs:
        print("Aucune modification ne concerne les docs surveillées.")
        return
 
    results = []
 
    for doc_file, matched_files in relevant_docs.items():
        config = DOC_MAPPINGS[doc_file]
        doc_path = BASE_DIR / doc_file
 
        print(f"\n{'─' * 50}")
        print(f"  {doc_file}  ({config['description']})")
        print(f"  Fichiers concernés ({len(matched_files)}) :")
        for mf in matched_files:
            print(f"    · {mf}")
 
        diff_content = get_diff_for_files(matched_files)
        if not diff_content.strip():
            print("  Diff vide, aucune mise à jour nécessaire.")
            results.append((doc_file, "Diff vide — ignoré"))
            continue
 
        current_doc = read_current_doc(doc_path)
 
        try:
            print("  Synchronisation via IA...")
            updated_md = sync_documentation(current_doc, diff_content, config["prompt_type"])
            doc_path.write_text(updated_md, encoding="utf-8")
            print(f"  ✓ {doc_file} mis à jour")
            results.append((doc_file, f"OK — {len(matched_files)} fichier(s)"))
        except Exception as e:
            print(f"  ✗ Erreur : {e}")
            results.append((doc_file, f"ERREUR {str(e)[:50]}"))
 
    print(f"\n{'=' * 60}")
    print("RÉSUMÉ")
    print("=" * 60)
    for doc_file, status in results:
        print(f"  {status:<35} → {doc_file}")
    print("=" * 60)
 
 
if __name__ == "__main__":
    main()
 
