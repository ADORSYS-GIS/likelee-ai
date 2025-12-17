
import json
import os

data = {
  "common": {
    "success": { "en": "Success", "fr": "Succès", "es": "Éxito", "de": "Erfolg" },
    "error": { "en": "Error", "fr": "Erreur", "es": "Error", "de": "Fehler" }
  },
  "marketingDashboard": {
    "toasts": {
      "campaignCreated": { "en": "Campaign created successfully!", "fr": "Campagne créée avec succès !", "es": "¡Campaña creada con éxito!", "de": "Kampagne erfolgreich erstellt!" }
    }
  },
  "uploadProject": {
    "toasts": {
      "missingFields": { "en": "Missing Fields", "fr": "Champs manquants", "es": "Campos faltantes", "de": "Fehlende Felder" },
      "missingFieldsDesc": { "en": "Please fill in all required fields", "fr": "Veuillez remplir tous les champs obligatoires", "es": "Complete todos los campos requeridos", "de": "Bitte füllen Sie alle erforderlichen Felder aus" },
      "projectUploaded": { "en": "Project uploaded! (Demo mode - not persisted)", "fr": "Projet téléchargé ! (Mode démo - non enregistré)", "es": "¡Proyecto subido! (Modo demostración - no guardado)", "de": "Projekt hochgeladen! (Demomodus - nicht gespeichert)" }
    }
  },
  "updatePassword": {
    "toasts": {
      "passwordUpdated": { "en": "Your password has been updated.", "fr": "Votre mot de passe a été mis à jour.", "es": "Su contraseña ha sido actualizada.", "de": "Ihr Passwort wurde aktualisiert." }
    }
  },
  "login": {
    "toasts": {
      "signInFailed": { "en": "Sign-in failed", "fr": "Échec de la connexion", "es": "Error de inicio de sesión", "de": "Anmeldung fehlgeschlagen" }
    }
  }
}

paths = {
    "en": "/home/coralie-celine/Projects/likelee/likelee-ai/likelee-ui/src/locales/en.json",
    "fr": "/home/coralie-celine/Projects/likelee/likelee-ai/likelee-ui/src/locales/fr.json",
    "es": "/home/coralie-celine/Projects/likelee/likelee-ai/likelee-ui/src/locales/es.json",
    "de": "/home/coralie-celine/Projects/likelee/likelee-ai/likelee-ui/src/locales/de.json"
}

def deep_update(d, u, lang):
    for k, v in u.items():
        if isinstance(v, dict):
            if lang in v and len(v) <= 4 and all(k in ['en', 'fr', 'es', 'de'] for k in v.keys()):
                 d[k] = v[lang]
            else:
                d[k] = deep_update(d.get(k, {}), v, lang)
        else:
            d[k] = v
    return d

for lang, path in paths.items():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        deep_update(file_data, data, lang)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(file_data, f, ensure_ascii=False, indent=2)
        print(f"✓ Updated {lang}")
    except Exception as e:
        print(f"✗ Error updating {lang}: {e}")
