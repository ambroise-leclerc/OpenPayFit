# CLAUDE.md - Guide pour Assistants IA

> Ce document fournit un contexte complet sur le projet OpenPayFit pour les assistants IA travaillant sur ce dépôt.

## Vue d'ensemble du projet

**OpenPayFit** est une alternative open-source moderne à PayFit pour la gestion RH et paie, conçue pour offrir aux entreprises un contrôle total sur leurs données et processus. Le projet privilégie la souveraineté des données avec un hébergement 100% français, sans utilisation d'AWS.

### Statut actuel
- ✅ **Implémenté** : Authentification JWT, gestion multi-entreprises, CRUD complet des employés
- 🚧 **En développement** : Interface de gestion employés, moteur de paie MVP
- 🎯 **Roadmap** : Gestion des congés, notes de frais, analytics, intégrations comptables

### Principes fondamentaux
- **Qualité avant tout** : Code propre, lisible, maintenable et bien testé
- **Simplicité** : Préférer les solutions simples et explicites
- **Cohérence** : Le code doit sembler écrit par une seule personne
- **Souveraineté des données** : Hébergement français, conformité RGPD, aucun service AWS

---

## Architecture du projet

### Structure des répertoires

```
OpenPayFit/
├── backend/                    # API Node.js/Express/TypeScript
│   ├── src/
│   │   ├── api/               # Routes et contrôleurs
│   │   │   ├── auth.ts        # Routes d'authentification
│   │   │   ├── companies.ts   # Routes de gestion des entreprises
│   │   │   └── employees.ts   # Routes de gestion des employés
│   │   ├── middleware/
│   │   │   └── auth.ts        # Middleware d'authentification JWT
│   │   ├── lib/
│   │   │   └── db.ts          # Instance du client Prisma
│   │   ├── types/
│   │   │   └── express.d.ts   # Extensions de types Express
│   │   ├── tests/             # Tests Jest
│   │   ├── generated/prisma/  # Client Prisma généré
│   │   └── index.ts           # Point d'entrée de l'application
│   ├── prisma/
│   │   ├── schema.prisma      # Schéma de base de données
│   │   ├── dev.db             # Base SQLite de développement
│   │   └── migrations/        # Migrations de base de données
│   ├── dist/                  # Code TypeScript compilé
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
│
├── frontend/                   # Application React 19/TypeScript/Vite
│   ├── src/
│   │   ├── components/        # Composants React réutilisables
│   │   │   ├── Layout.tsx     # Layout principal avec navigation
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── EmployeeList.tsx
│   │   │   └── EmployeeForm.tsx
│   │   ├── pages/             # Composants de pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Gestion de l'état d'authentification
│   │   ├── services/
│   │   │   └── api.ts         # Client API
│   │   ├── utils/
│   │   │   └── tokenValidation.ts
│   │   ├── tests/
│   │   │   └── setup.ts       # Configuration Vitest
│   │   ├── main.tsx           # Point d'entrée
│   │   └── index.css
│   ├── public/
│   ├── dist/                  # Build de production
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── eslint.config.js
│
├── .github/
│   ├── workflows/
│   │   └── ci.yml             # Pipeline CI/CD GitHub Actions
│   └── ISSUE_TEMPLATE/
│
├── docs/
│   ├── DEVELOPMENT_PLAN.md
│   └── SPECIFICATIONS.md
│
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## Stack technique

### Backend
- **Runtime** : Node.js 18+ (CommonJS)
- **Framework** : Express 5.1.0 avec TypeScript 5.9.2
- **Base de données** :
  - Développement : SQLite (file:./dev.db)
  - Production : PostgreSQL
  - ORM : Prisma 6.14.0
- **Authentification** :
  - JWT : jsonwebtoken 9.0.2 (expiration 24h)
  - Hash de mot de passe : bcrypt 6.0.0 (10 rounds)
- **Tests** : Jest 30.0.5, Supertest 7.1.4, ts-jest 29.4.1
- **Dev tools** : nodemon, ts-node, dotenv-cli

### Frontend
- **Framework** : React 19.1.1
- **Build tool** : Vite 7.1.2
- **Langage** : TypeScript 5.8.3 (ES Module)
- **Routing** : react-router-dom 7.8.2
- **Tests** : Vitest 3.2.4, @testing-library/react 16.3.0, jsdom 26.1.0
- **Linting** : ESLint 9.33.0 avec typescript-eslint 8.39.1
- **Styles** : CSS Modules

### Environnement de développement
- **Node.js** : 18+
- **Package manager** : npm
- **Git workflow** : Feature branches depuis `develop`

---

## Schéma de base de données

**Localisation** : `/home/user/OpenPayFit/backend/prisma/schema.prisma`

### Modèles

#### User
```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  password  String    // Hash bcrypt
  companies Company[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

#### Company
```prisma
model Company {
  id        String     @id @default(cuid())
  name      String
  owner     User       @relation(fields: [ownerId], references: [id])
  ownerId   String
  employees Employee[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

#### Employee
```prisma
model Employee {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  email       String   @unique
  grossSalary Float
  company     Company  @relation(fields: [companyId], references: [id])
  companyId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Relations
- User → Company : One-to-many (un utilisateur peut posséder plusieurs entreprises)
- Company → Employee : One-to-many
- Contraintes : Foreign keys avec ON DELETE RESTRICT

### Migrations
**Localisation** : `/home/user/OpenPayFit/backend/prisma/migrations/`

Commandes utiles :
```bash
npx prisma migrate dev          # Créer et appliquer une migration
npx prisma migrate deploy       # Appliquer les migrations en production
npx prisma generate             # Générer le client Prisma
npx prisma studio               # Ouvrir l'interface GUI Prisma Studio
```

---

## API Backend

### Point d'entrée
**Fichier** : `/home/user/OpenPayFit/backend/src/index.ts`

```typescript
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Routes d'authentification
**Fichier** : `/home/user/OpenPayFit/backend/src/api/auth.ts`

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/register` | Inscription d'un nouvel utilisateur | Non |
| POST | `/api/auth/login` | Connexion utilisateur | Non |

**Détails** :
- **Register** : `{ email, name, password }` → `{ token }`
- **Login** : `{ email, password }` → `{ token }`
- JWT expire après 24h
- Mot de passe hashé avec bcrypt (10 rounds)

### Routes des entreprises
**Fichier** : `/home/user/OpenPayFit/backend/src/api/companies.ts`

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/api/companies` | Liste des entreprises de l'utilisateur | JWT |
| POST | `/api/companies` | Créer une entreprise | JWT |

### Routes des employés
**Fichier** : `/home/user/OpenPayFit/backend/src/api/employees.ts`

Toutes ces routes nécessitent JWT + vérification que l'utilisateur est propriétaire de l'entreprise.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/companies/:companyId/employees` | Liste des employés |
| POST | `/api/companies/:companyId/employees` | Créer un employé |
| PUT | `/api/companies/:companyId/employees/:employeeId` | Modifier un employé |
| DELETE | `/api/companies/:companyId/employees/:employeeId` | Supprimer un employé |

**Middleware de sécurité** :
- Valide que l'entreprise existe
- Vérifie que l'utilisateur est propriétaire (403 sinon)
- Retourne 401 si pas de token

### Middleware d'authentification
**Fichier** : `/home/user/OpenPayFit/backend/src/middleware/auth.ts`

```typescript
export function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.sendStatus(403);
    req.userId = payload.userId;
    next();
  });
}
```

---

## Frontend

### Routing
**Fichier** : `/home/user/OpenPayFit/frontend/src/main.tsx`

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute>
      },
    ],
  },
]);
```

### Gestion de l'état

**Context d'authentification** : `/home/user/OpenPayFit/frontend/src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
}

