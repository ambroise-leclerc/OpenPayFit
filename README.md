# OpenPayFit

Une alternative open-source moderne à PayFit pour la gestion RH et paie, conçue pour offrir aux entreprises un contrôle total sur leurs données et processus.

## Vue d'ensemble

OpenPayFit est né d'un constat simple : le secteur associatif français peine à trouver des solutions de paie abordables et adaptées à ses spécificités. Contrairement aux SaaS propriétaires, OpenPayFit place la souveraineté des données au cœur de sa philosophie. Cette approche open-source s'adresse aujourd'hui à toute organisation souhaitant maîtriser ses coûts, personnaliser ses workflows RH et garantir la confidentialité de ses données sensibles.

Pour les CTO, OpenPayFit représente une opportunité d'intégrer une solution flexible dans leur écosystème existant, avec une API complète et une architecture moderne. Pour les CEO, c'est l'assurance de s'affranchir des coûts récurrents d'abonnement tout en bénéficiant d'une solution évolutive adaptée à leur croissance.

## Fonctionnalités

### ✅ Implémentées
- **Authentification sécurisée** - JWT avec hashage bcrypt
- **Gestion multi-entreprises** - Une instance, plusieurs sociétés
- **Base de données d'employés** - Profils complets et sécurisés

### 🚧 En développement
- **Interface de gestion employés** - CRUD complet via interface web
- **Moteur de paie MVP** - Calculs automatisés des salaires et cotisations
- **Génération de bulletins** - Export PDF conforme

### 🎯 Roadmap
- **Gestion des congés et absences**
- **Notes de frais et remboursements**
- **Tableaux de bord et analytics**
- **Intégrations comptables** (Sage, QuickBooks)
- **API publique complète**
- **Support multi-pays**

## Stack technique

- **Backend** : Node.js, Express, TypeScript, Prisma ORM
- **Frontend** : React 19, TypeScript, Vite
- **Base de données** : SQLite (dev), PostgreSQL (production)
- **Tests** : Jest, Supertest
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
