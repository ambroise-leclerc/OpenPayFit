# Guide Utilisateur DSN - OpenPayFit

## Table des matières

1. [Introduction](#introduction)
2. [Qu'est-ce que la DSN ?](#quest-ce-que-la-dsn)
3. [Prérequis](#prérequis)
4. [Configurer votre entreprise](#configurer-votre-entreprise)
5. [Générer une DSN](#générer-une-dsn)
6. [Télécharger et transmettre la DSN](#télécharger-et-transmettre-la-dsn)
7. [Résolution des problèmes](#résolution-des-problèmes)
8. [Questions fréquentes](#questions-fréquentes)

---

## Introduction

OpenPayFit vous permet de générer automatiquement vos **Déclarations Sociales Nominatives (DSN)** conformes à la norme 4DS. Ce guide vous accompagne pas à pas dans la création et la transmission de vos DSN mensuelles.

## Qu'est-ce que la DSN ?

La **DSN (Déclaration Sociale Nominative)** est une déclaration mensuelle obligatoire pour toutes les entreprises françaises employant des salariés. Elle remplace plusieurs déclarations papier et permet de transmettre aux organismes sociaux (URSSAF, caisses de retraite, mutuelles) l'ensemble des données issues de la paie :

- Salaires versés
- Cotisations sociales
- Informations sur les employés
- Événements (embauches, fins de contrat, arrêts maladie, etc.)

### Cadre légal

- **Obligation** : Toutes les entreprises employant des salariés
- **Fréquence** : Mensuelle (ou événementielle pour certains cas)
- **Échéance** : 5 ou 15 du mois suivant la période de paie (selon l'effectif)
- **Format** : XML conforme à la NORME 4DS
- **Transmission** : Via net-entreprises.fr

---

## Prérequis

Avant de générer votre première DSN, assurez-vous d'avoir :

### 1. Informations de l'entreprise complètes

- ✅ **SIRET** (14 chiffres) - **Obligatoire**
- ✅ **Code NAF/APE** (5 caractères, ex: 6201Z) - Recommandé
- ✅ **Adresse complète** (rue, code postal, ville) - Recommandé
- ✅ **Numéro d'adhérent URSSAF** - Recommandé
- ✅ **Convention collective** (code IDCC) - Optionnel

### 2. Informations des employés complètes

Pour chaque employé, renseignez :

- ✅ **Nom et prénom** - Obligatoire
- ✅ **Numéro de sécurité sociale** (15 chiffres) - Recommandé
- ✅ **Date de naissance** - Recommandé
- ✅ **Lieu de naissance** - Recommandé
- ✅ **Nationalité** (code ISO 2 lettres, ex: FR) - Recommandé
- ✅ **Type de contrat** (CDI, CDD, etc.) - Recommandé
- ✅ **Date d'embauche** - Recommandé
- ✅ **Numéro de matricule interne** - Optionnel

### 3. Fiches de paie générées

Avant de générer une DSN pour une période donnée, vous devez avoir :

- Généré les fiches de paie pour tous les employés de cette période
- Les cotisations sociales doivent être calculées et enregistrées

---

## Configurer votre entreprise

### Étape 1 : Compléter les informations légales

1. Connectez-vous à OpenPayFit
2. Allez dans **Tableau de Bord**
3. Sélectionnez votre entreprise
4. Cliquez sur **Modifier les informations**
5. Remplissez les champs DSN :
   - SIRET (obligatoire)
   - Code NAF
   - Adresse complète
   - Numéro URSSAF

**💡 Astuce** : Le SIRET est absolument obligatoire pour générer une DSN. Sans SIRET, la génération échouera.

### Étape 2 : Compléter les informations des employés

1. Dans le **Tableau de Bord**, sélectionnez un employé
2. Cliquez sur **Modifier**
3. Complétez les informations DSN :
   - Numéro de sécurité sociale
   - Date et lieu de naissance
   - Type de contrat
   - Date d'embauche

**⚠️ Avertissement** : Plus les informations sont complètes, moins vous aurez d'avertissements lors de la génération.

---

## Générer une DSN

### Accéder à la page DSN

1. Connectez-vous à OpenPayFit
2. Dans la barre de navigation, cliquez sur **DSN**
3. Sélectionnez votre entreprise dans le menu déroulant

### Générer une nouvelle déclaration

1. Dans la section **Générer une nouvelle DSN** :
   - Sélectionnez la **période de paie** (format AAAA-MM, ex: 2025-03 pour Mars 2025)
   - Par défaut, la période proposée est le mois précédent
2. Cliquez sur **Générer la DSN**

### Résultats de la génération

Après la génération, vous verrez :

- ✅ **Message de succès** : "DSN générée avec succès pour [période]"
- ℹ️ **Avertissements** : Messages informatifs (données recommandées manquantes)
- ❌ **Erreurs** : Problèmes bloquants (données obligatoires manquantes)

**Statuts possibles** :

| Statut | Signification | Action possible |
|--------|---------------|-----------------|
| 🟡 **BROUILLON** | En cours de préparation | Modifier, supprimer |
| 🟢 **VALIDEE** | Prête à être transmise | Télécharger |
| 🔵 **TRANSMISE** | Envoyée aux organismes | Télécharger uniquement |
| 🔴 **ERREUR** | Génération impossible | Corriger les erreurs |

---

## Télécharger et transmettre la DSN

### Télécharger le fichier XML

1. Dans la liste des DSN, repérez votre déclaration
2. Cliquez sur le bouton **Télécharger**
3. Le fichier XML est téléchargé : `DSN_[SIRET]_[PERIODE].xml`

### Transmettre via net-entreprises.fr

#### Option 1 : Transmission automatique (Recommandée)

OpenPayFit propose désormais la **transmission automatique** des DSN vers net-entreprises.fr via l'API EDI Machine-to-Machine.

**Prérequis** :
- Disposer d'un certificat client Net-Entreprises (format PEM)
- Avoir votre numéro de SIRET déclarant
- Avoir configuré votre compte sur net-entreprises.fr

**Activation** :
1. Dans la page **DSN**, la configuration Net-Entreprises s'affiche en haut
2. Si non configurée, suivez les instructions pour activer la transmission automatique
3. Une fois activée, un bouton **"Transmettre"** apparaît sur chaque DSN validée
4. Cliquez sur **"Transmettre"** pour envoyer automatiquement la DSN
5. Le statut de transmission s'affiche directement dans l'interface

**Avantages** :
- ✅ Transmission en un clic
- ✅ Gestion automatique des accusés de réception
- ✅ Retry automatique en cas d'erreur temporaire
- ✅ Traçabilité complète des transmissions

**Mode Test** : Par défaut, la transmission est en mode test. Vous pouvez passer en mode production une fois vos tests validés.

#### Option 2 : Transmission manuelle

Si vous préférez ne pas utiliser la transmission automatique :

1. Téléchargez le fichier XML depuis OpenPayFit
2. Rendez-vous sur https://www.net-entreprises.fr
3. Connectez-vous avec vos identifiants
4. Allez dans la section **DSN**
5. Cliquez sur **Déposer une DSN**
6. Sélectionnez le fichier XML téléchargé
7. Validez l'envoi

**🎯 Échéances** :
- **Entreprises < 50 salariés** : Avant le 15 du mois suivant la période de paie
- **Entreprises ≥ 50 salariés** : Avant le 5 du mois suivant la période de paie

---

## Résolution des problèmes

### Erreur : "Le SIRET de l'entreprise est obligatoire"

**Solution** :
1. Allez dans **Tableau de Bord**
2. Modifiez les informations de l'entreprise
3. Renseignez le numéro SIRET (14 chiffres)
4. Enregistrez et réessayez

### Erreur : "Aucune fiche de paie trouvée pour la période [YYYY-MM]"

**Solution** :
1. Allez dans **Paie**
2. Générez les fiches de paie pour la période concernée
3. Retournez dans **DSN** et régénérez

### Avertissement : "Le numéro de sécurité sociale de [Nom] est recommandé"

**Solution** :
- Cet avertissement n'empêche pas la génération
- Pour le résoudre : Complétez les informations de l'employé
- Le numéro de sécurité sociale doit contenir exactement 15 chiffres

### Avertissement : "Le code NAF est recommandé pour la DSN"

**Solution** :
- Le code NAF n'est pas obligatoire mais fortement recommandé
- Format : 4 chiffres + 1 lettre (ex: 6201Z)
- Trouvez votre code NAF sur le site de l'INSEE

### La DSN ne peut pas être supprimée

**Cause** : Seules les DSN en statut **BROUILLON** peuvent être supprimées

**Solution** :
- Les DSN **VALIDEE** ou **TRANSMISE** ne peuvent pas être supprimées
- Cela garantit la traçabilité des déclarations envoyées aux organismes

---

## Questions fréquentes

### Puis-je régénérer une DSN pour une période déjà générée ?

**Oui**. Si vous régénérez une DSN pour une période existante, l'ancienne déclaration sera mise à jour avec les nouvelles données.

### Que faire si j'ai oublié un employé dans la DSN ?

1. Complétez les informations de l'employé
2. Générez sa fiche de paie pour la période concernée
3. Régénérez la DSN : elle sera automatiquement mise à jour

### La DSN inclut-elle les événements (embauches, fins de contrat) ?

**Actuellement** : La version actuelle gère uniquement les **DSN mensuelles** normales avec les salaires et cotisations.

**À venir** : Les **DSN événementielles** (embauches, fins de contrat, arrêts maladie) seront ajoutées dans une future version.

### Comment activer la transmission automatique DSN ?

**Prérequis** :
1. Disposer d'un certificat client Net-Entreprises (format PEM)
2. Avoir un compte configuré sur net-entreprises.fr

**Configuration** (via API) :
```bash
POST /api/companies/:companyId/net-entreprises/config
{
  "siretDeclarant": "12345678901234",
  "numeroAdhesion": "ABC123",
  "certificat": "base64_encoded_certificate",
  "clePrivee": "base64_encoded_private_key",
  "motDePasseCertificat": "optional_password",
  "modeTest": true
}
```

**Note** : Une interface de configuration conviviale sera ajoutée dans une future version.

### La transmission automatique est-elle sécurisée ?

**Oui**, la transmission automatique utilise :
- ✅ **Authentification par certificat TLS** : Conforme aux standards Net-Entreprises
- ✅ **Chiffrement des certificats** : Les certificats sont stockés encodés en base64 dans la base de données
- ✅ **Mode test** : Par défaut, toutes les transmissions sont en mode test pour éviter les erreurs
- ✅ **Traçabilité complète** : Historique de toutes les transmissions avec statuts et erreurs

### Que faire en cas d'erreur de transmission ?

OpenPayFit gère automatiquement les erreurs :
- **Retry automatique** : En cas d'erreur temporaire (réseau, serveur), le système retente automatiquement avec un délai exponentiel (5 min, 15 min, 1h, 4h, 24h)
- **Maximum 5 tentatives** : Pour éviter les boucles infinies
- **Affichage des erreurs** : Les messages d'erreur détaillés sont affichés dans l'interface
- **Bouton "Retenter"** : Vous pouvez aussi retenter manuellement une transmission échouée

### Comment vérifier que ma DSN est conforme ?

OpenPayFit valide automatiquement votre DSN lors de la génération :

- ✅ **Format XML** : Conforme à la NORME 4DS
- ✅ **Données obligatoires** : Vérifiées (SIRET, nom, prénom, salaires)
- ✅ **Cohérence** : Salaire net < brut, montants positifs, etc.

Pour une validation complète, vous pouvez utiliser l'outil de test DSN sur net-entreprises.fr.

### Combien de temps faut-il conserver les DSN ?

**Recommandation** : Conservez vos DSN pendant au moins **5 ans** (durée légale de conservation des documents sociaux).

OpenPayFit conserve l'historique de toutes vos DSN générées.

### Puis-je annuler une DSN déjà transmise ?

**Non**. Une fois transmise via net-entreprises.fr, une DSN ne peut pas être annulée. En cas d'erreur, vous devez transmettre une **DSN annule et remplace** via net-entreprises.fr.

---

## Support technique

### Documentation technique

Pour les développeurs et administrateurs système, consultez :
- [CLAUDE.md](/CLAUDE.md) - Guide complet du projet
- [API Documentation](/backend/src/api/dsn.ts) - Endpoints DSN
- [Schéma Prisma](/backend/prisma/schema.prisma) - Modèles de données

### Signaler un problème

Si vous rencontrez un problème avec la génération DSN :

1. Vérifiez ce guide de résolution des problèmes
2. Consultez les messages d'erreur détaillés
3. Ouvrez une issue sur [GitHub](https://github.com/ambroise-leclerc/OpenPayFit/issues)

### Ressources externes

- [Site officiel DSN](https://www.dsn-info.fr/)
- [Net-entreprises.fr](https://www.net-entreprises.fr)
- [URSSAF - Guide DSN](https://www.urssaf.fr/portail/home/employeur/declarer-et-payer/la-declaration-sociale-nominativ.html)

---

**Version du guide** : 1.0
**Dernière mise à jour** : Novembre 2025
**Compatibilité** : OpenPayFit 1.0+