// Le token est persisté dans localStorage
// Hook useAuth() disponible pour tous les composants
```

**Pas de bibliothèque de gestion d'état globale** - utilise React Context + state local des composants.

### Service API
**Fichier** : `/home/user/OpenPayFit/frontend/src/services/api.ts`

**Configuration** :
- URL de base : `import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`
- Authentification : Bearer token dans les headers

**Fonctions disponibles** :
- `registerUser(userData)` → `{ token }`
- `loginUser(credentials)` → `{ token }`
- `getCompanies(token)` → `Company[]`
- `createCompany(data, token)` → `Company`
- `getEmployees(companyId, token)` → `Employee[]`
- `createEmployee(companyId, data, token)` → `Employee`
- `updateEmployee(employeeId, data, token)` → `Employee`
- `deleteEmployee(employeeId, token)` → `void`

### Composants clés

**Layout** : `/home/user/OpenPayFit/frontend/src/components/Layout.tsx`
- En-tête de navigation avec liens
- Utilise `<Outlet />` pour les routes imbriquées
- CSS Modules pour les styles

**ProtectedRoute** : `/home/user/OpenPayFit/frontend/src/components/ProtectedRoute.tsx`
- Validation du token JWT
- Déconnexion automatique si token invalide/expiré
- Redirection vers /login

**Pages** :
- **LoginPage** : Formulaire d'authentification
- **DashboardPage** : Gestion multi-entreprises/employés avec tests
- **RegisterPage** : Formulaire d'inscription

---

## Configuration et environnement

### Variables d'environnement

**Backend** (créer `.env` dans `/backend/`) :
```bash
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
```

**Frontend** (créer `.env` dans `/frontend/`, optionnel) :
```bash
VITE_API_URL=http://localhost:3000/api
```

**Tests Backend** (créer `.env.test` dans `/backend/`) :
```bash
JWT_SECRET=test_secret
DATABASE_URL="file:./test.db"
NODE_ENV=test
```

### Configuration TypeScript

**Backend** : `/home/user/OpenPayFit/backend/tsconfig.json`
- Target : ES6
- Module : CommonJS
- Strict mode activé
- Output : `./dist`

**Frontend** : `/home/user/OpenPayFit/frontend/tsconfig.app.json`
- Target : ES2022
- Module : ESNext (bundler mode)
- JSX : react-jsx
- Strict mode avec linting étendu (noUnusedLocals, noUnusedParameters, etc.)

---

## Tests

### Backend - Jest

**Configuration** : `/home/user/OpenPayFit/backend/jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
};
```

**Localisation des tests** : `/home/user/OpenPayFit/backend/src/tests/`

**Structure des tests** :
```typescript
import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';

