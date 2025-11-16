# OpenPayFit

[![Pipeline CI/CD](https://github.com/votre-org/OpenPayFit/workflows/Pipeline%20CI/CD/badge.svg)](https://github.com/votre-org/OpenPayFit/actions)
[![Tests Backend](https://github.com/votre-org/OpenPayFit/workflows/Pipeline%20CI/CD/badge.svg?job=backend-tests)](https://github.com/votre-org/OpenPayFit/actions)
[![Tests Frontend](https://github.com/votre-org/OpenPayFit/workflows/Pipeline%20CI/CD/badge.svg?job=frontend-tests)](https://github.com/votre-org/OpenPayFit/actions)
[![Audit Sécurité](https://github.com/votre-org/OpenPayFit/workflows/Pipeline%20CI/CD/badge.svg?job=security-audit)](https://github.com/votre-org/OpenPayFit/actions)
[![Qualité Code](https://github.com/votre-org/OpenPayFit/workflows/Pipeline%20CI/CD/badge.svg?job=lint)](https://github.com/votre-org/OpenPayFit/actions)
[![codecov](https://codecov.io/gh/votre-org/OpenPayFit/branch/main/graph/badge.svg)](https://codecov.io/gh/votre-org/OpenPayFit)
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
- **Authentification sécurisée** - JWT avec hashage bcrypt
- **Gestion multi-entreprises** - Une instance, plusieurs sociétés
- **Base de données d'employés** - Profils complets et sécurisés
- **Interface de gestion employés** - CRUD complet via interface web
- **Moteur de paie MVP** - Calculs automatisés des salaires et cotisations (taux simplifié 25%)
- **Génération de bulletins PDF** - Export professionnel avec visualisation détaillée
- **Visualisation des fiches de paie** - Page dédiée avec détails complets

### 🚧 En développement
- **Amélioration du moteur de paie** - Taux de cotisation détaillés et conformes

### 🎯 Roadmap
- **Gestion des congés et absences**
- **Notes de frais et remboursements**
- **Tableaux de bord et analytics**
- **Intégrations comptables** (Sage, QuickBooks)
- **API publique complète**
- **Support multi-pays**

## Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma ORM, PDFKit
- **Frontend** : React 19, TypeScript, Vite
- **Base de données** : SQLite (dev), PostgreSQL (production)
- **Tests** : Jest, Supertest, Vitest, React Testing Library
- **Déploiement** : Docker, Kubernetes ready

## Installation rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Git

### Démarrage
```bash
# Cloner le projet
git clone https://github.com/votre-org/OpenPayFit.git
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

**Paie**
- `POST /api/payslips/run` - Lancer le calcul de paie pour une période
- `GET /api/payslips?companyId=xxx&period=YYYY-MM` - Liste des fiches de paie
- `GET /api/payslips/:id` - Détails d'une fiche de paie
- `GET /api/payslips/:id/pdf` - Télécharger le PDF d'une fiche de paie

**Entreprises**
- `GET /api/companies` - Liste des entreprises
- `POST /api/companies` - Créer une entreprise

**Employés**
- `GET /api/companies/:id/employees` - Liste des employés
- `POST /api/companies/:id/employees` - Créer un employé
- `PUT /api/employees/:id` - Modifier un employé
- `DELETE /api/employees/:id` - Supprimer un employé

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
```bash
# Backend
cd backend
npm run dev     # Serveur de développement
npm test        # Tests unitaires et d'intégration
npm run build   # Build production

# Frontend  
cd frontend
npm run dev     # Serveur Vite avec HMR
npm run lint    # Analyse statique ESLint
npm run build   # Build optimisé
```

## Licence

Licence LLVO - Voir [LICENSE](LICENSE) pour plus de détails.

## Support

- 📖 **Documentation** : Consultez le dossier `/docs`
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-org/OpenPayFit/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/votre-org/OpenPayFit/discussions)

---

**OpenPayFit** - Reprendre le contrôle de sa gestion RH
