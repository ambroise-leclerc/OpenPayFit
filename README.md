# OpenPayFit

[![Pipeline CI/CD](https://github.com/ambroise-leclerc/OpenPayFit/actions/workflows/ci.yml/badge.svg)](https://github.com/ambroise-leclerc/OpenPayFit/actions)
[![codecov](https://codecov.io/gh/ambroise-leclerc/OpenPayFit/branch/main/graph/badge.svg)](https://codecov.io/gh/ambroise-leclerc/OpenPayFit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://reactjs.org/)

Une alternative open-source moderne à PayFit pour la gestion RH et paie, conçue pour offrir aux entreprises un contrôle total sur leurs données et processus.

## Vue d'ensemble

OpenPayFit est né d'un constat simple : le secteur associatif français peine à trouver des solutions de paie abordables et adaptées à ses spécificités. Contrairement aux SaaS propriétaires, OpenPayFit place la souveraineté des données au cœur de sa philosophie. Cette approche open-source s'adresse aujourd'hui à toute organisation souhaitant maîtriser ses coûts, personnaliser ses workflows RH et garantir la confidentialité de ses données sensibles.

Pour les CTO, OpenPayFit représente une opportunité d'intégrer une solution flexible dans leur écosystème existant, avec une API complète et une architecture moderne. Pour les CEO, c'est l'assurance de s'affranchir des coûts récurrents d'abonnement tout en bénéficiant d'une solution évolutive adaptée à leur croissance.

## Fonctionnalités

### ✅ Implémentées
- **Authentification sécurisée** - JWT avec hashage bcrypt, système de rôles (USER/ADMIN)
- **Gestion multi-entreprises** - Une instance, plusieurs sociétés
- **Base de données d'employés** - Profils complets avec départements
- **Interface de gestion employés** - CRUD complet via interface web
- **Moteur de paie avancé** - Système complet de règles de cotisations sociales
  - Gestion des catégories de cotisations (Sécurité sociale, Retraite, Chômage, etc.)
  - Organismes collecteurs paramétrables (URSSAF, AGIRC-ARRCO, Pôle emploi)
  - Historique des taux avec dates de validité
  - Import/Export YAML/JSON des règles
  - Simulation de calcul de paie
- **Génération de bulletins PDF** - Export professionnel avec détail des cotisations
- **Visualisation des fiches de paie** - Page dédiée avec lignes de cotisations détaillées
- **Gestion des congés et absences** - Système complet avec workflow d'approbation
  - Demandes de congés avec statuts (EN_ATTENTE, APPROUVÉ, REJETÉ, ANNULÉ)
  - Soldes de congés par type et année
  - Gestion de multiples types de congés (CP, RTT, maladie, parental, etc.)
- **Notes de frais et remboursements** - Système avancé multi-lignes
  - Rapports de notes de frais avec workflow de validation
  - Upload de reçus (JPG, PNG, PDF)
  - Catégorisation (Transport, Repas, Hébergement, Équipement, Autre)
- **Tableaux de bord et analytics** - 4 modules complets
  - Évolution de la masse salariale par période
  - Répartition des effectifs par département
  - Statistiques de congés (taux d'absence, par type, par statut)
  - Analytics des dépenses (top 10, par catégorie, par statut)
- **Intégrations comptables** - Sage et QuickBooks
  - Export automatique de la paie (formats TRA/PNM pour Sage)
  - OAuth QuickBooks avec authentification sécurisée
  - Logs d'export avec système de retry automatique
- **API REST complète** - Documentation exhaustive des endpoints

### 🎯 Roadmap
- **Améliorations des cotisations** - Gestion des tranches progressives (plafond SS)
- **Support multi-pays** - Adaptation des règles fiscales et sociales
- **Notifications** - Alertes email pour congés, notes de frais, paie
- **Mobile app** - Application mobile native (React Native)
- **Exports comptables avancés** - Support FEC, Cegid, EBP

## Stack technique

### Backend
- **Runtime** : Node.js 18+
- **Framework** : Express 5.1.0 avec TypeScript 5.9.2
- **Base de données** : SQLite (dev avec better-sqlite3), PostgreSQL (production)
- **ORM** : Prisma 6.14.0
- **Authentification** : JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0
- **Génération PDF** : PDFKit 0.17.2
- **Upload fichiers** : Multer 2.0.2
- **Validation** : Zod 4.1.12
- **Import/Export** : YAML 2.8.1, js-yaml 4.1.1
- **Tests** : Jest 30.0.5, Supertest 7.1.4, ts-jest 29.4.1

### Frontend
- **Framework** : React 19.1.1 avec TypeScript 5.8.3
- **Build tool** : Vite 7.1.2
- **Routing** : react-router-dom 7.8.2
- **Visualisation** : Recharts 3.4.1 (graphiques analytics)
- **Tests** : Vitest 3.2.4, React Testing Library 16.3.0
- **Linting** : ESLint 9.33.0

### Infrastructure
- **Déploiement** : Docker, Kubernetes ready
- **CI/CD** : GitHub Actions avec tests automatisés
- **Hébergement** : 100% français, zéro dépendance AWS

## Installation rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Git

### Démarrage
```bash
# Cloner le projet
git clone https://github.com/ambroise-leclerc/OpenPayFit.git
cd OpenPayFit

# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend (nouveau terminal)
cd ../frontend  
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173` avec l'API sur `http://localhost:3000`.

## Utilisation

### Gestion de la paie

1. **Créer une entreprise** - Depuis le tableau de bord, créez votre première entreprise
2. **Ajouter des employés** - Renseignez les informations des employés (nom, email, salaire brut)
3. **Générer la paie** - Depuis l'interface "Paie", sélectionnez la période et lancez le calcul
4. **Consulter les fiches** - Visualisez les fiches de paie générées dans un tableau récapitulatif
5. **Télécharger en PDF** - Exportez chaque fiche de paie au format PDF professionnel

### API Endpoints

**Authentification** (`/api/auth`)
- `POST /api/auth/register` - Inscription d'un nouvel utilisateur
- `POST /api/auth/login` - Connexion utilisateur

**Entreprises** (`/api/companies`)
- `GET /api/companies` - Liste des entreprises de l'utilisateur
- `POST /api/companies` - Créer une entreprise

**Employés** (`/api/companies/:companyId/employees`)
- `GET /api/companies/:companyId/employees` - Liste des employés
- `POST /api/companies/:companyId/employees` - Créer un employé
- `PUT /api/companies/:companyId/employees/:employeeId` - Modifier un employé
- `DELETE /api/companies/:companyId/employees/:employeeId` - Supprimer un employé

**Paie** (`/api/payslips`)
- `POST /api/payslips/run` - Lancer le calcul de paie pour une période
- `GET /api/payslips?companyId=xxx&period=YYYY-MM` - Liste des fiches de paie
- `GET /api/payslips/:id` - Détails d'une fiche de paie
- `GET /api/payslips/:id/pdf` - Télécharger le PDF d'une fiche de paie
- `GET /api/companies/:companyId/payslips/:payslipId/details` - Détails complets avec cotisations

**Congés** (`/api/companies/:companyId/employees/:employeeId/leaves`)
- `GET /api/companies/:companyId/employees/:employeeId/leaves` - Liste des demandes de congés
- `POST /api/companies/:companyId/employees/:employeeId/leaves` - Créer une demande de congé
- `PUT /api/companies/:companyId/employees/:employeeId/leaves/:leaveId` - Modifier une demande
- `DELETE /api/companies/:companyId/employees/:employeeId/leaves/:leaveId` - Supprimer une demande
- `GET /api/companies/:companyId/employees/:employeeId/leaves/balances` - Consulter les soldes de congés

**Notes de frais** (`/api/companies/:companyId/expense-reports`)
- `GET /api/companies/:companyId/expense-reports` - Liste des rapports de notes de frais
- `GET /api/companies/:companyId/expense-reports/:reportId` - Détails d'un rapport
- `POST /api/companies/:companyId/expense-reports` - Créer un rapport
- `PUT /api/companies/:companyId/expense-reports/:reportId` - Modifier un rapport
- `DELETE /api/companies/:companyId/expense-reports/:reportId` - Supprimer un rapport
- `POST /api/companies/:companyId/expense-reports/:reportId/items` - Ajouter une ligne de dépense
- `PUT /api/companies/:companyId/expense-reports/:reportId/items/:itemId` - Modifier une ligne
- `DELETE /api/companies/:companyId/expense-reports/:reportId/items/:itemId` - Supprimer une ligne
- `POST /api/companies/:companyId/expense-reports/:reportId/upload-receipt` - Upload de reçu

**Analytics RH** (`/api/companies/:companyId/analytics`)
- `GET /api/companies/:companyId/analytics/payroll` - Évolution de la masse salariale
- `GET /api/companies/:companyId/analytics/headcount` - Répartition des effectifs par département
- `GET /api/companies/:companyId/analytics/leaves` - Statistiques de congés
- `GET /api/companies/:companyId/analytics/expenses` - Statistiques de notes de frais

**Cotisations sociales** (`/api/cotisations`) - Authentification requise
- `GET /api/cotisations/categories` - Liste des catégories de cotisations
- `POST /api/cotisations/categories` - Créer une catégorie
- `GET /api/cotisations/organismes` - Liste des organismes collecteurs
- `POST /api/cotisations/organismes` - Créer un organisme
- `GET /api/cotisations/regles` - Liste des règles de cotisations
- `POST /api/cotisations/regles` - Créer une règle
- `GET /api/cotisations/regles/:regleId/taux` - Historique des taux
- `POST /api/cotisations/regles/:regleId/taux` - Ajouter un taux
- `POST /api/cotisations/import` - Importer des règles (YAML/JSON)
- `GET /api/cotisations/export?format=yaml|json` - Exporter les règles
- `POST /api/cotisations/simulation` - Simuler un calcul de paie

**Intégrations comptables** (`/api/companies/:companyId/integrations`)
- `GET /api/companies/:companyId/integrations` - Liste des intégrations
- `POST /api/companies/:companyId/integrations` - Créer une intégration (Sage/QuickBooks)
- `PUT /api/companies/:companyId/integrations/:integrationId` - Modifier une intégration
- `DELETE /api/companies/:companyId/integrations/:integrationId` - Supprimer une intégration
- `POST /api/companies/:companyId/integrations/:integrationId/export` - Exporter la paie
- `GET /api/companies/:companyId/integrations/:integrationId/logs` - Consulter les logs d'export
- `GET /api/integrations/quickbooks/auth-url` - URL d'autorisation OAuth QuickBooks
- `POST /api/integrations/quickbooks/exchange-token` - Échanger le code OAuth contre un token

## Sécurité et souveraineté des données

OpenPayFit fait le choix délibéré de **refuser les API Amazon Web Services** pour garantir un hébergement 100% français des données RH. Cette approche permet :

- 🇫🇷 **Hébergement souverain** - Données stockées exclusivement en France
- 🚫 **Zéro transfert US** - Aucun risque de transmission vers les États-Unis
- 🌱 **Empreinte écologique réduite** - Infrastructure locale et optimisée
- 📋 **Conformité RGPD native** - Respect intégral de la réglementation européenne

## Architecture

OpenPayFit adopte une architecture découplée moderne :

- **API REST** sécurisée avec authentification JWT
- **Base de données relationnelle** optimisée pour la conformité RGPD
- **Frontend SPA** responsive et accessible
- **Tests automatisés** garantissant la fiabilité
- **Déploiement conteneurisé** pour tous environnements

## Contribuer

Nous accueillons toutes les contributions ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour :
- Conventions de code et bonnes pratiques
- Processus de soumission des PR
- Guide de développement local

### Développement

**Backend**
```bash
cd backend
npm run dev                 # Serveur de développement avec nodemon
npm test                    # Tests unitaires et d'intégration avec coverage
npm run build               # Compilation TypeScript → dist/
npm start                   # Démarre le serveur compilé
npm run lint                # Vérification du code
npm run migrate             # Applique les migrations SQLite
npm run seed:cotisations    # Charge les données de référence des cotisations (YAML)
```

**Frontend**
```bash
cd frontend
npm run dev         # Serveur Vite avec HMR (port 5173)
npm run build       # Type check + build optimisé
npm run preview     # Prévisualiser le build de production
npm run lint        # Analyse statique ESLint
npm test            # Tests en mode watch
npm run test:ui     # Interface graphique Vitest
```

**Base de données**
```bash
cd backend
npx prisma migrate dev      # Créer et appliquer une migration
npx prisma migrate deploy   # Appliquer les migrations (production)
npx prisma generate         # Générer le client Prisma
npx prisma studio           # Ouvrir l'interface GUI Prisma Studio
```

## Licence

Licence LLVO - Voir [LICENSE](LICENSE) pour plus de détails.

## Support

- 📖 **Documentation** : Consultez le dossier `/docs`
- 🐛 **Issues** : [GitHub Issues](https://github.com/ambroise-leclerc/OpenPayFit/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/ambroise-leclerc/OpenPayFit/discussions)

---

**OpenPayFit** - Reprendre le contrôle de sa gestion RH