describe('Employee API Endpoints', () => {
  let user1: User, company1: Company, token1: string;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.employee.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();

    // Créer des données de test
    user1 = await prisma.user.create({...});
    company1 = await prisma.company.create({...});
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a new employee', async () => {
    const res = await request(app)
      .post(`/api/companies/${company1.id}/employees`)
      .set('Authorization', `Bearer ${token1}`)
      .send({...});
    expect(res.statusCode).toEqual(201);
  });
});
```

**Commandes** :
```bash
npm test                        # Exécuter les tests avec coverage
npm test -- --watch             # Mode watch
```

### Frontend - Vitest

**Configuration** : `/home/user/OpenPayFit/frontend/vitest.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
  },
});
```

**Localisation** : Tests à côté des fichiers (ex: `DashboardPage.test.tsx`)

**Structure des tests** :
```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../contexts/AuthContext';
import * as api from '../services/api';

vi.mock('../services/api');

describe('DashboardPage', () => {
  const renderWithAuth = (ui) => {
    return render(
      <AuthContext.Provider value={{ token: 'fake-token', ... }}>
        {ui}
      </AuthContext.Provider>
    );
  };

  it('should display companies correctly', async () => {
    vi.mocked(api.getCompanies).mockResolvedValue(mockCompanies);
    renderWithAuth(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Company A')).toBeInTheDocument();
    });
  });
});
```

**Commandes** :
```bash
npm test                        # Mode watch
npm test -- run --coverage      # Exécution unique avec coverage
npm run test:ui                 # Interface Vitest UI
```

### Exigences de test
- ✅ Toute nouvelle fonctionnalité doit inclure des tests
- ✅ Couvrir le cas nominal (happy path)
- ✅ Couvrir les cas d'erreur
- ✅ Couvrir les cas limites

---

## CI/CD

**Fichier** : `/home/user/OpenPayFit/.github/workflows/ci.yml`

### Jobs du pipeline

1. **backend-tests**
   - Node.js 18 sur Ubuntu
   - Install → Prisma generate → Migrate → Test → Upload coverage

2. **frontend-tests**
   - Node.js 18 sur Ubuntu
   - Install → Test → Build → Upload coverage

3. **security-audit**
   - `npm audit --audit-level high` pour backend et frontend

4. **lint**
   - Linting et vérification de types pour les deux projets
   - Backend : `npm run lint` + `npm run build`
   - Frontend : `npm run lint` + `npm run build`

5. **integration-tests**
   - Dépend de : backend-tests, frontend-tests
   - Service PostgreSQL 15
   - Migrations + démarrage du serveur

**Déclencheurs** :
- Push sur n'importe quelle branche
- Pull requests vers main

---

## Conventions de code

### Langue
**Toutes les contributions doivent être en français** :
- Commentaires dans le code
- Documentation (JSDoc, Markdown)
- Messages de commit
- Descriptions de PR et discussions

### Messages de commit

**Convention** : Conventional Commits en français

**Préfixes** :
- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Modification de documentation
- `style:` - Formatage du code
- `refactor:` - Modification du code sans correction ni ajout de fonctionnalité
- `test:` - Ajout ou modification de tests
- `chore:` - Mise à jour de dépendances, tâches de build

**Exemples** :
```
feat: ajoute la connexion via email et mot de passe
fix: corrige la validation du formulaire d'employé
test: ajoute des tests pour l'API des entreprises
docs: met à jour le guide d'installation
```

### Conventions de nommage

- **Variables et fonctions** : `camelCase`
  ```typescript
  const userName = 'John';
  function calculateSalary() {}
  ```

- **Classes, Interfaces, Types, Composants React** : `PascalCase`
  ```typescript
  interface UserData {}
  class Employee {}
  function EmployeeList() {}
  ```

- **Constantes** : `UPPER_CASE`
  ```typescript
  const JWT_SECRET = process.env.JWT_SECRET;
  const MAX_RETRY = 3;
  ```

### React
- ✅ Utiliser **uniquement** des composants fonctionnels avec Hooks
- ✅ Définir les props avec des interfaces ou types TypeScript
- ✅ Utiliser CSS Modules pour les styles

### Linting
- ✅ Le code ne doit générer **aucune erreur ou avertissement** ESLint
- ✅ Formater avec Prettier (intégré)
- ✅ Vérifier avant commit : `npm run lint`

### Stratégie de branches
- ✅ Travailler dans des branches feature depuis `develop`
- ✅ Nommage des branches en **anglais** : `feature/nom-fonctionnalite`, `fix/description-bug`
- ✅ Les PR ciblent la branche `develop`

---

## Commandes de développement

### Setup initial

```bash
# Cloner le projet
git clone https://github.com/votre-org/OpenPayFit.git
cd OpenPayFit

