# Guide : Créer les issues GitHub automatiquement

Ce guide vous explique comment utiliser le script automatique pour créer les 7 issues du système de règles de cotisations.

## 📋 Étape 1 : Créer un token GitHub

1. **Aller sur GitHub** : https://github.com/settings/tokens

2. **Cliquer sur "Generate new token"** puis **"Generate new token (classic)"**

3. **Configurer le token** :
   - **Note** : `OpenPayFit Issues Creator`
   - **Expiration** : 7 days (vous pouvez choisir plus long)
   - **Permissions** : Cocher **`repo`** (Full control of private repositories)

4. **Cliquer sur "Generate token"** en bas de la page

5. **Copier le token** (il commence par `ghp_...`)
   ⚠️ **Important** : Vous ne pourrez plus voir ce token après avoir quitté la page !

## 🚀 Étape 2 : Exécuter le script

### Option A : Avec variable d'environnement (recommandé)

```bash
# Depuis la racine du projet OpenPayFit
GITHUB_TOKEN=ghp_votre_token_ici node scripts/creer-issues-github.js
```

**Exemple** :
```bash
GITHUB_TOKEN=ghp_abc123def456 node scripts/creer-issues-github.js
```

### Option B : Avec fichier .env

```bash
# 1. Copier l'exemple
cp .env.example.issues .env

# 2. Éditer .env et remplacer 'ghp_votre_token_github_ici' par votre vrai token
nano .env  # ou vim, code, etc.

# 3. Charger les variables d'environnement et exécuter
export $(cat .env | xargs) && node scripts/creer-issues-github.js
```

## 📊 Résultat attendu

Vous devriez voir :

```
🚀 Création des issues GitHub pour le système de règles de cotisations

Repository: ambroise-leclerc/OpenPayFit

[1/7] Traitement de 01-schema-donnees.md...
  📝 Titre: [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales
  🏷️  Labels: enhancement, database, payroll, high-priority
  ✅ Issue créée: #15
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/15

[2/7] Traitement de 02-dsl-yaml.md...
  📝 Titre: [FEATURE] Créer un DSL pour décrire les règles de cotisations
  🏷️  Labels: enhancement, payroll, high-priority
  ✅ Issue créée: #16
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/16

[3/7] Traitement de 03-api-gestion.md...
  📝 Titre: [FEATURE] API de gestion des règles de cotisations
  🏷️  Labels: enhancement, api, payroll, high-priority
  ✅ Issue créée: #17
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/17

[4/7] Traitement de 04-moteur-calcul.md...
  📝 Titre: [FEATURE] Moteur de calcul des cotisations
  🏷️  Labels: enhancement, payroll, high-priority, breaking-change
  ✅ Issue créée: #18
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/18

[5/7] Traitement de 05-interface-admin.md...
  📝 Titre: [FEATURE] Interface d'administration des règles de cotisations
  🏷️  Labels: enhancement, frontend, payroll, admin, medium-priority
  ✅ Issue créée: #19
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/19

[6/7] Traitement de 06-donnees-france-2024.md...
  📝 Titre: [FEATURE] Données de référence françaises pour 2024-2025
  🏷️  Labels: data, payroll, france, medium-priority
  ✅ Issue créée: #20
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/20

[7/7] Traitement de 07-migration-module-paie.md...
  📝 Titre: [FEATURE] Migration du module de paie vers le nouveau système de règles
  🏷️  Labels: enhancement, payroll, breaking-change, high-priority
  ✅ Issue créée: #21
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/21

═══════════════════════════════════════════════════════════
✨ Toutes les issues ont été créées avec succès!

1. #15 - [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales
   https://github.com/ambroise-leclerc/OpenPayFit/issues/15

2. #16 - [FEATURE] Créer un DSL pour décrire les règles de cotisations
   https://github.com/ambroise-leclerc/OpenPayFit/issues/16

3. #17 - [FEATURE] API de gestion des règles de cotisations
   https://github.com/ambroise-leclerc/OpenPayFit/issues/17

4. #18 - [FEATURE] Moteur de calcul des cotisations
   https://github.com/ambroise-leclerc/OpenPayFit/issues/18

5. #19 - [FEATURE] Interface d'administration des règles de cotisations
   https://github.com/ambroise-leclerc/OpenPayFit/issues/19

6. #20 - [FEATURE] Données de référence françaises pour 2024-2025
   https://github.com/ambroise-leclerc/OpenPayFit/issues/20

7. #21 - [FEATURE] Migration du module de paie vers le nouveau système de règles
   https://github.com/ambroise-leclerc/OpenPayFit/issues/21

═══════════════════════════════════════════════════════════

📋 Prochaines étapes:
  1. Vérifier les issues créées sur GitHub
  2. Ajuster l'ordre ou les priorités si nécessaire
  3. Assigner les issues aux développeurs
  4. Créer un projet GitHub pour suivre l'avancement

🎯 Bon développement!
```

