# Spécifications Techniques - OpenPayFit MVP

Ce document détaille les spécifications techniques (modèles de données et API) pour les fonctionnalités clés du MVP.

---

### 1. Authentification

#### Modèles de Données

*   **`User`**
    *   `id`: UUID (Clé primaire)
    *   `email`: String (Unique)
    *   `passwordHash`: String
    *   `name`: String
    *   `createdAt`: DateTime
    *   `updatedAt`: DateTime

#### Endpoints API

*   `POST /api/auth/register`
    *   **Body** : `{ "email": "...", "password": "...", "name": "..." }`
    *   **Réponse (Succès)** : `{ "token": "..." }` (JWT)
    *   **Réponse (Erreur)** : `400` (Données invalides), `409` (Email déjà utilisé)

*   `POST /api/auth/login`
    *   **Body** : `{ "email": "...", "password": "..." }`
    *   **Réponse (Succès)** : `{ "token": "..." }` (JWT)
    *   **Réponse (Erreur)** : `401` (Identifiants incorrects)

---

### 2. Gestion Entreprise & Employés

#### Modèles de Données

*   **`Company`**
    *   `id`: UUID
    *   `name`: String
    *   `ownerId`: UUID (Relation avec `User`)
    *   `employees`: Relation (un-à-plusieurs avec `Employee`)

*   **`Employee`**
    *   `id`: UUID
    *   `firstName`: String
    *   `lastName`: String
    *   `email`: String
    *   `grossSalary`: Float (Salaire brut mensuel)
    *   `companyId`: UUID (Relation avec `Company`)

#### Endpoints API (Protégés par authentification)

*   `GET /api/employees`
    *   **Réponse** : `[ { "id": "...", "firstName": "...", ... } ]`

*   `POST /api/employees`
    *   **Body** : `{ "firstName": "...", "lastName": "...", ... }`
    *   **Réponse** : `{ "id": "...", ... }` (L'employé créé)

*   `PUT /api/employees/:id`
    *   **Body** : `{ "firstName": "...", ... }` (Champs à mettre à jour)
    *   **Réponse** : `{ "id": "...", ... }` (L'employé mis à jour)

*   `DELETE /api/employees/:id`
    *   **Réponse** : `204 No Content`

---

### 3. Moteur de Paie (MVP)

#### Modèles de Données

*   **`Payslip`**
    *   `id`: UUID
    *   `payPeriod`: String (ex: "2025-08")
    *   `grossSalary`: Float
    *   `deductions`: Float
    *   `netSalary`: Float
    *   `employeeId`: UUID (Relation avec `Employee`)
    *   `createdAt`: DateTime

#### Endpoints API (Protégés par authentification)

*   `POST /api/payroll/run`
    *   **Body** : `{ "period": "2025-08" }`
    *   **Réponse** : `{ "status": "success", "payslipsGenerated": 12 }`

*   `GET /api/payslips`
    *   **Query Params** : `?period=2025-08`
    *   **Réponse** : `[ { "id": "...", "employeeId": "...", ... } ]`

*   `GET /api/payslips/:id`
    *   **Réponse** : `{ "id": "...", ... }` (Détails complets de la fiche de paie)