# Backend
cd backend
npm install                     # Installe les dépendances + génère Prisma client
npx prisma migrate dev          # Applique les migrations
npm run dev                     # Démarre le serveur (http://localhost:3000)

# Frontend (nouveau terminal)
cd ../frontend
npm install
npm run dev                     # Démarre Vite (http://localhost:5173)
```

### Backend

```bash
# Développement
npm run dev                     # Serveur avec auto-reload (nodemon)

# Tests
npm test                        # Tests avec coverage
npm test -- --watch             # Mode watch

# Build et production
npm run build                   # Compile TypeScript → /dist
npm start                       # Exécute le build compilé

# Base de données
npx prisma migrate dev          # Créer et appliquer migration
npx prisma migrate deploy       # Appliquer migrations (prod)
npx prisma generate             # Générer client Prisma
npx prisma studio               # Ouvrir GUI Prisma Studio

# Linting
npm run lint                    # Vérifier le code
```

### Frontend

```bash
# Développement
npm run dev                     # Serveur Vite avec HMR

# Tests
npm test                        # Vitest en mode watch
npm test -- run --coverage      # Tests avec coverage
npm run test:ui                 # Interface Vitest UI

# Build et production
npm run build                   # Type check + build production
npm run preview                 # Prévisualiser le build

# Linting
npm run lint                    # ESLint
```

---

## Bonnes pratiques pour les assistants IA

### 1. Toujours respecter les conventions
- ✅ Écrire en **français** (commentaires, docs, commits)
- ✅ Utiliser les conventions de nommage établies
- ✅ Suivre les formats de commit Conventional Commits
- ✅ Ajouter des tests pour tout nouveau code

### 2. Sécurité
- ❌ **Ne JAMAIS** exposer de secrets dans le code
- ❌ **Ne JAMAIS** commiter de fichiers `.env`
- ✅ Utiliser bcrypt pour les mots de passe
- ✅ Valider les entrées utilisateur
- ✅ Vérifier les autorisations (ownership des companies)
- ✅ Éviter les vulnérabilités OWASP Top 10 (XSS, SQL injection, etc.)

### 3. Avant de soumettre du code
```bash
# Backend
cd backend
npm run lint                    # Pas d'erreurs ESLint
npm run build                   # Compilation réussie
npm test                        # Tous les tests passent