## ❌ Résolution des problèmes

### Erreur : "GITHUB_TOKEN non défini"

```
❌ Erreur: GITHUB_TOKEN non défini
```

**Solution** : Vous n'avez pas passé le token. Utilisez :
```bash
GITHUB_TOKEN=votre_token node scripts/creer-issues-github.js
```

### Erreur HTTP 401 : "Bad credentials"

```
❌ Erreur: Erreur HTTP 401: {"message":"Bad credentials"...}
```

**Causes possibles** :
- Le token est invalide ou expiré
- Le token a été copié incorrectement (espaces en trop, etc.)

**Solution** : Créer un nouveau token et réessayer

### Erreur HTTP 403 : "Forbidden"

```
❌ Erreur: Erreur HTTP 403: {"message":"Forbidden"...}
```

**Cause** : Le token n'a pas la permission `repo`

**Solution** : Créer un nouveau token et cocher la permission `repo`

### Erreur HTTP 404 : "Not Found"

```
❌ Erreur: Erreur HTTP 404: {"message":"Not Found"...}
```

**Causes possibles** :
- Le repository n'existe pas
- Vous n'avez pas accès au repository
- Le nom du repository est incorrect dans le script

**Solution** : Vérifier que vous avez accès à `ambroise-leclerc/OpenPayFit`

### Node.js trop ancien

```
ReferenceError: fetch is not defined
```

**Cause** : Node.js < 18 (fetch n'est pas disponible)

**Solution** : Mettre à jour Node.js vers la version 18 ou supérieure
```bash
node --version  # Vérifier la version
```

## 🔒 Sécurité

### Après avoir créé les issues

1. **Révoquer le token** (recommandé) :
   - Aller sur https://github.com/settings/tokens
   - Trouver votre token "OpenPayFit Issues Creator"
   - Cliquer sur "Delete"

2. **Ou garder le token** pour une utilisation future :
   - Le stocker dans un gestionnaire de mots de passe
   - **Ne jamais le committer dans Git**
   - Le fichier `.env` est dans `.gitignore` pour éviter cela

### Bonnes pratiques

✅ **À faire** :
- Utiliser un token avec le minimum de permissions nécessaires (`repo` uniquement)
- Définir une expiration courte (7 jours)
- Révoquer le token après utilisation
- Ne jamais partager le token

❌ **À ne pas faire** :
- Committer le token dans Git
- Partager le token par email ou chat
- Utiliser un token personnel pour des scripts publics
- Donner plus de permissions que nécessaire

## 📚 Références

- [Documentation API GitHub - Issues](https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#create-an-issue)
- [Créer un token GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Bonnes pratiques de sécurité](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifier les erreurs ci-dessus
2. Lire la documentation dans `scripts/README.md`
3. Vérifier les logs d'erreur détaillés
4. Ouvrir une issue sur GitHub

---

**Bonne création d'issues ! 🚀**
