# Plan de Développement - OpenPayFit MVP

Ce document décrit les grandes phases de développement pour atteindre le MVP (Minimum Viable Product) de l'application.

---

### Phase 1 : Authentification des Utilisateurs et Base de Données [COMPLÉTÉE]

**Objectif :** Permettre aux utilisateurs de s'inscrire et de se connecter. Mettre en place la base de données qui supportera toute l'application.

1.  **Choix et Intégration de la Base de Données (Backend)** [x]
    *   **Action :** Intégrer **PostgreSQL** comme base de données.
    *   **Outil :** Utiliser un ORM comme **Prisma** pour gérer le schéma et les requêtes.

2.  **Schéma de Données - Utilisateur (Backend)** [x]
    *   **Action :** Définir le modèle `User` (`email`, `password`, `name`).

3.  **API d'Authentification (Backend)** [x]
    *   **Action :** Créer les routes `POST /api/auth/register` et `POST /api/auth/login`.
    *   **Sécurité :** Hasher les mots de passe avec `bcrypt` et générer des **JWT (JSON Web Token)** à la connexion.

4.  **Interface d'Authentification (Frontend)** [x]
    *   **Action :** Créer les pages/composants React pour "Inscription" et "Connexion".
    *   **Logique :** Gérer les formulaires, appeler l'API et stocker le JWT.

---

### Phase 2 : Gestion des Entreprises et des Employés [EN COURS]

**Objectif :** Permettre à un utilisateur connecté de créer son entreprise et d'y ajouter des employés.

1.  **Schéma de Données - Entreprise & Employé (Backend)** [x]
    *   **Action :** Définir les modèles `Company` et `Employee` et leurs relations.

2.  **API CRUD pour les Employés (Backend)** [ ]
    *   **Action :** Créer les routes d'API sécurisées (CRUD : Create, Read, Update, Delete) pour les employés.
    *   **Avancement :** Middleware d'authentification créé. Routes `POST /api/companies` et `GET /api/companies` implémentées. Les routes pour les employés sont à faire.

3.  **Tableau de Bord et Gestion des Employés (Frontend)** [ ]
    *   **Action :** Créer une page "Tableau de bord" privée.
    *   **Fonctionnalités :** Afficher la liste des employés, ajouter/modifier un employé via un formulaire.
    *   **Avancement :** Composant `ProtectedRoute` créé et intégré au routeur. L'interface de gestion des entreprises/employés est à faire.

---

### Phase 3 : Moteur de Paie (MVP) [À FAIRE]

**Objectif :** Mettre en place la logique de base pour calculer une paie simple.

1.  **Schéma de Données - Fiche de Paie (Backend)** [ ]
    *   **Action :** Créer un modèle `Payslip` lié à un `Employee` et une période.

2.  **Logique de Calcul (Backend)** [ ]
    *   **Action :** Créer un module de paie avec une logique de calcul simplifiée pour le MVP (ex: `net = brut - 25%`).

3.  **API de Paie (Backend)** [ ]
    *   **Action :** Créer une route `POST /api/payroll/run` pour lancer un cycle de paie.

4.  **Interface de Paie (Frontend)** [ ]
    *   **Action :** Ajouter une section "Paie" avec un bouton pour lancer les calculs et afficher les résultats.

---

### Phase 4 et Au-delà : Visualisation et Évolution [À FAIRE]

**Objectif :** Permettre aux utilisateurs de voir les résultats et planifier la suite.

1.  **Visualisation des Fiches de Paie** [ ]
    *   **Action :** Créer une page dédiée pour voir les détails d'une fiche de paie.

2.  **Génération de PDF** [ ]
    *   **Action :** Intégrer une librairie pour générer une version PDF de la fiche de paie.

3.  **Prochaines Étapes Possibles** [ ]
    *   Gestion des congés et des notes de frais.
    *   Modularisation du moteur de paie pour d'autres pays.
    *   Tableaux de bord et statistiques.