# Frontend
cd frontend
npm run lint                    # Pas d'erreurs ESLint
npm run build                   # Build réussi
npm test -- run                 # Tous les tests passent
```

### 4. Workflow Git
```bash
# Créer une branche feature
git checkout develop
git pull origin develop
git checkout -b feature/ma-nouvelle-fonctionnalite

# Développer et tester...

# Commit avec convention
git add .
git commit -m "feat: ajoute la fonctionnalité X"

# Push et créer PR
git push origin feature/ma-nouvelle-fonctionnalite
# Créer PR vers develop sur GitHub
```

### 5. Travailler avec Prisma

**Modifier le schéma** :
```bash
# 1. Éditer prisma/schema.prisma
# 2. Créer et appliquer la migration
npx prisma migrate dev --name description_du_changement
# 3. Le client Prisma est régénéré automatiquement
```

**Utiliser le client Prisma** :
```typescript
import prisma from '../lib/db';

// Créer
const user = await prisma.user.create({
  data: { email, name, password }
});

// Lire
const companies = await prisma.company.findMany({
  where: { ownerId: userId },
  include: { employees: true }
});

// Mettre à jour
const employee = await prisma.employee.update({
  where: { id: employeeId },
  data: { firstName, lastName }
});

// Supprimer
await prisma.employee.delete({
  where: { id: employeeId }
});
```

### 6. Gestion des erreurs

**Backend** :
```typescript
// Retourner des statuts HTTP appropriés
res.status(400).json({ error: 'Message d\'erreur' }); // Bad request
res.status(401).json({ error: 'Non autorisé' });      // Unauthorized
res.status(403).json({ error: 'Interdit' });          // Forbidden
res.status(404).json({ error: 'Non trouvé' });        // Not found
res.status(500).json({ error: 'Erreur serveur' });    // Server error
```

**Frontend** :
```typescript
// Gestion des erreurs API
try {
  const data = await api.getCompanies(token);
} catch (error) {
  console.error('Erreur:', error);
  // Afficher un message à l'utilisateur
}
```

### 7. Fichiers à ne jamais modifier sans raison

- `/backend/src/generated/` - Généré par Prisma
- `/backend/dist/` - Généré par TypeScript
- `/frontend/dist/` - Généré par Vite
- `package-lock.json` - Géré par npm
- `.env` - Spécifique à chaque environnement

### 8. Fichiers importants à connaître

**Configuration** :
- `/backend/prisma/schema.prisma` - Schéma de BDD (source de vérité)
- `/backend/tsconfig.json` - Config TypeScript backend
- `/frontend/vite.config.ts` - Config Vite
- `/frontend/vitest.config.ts` - Config tests frontend
- `/.github/workflows/ci.yml` - Pipeline CI/CD

**Points d'entrée** :
- `/backend/src/index.ts` - Serveur Express
- `/frontend/src/main.tsx` - Application React
- `/frontend/src/services/api.ts` - Client API

### 9. Debugging

**Backend** :
```typescript
// Utiliser console.log pour debug (retirer avant commit)
console.log('Debug:', variable);

