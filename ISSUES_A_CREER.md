# Issues à créer sur GitHub

Ce document contient 5 issues prêtes à être créées sur GitHub pour les prochains développements d'OpenPayFit.

---

## Issue #1 : Finaliser le moteur de paie MVP

**Titre :** Finaliser le moteur de paie MVP

**Labels :** `enhancement`, `backend`, `paie`

**Description :**

### Description
Compléter l'implémentation du moteur de paie MVP avec calculs automatisés des salaires et cotisations sociales.

### Contexte
Actuellement, un module de paie simplifié existe avec un calcul basique (net = brut - 25%). Il est nécessaire de l'améliorer pour inclure des calculs plus précis et conformes à la législation française.

### Tâches
- [ ] Améliorer le calcul des cotisations sociales (salariales et patronales)
- [ ] Ajouter les tranches de cotisations URSSAF
- [ ] Implémenter le calcul du plafond de sécurité sociale
- [ ] Ajouter les tests unitaires pour les calculs
- [ ] Créer l'API endpoint `/api/companies/:companyId/payroll/calculate`
- [ ] Documenter les formules de calcul utilisées

### Critères d'acceptation
- Les calculs de paie respectent les taux de cotisations 2025
- Tous les tests passent avec une couverture > 80%
- La documentation explique clairement les formules
- L'API retourne les détails complets (brut, cotisations, net)

### Priorité
🔴 Haute - Fonctionnalité MVP critique

---

## Issue #2 : Implémenter la gestion des congés et absences

**Titre :** Implémenter la gestion des congés et absences

**Labels :** `feature`, `backend`, `frontend`, `RH`

**Description :**

### Description
Développer un module complet de gestion des congés payés et absences pour les employés.

### Contexte
La gestion des congés est une fonctionnalité essentielle pour toute solution RH. Elle doit permettre aux employés de poser des congés et aux gestionnaires de les valider.

### Tâches

#### Backend
- [ ] Créer le modèle Prisma `LeaveRequest` (type, start, end, status, reason)
- [ ] Créer le modèle `LeaveBalance` (soldés de congés par employé)
- [ ] Ajouter les migrations de base de données
- [ ] Implémenter les routes API :
  - `GET /api/companies/:companyId/employees/:employeeId/leaves`
  - `POST /api/companies/:companyId/employees/:employeeId/leaves`
  - `PUT /api/companies/:companyId/employees/:employeeId/leaves/:leaveId`
  - `DELETE /api/companies/:companyId/employees/:employeeId/leaves/:leaveId`
- [ ] Ajouter la logique de calcul des soldes de congés
- [ ] Créer les tests backend

#### Frontend
- [ ] Créer le composant `LeaveRequestForm`
- [ ] Créer le composant `LeaveList`
- [ ] Ajouter les fonctions API dans `services/api.ts`
- [ ] Intégrer dans le Dashboard
- [ ] Créer les tests frontend

### Critères d'acceptation
- Un employé peut consulter son solde de congés
- Un employé peut soumettre une demande de congés
- Un gestionnaire peut approuver/rejeter les demandes
- Les soldes sont calculés automatiquement (25 jours ouvrés/an)
- Interface intuitive et responsive

### Priorité
🟠 Moyenne - Roadmap prioritaire

---

## Issue #3 : Ajouter la gestion des notes de frais

**Titre :** Ajouter la gestion des notes de frais

**Labels :** `feature`, `backend`, `frontend`, `RH`

**Description :**

### Description
Développer un module de gestion des notes de frais permettant aux employés de soumettre leurs dépenses professionnelles et aux gestionnaires de les valider.

### Contexte
La gestion des notes de frais est essentielle pour le remboursement des dépenses professionnelles et la comptabilité de l'entreprise.

### Tâches

#### Backend
- [ ] Créer le modèle Prisma `ExpenseReport` (employeeId, date, total, status)
- [ ] Créer le modèle `ExpenseItem` (reportId, type, amount, description, receipt)
- [ ] Ajouter les migrations de base de données
- [ ] Implémenter les routes API :
  - `GET /api/companies/:companyId/expenses`
  - `POST /api/companies/:companyId/expenses`
  - `PUT /api/companies/:companyId/expenses/:expenseId`
  - `DELETE /api/companies/:companyId/expenses/:expenseId`
- [ ] Gérer l'upload de fichiers (justificatifs PDF/images)
- [ ] Créer les tests backend

#### Frontend
- [ ] Créer le composant `ExpenseReportForm`
- [ ] Créer le composant `ExpenseList`
- [ ] Implémenter l'upload de fichiers
- [ ] Ajouter les fonctions API dans `services/api.ts`
- [ ] Créer une page dédiée `/expenses`
- [ ] Créer les tests frontend

