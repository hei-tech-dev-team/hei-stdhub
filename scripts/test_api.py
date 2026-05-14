import os
import google.generativeai as genai
from dotenv import load_dotenv

# Charger le .env depuis la racine
load_dotenv()

# Configuration du client
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

try:
    print("=== Diagnostic Gemini API ===\n")
    
    # 1. Lister les modèles disponibles
    print("1️⃣ Modèles disponibles :")
    models = genai.list_models()
    available_models = []
    for model in models:
        if 'generateContent' in model.supported_generation_methods:
            model_name = model.name.replace('models/', '')
            available_models.append(model_name)
            print(f"  - {model_name}")
    
    if not available_models:
        print("  ❌ Aucun modèle trouvé !")
    
    print("\n2️⃣ Test de génération de contenu :")
    
    # 2. Utiliser gemini-2.5-flash
    model_to_use = 'gemini-2.5-flash'
    
    print(f"  Utilisation du modèle : {model_to_use}")
    
    model = genai.GenerativeModel(model_to_use)
    response = model.generate_content("Réponds uniquement : Connexion réussie.")
    
    if response.text:
        print(f"✅ Résultat : {response.text}")
    else:
        print("⚠️ L'IA a répondu mais le texte est vide.")

except Exception as e:
    print(f"❌ Erreur détectée : {e}")
    print("\n--- Diagnostic ---")
    print(f"Clé API présente : {'Oui' if os.getenv('GOOGLE_API_KEY') else 'Non'}")
    print(f"Type d'erreur : {type(e).__name__}")