// Logs Express
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

**Frontend** :
```typescript
// React DevTools disponible dans le navigateur
console.log('State:', state);

// Inspecter les appels API dans Network tab
```

### 10. Ressources utiles

**Documentation officielle** :
- [Prisma Docs](https://www.prisma.io/docs/)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [React Docs](https://react.dev/)
- [Vitest Docs](https://vitest.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

**Fichiers de documentation du projet** :
- `/README.md` - Vue d'ensemble et installation
- `/CONTRIBUTING.md` - Guide de contribution détaillé
- `/docs/SPECIFICATIONS.md` - Spécifications techniques
- `/docs/DEVELOPMENT_PLAN.md` - Plan de développement MVP

---

## Tâches courantes

### Ajouter un nouveau modèle Prisma

1. Éditer `/backend/prisma/schema.prisma`
2. Créer la migration : `npx prisma migrate dev --name add_model_name`
3. Le client est régénéré automatiquement
4. Ajouter les routes API dans `/backend/src/api/`
5. Ajouter les fonctions dans `/frontend/src/services/api.ts`
6. Créer les composants React si nécessaire
7. Ajouter les tests

### Ajouter une nouvelle route API

1. Créer/modifier le fichier de route dans `/backend/src/api/`
2. Ajouter le middleware d'authentification si nécessaire
3. Implémenter la logique avec Prisma
4. Ajouter le router dans `/backend/src/index.ts`
5. Créer les tests dans `/backend/src/tests/`
6. Mettre à jour le client API frontend

### Ajouter un nouveau composant React

1. Créer le composant dans `/frontend/src/components/` ou `/frontend/src/pages/`
2. Utiliser TypeScript avec des interfaces pour les props
3. Utiliser CSS Modules pour les styles (`.module.css`)
4. Ajouter le composant au routing si nécessaire
5. Créer les tests avec Vitest

### Mettre à jour les dépendances

```bash
# Vérifier les mises à jour
npm outdated

# Mettre à jour (prudence avec les versions majeures)
npm update

# Ou pour une dépendance spécifique
npm install package@latest
```

### Résoudre les problèmes de migration Prisma

```bash
# Reset de la base de développement (⚠️ perte de données)
npx prisma migrate reset

# Appliquer manuellement les migrations
npx prisma migrate deploy

# Régénérer le client uniquement
npx prisma generate
```

---

## Contact et support

- 📖 **Documentation** : Dossier `/docs`
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-org/OpenPayFit/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/votre-org/OpenPayFit/discussions)

---

**Version du document** : 1.0
**Dernière mise à jour** : 2025-11-15
**Maintenu par** : L'équipe OpenPayFit

---

*Ce document est destiné aux assistants IA travaillant sur le projet. Pour les contributions humaines, consultez [CONTRIBUTING.md](CONTRIBUTING.md).*