### Critères d'acceptation
- Un employé peut créer une note de frais avec plusieurs lignes
- Support des catégories (transport, repas, hébergement, etc.)
- Upload de justificatifs (PDF, JPG, PNG)
- Workflow de validation (soumis → approuvé → remboursé)
- Export des notes de frais validées

### Priorité
🟠 Moyenne - Roadmap prioritaire

---

## Issue #4 : Créer un dashboard analytics et indicateurs RH

**Titre :** Créer un dashboard analytics et indicateurs RH

**Labels :** `feature`, `backend`, `frontend`, `analytics`

**Description :**

### Description
Développer un tableau de bord avec des indicateurs clés de performance (KPI) et des statistiques RH pour aider les gestionnaires à piloter leur entreprise.

### Contexte
Les décideurs ont besoin de visualiser rapidement les indicateurs RH importants : masse salariale, turnover, absences, etc.

### Tâches

#### Backend
- [ ] Créer les endpoints d'analytics :
  - `GET /api/companies/:companyId/analytics/payroll` (évolution masse salariale)
  - `GET /api/companies/:companyId/analytics/headcount` (effectifs)
  - `GET /api/companies/:companyId/analytics/leaves` (statistiques congés)
  - `GET /api/companies/:companyId/analytics/expenses` (statistiques notes de frais)
- [ ] Implémenter les agrégations de données
- [ ] Optimiser les requêtes pour les gros volumes
- [ ] Créer les tests backend

#### Frontend
- [ ] Créer le composant `AnalyticsDashboard`
- [ ] Intégrer une bibliothèque de graphiques (Chart.js ou Recharts)
- [ ] Créer les widgets :
  - Graphique évolution masse salariale
  - Graphique effectifs par département
  - Indicateur taux d'absence
  - Tableau top dépenses
- [ ] Ajouter des filtres par période
- [ ] Rendre le dashboard responsive
- [ ] Créer les tests frontend

### Critères d'acceptation
- Les graphiques se chargent rapidement (< 2s)
- Les données sont filtrables par période (mois, trimestre, année)
- Interface claire et intuitive
- Export des données en CSV
- Responsive sur mobile et tablette

### Priorité
🟡 Basse - Nice to have

---

## Issue #5 : Développer les intégrations comptables (Sage, QuickBooks)

**Titre :** Développer les intégrations comptables (Sage, QuickBooks)

**Labels :** `feature`, `backend`, `integration`, `comptabilité`

**Description :**

### Description
Implémenter des connecteurs pour exporter les données de paie et notes de frais vers les logiciels comptables Sage et QuickBooks.

### Contexte
L'intégration avec les outils comptables est cruciale pour automatiser la saisie des écritures comptables et éviter la double saisie.

### Tâches

#### Backend
- [ ] Créer le modèle Prisma `AccountingIntegration` (type, config, status)
- [ ] Implémenter le connecteur Sage :
  - Export des écritures de paie au format Sage
  - Mapping des comptes comptables
  - Génération fichier TRA ou PNM
- [ ] Implémenter le connecteur QuickBooks :
  - Utiliser l'API QuickBooks Online
  - OAuth 2.0 pour l'authentification
  - Export des transactions
- [ ] Créer les routes API :
  - `POST /api/companies/:companyId/integrations/accounting`
  - `GET /api/companies/:companyId/integrations/accounting`
  - `POST /api/companies/:companyId/integrations/accounting/export`
- [ ] Créer les tests backend

#### Frontend
- [ ] Créer le composant `IntegrationSettings`
- [ ] Créer le formulaire de configuration Sage/QuickBooks
- [ ] Ajouter une page `/settings/integrations`
- [ ] Implémenter le flow OAuth pour QuickBooks
- [ ] Créer les tests frontend

#### Documentation
- [ ] Documenter le format d'export Sage
- [ ] Documenter la configuration QuickBooks
- [ ] Créer un guide d'utilisation

### Critères d'acceptation
- Export réussi des écritures de paie vers Sage
- Connexion OAuth fonctionnelle avec QuickBooks
- Mapping configurable des comptes comptables
- Logs d'export consultables
- Gestion des erreurs et retry automatique

### Priorité
🟡 Basse - Future évolution

---

## Instructions pour créer les issues

1. Rendez-vous sur https://github.com/votre-org/OpenPayFit/issues/new
2. Copiez le titre de l'issue
3. Copiez le contenu de la description
4. Ajoutez les labels correspondants
5. Créez l'issue

Répétez pour chacune des 5 issues ci-dessus.
