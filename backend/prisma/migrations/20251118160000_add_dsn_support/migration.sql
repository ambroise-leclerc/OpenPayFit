-- Migration pour ajouter le support de la DSN (Déclaration Sociale Nominative)
-- Ajoute les champs nécessaires aux tables Company et Employee
-- Crée la table dsn_declarations
-- Crée les enums TypeContrat, TypeDeclarationDSN, StatutDSN

-- Note: SQLite ne supporte pas les enums natifs, la validation se fait au niveau applicatif

-- Enum TypeContrat (CDI, CDD, INTERIM, APPRENTISSAGE, PROFESSIONNALISATION, STAGE)
-- Enum TypeDeclarationDSN (MENSUELLE, EVENEMENTIELLE)
-- Enum StatutDSN (BROUILLON, VALIDEE, TRANSMISE, ERREUR)

-- RedefineTables
PRAGMA foreign_keys=OFF;

-- ========== Mise à jour de la table Company ==========

-- Créer une nouvelle table temporaire avec les nouveaux champs DSN
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "siret" TEXT,
    "codeNaf" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "conventionCollective" TEXT,
    "numeroUrssaf" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copier les données existantes
INSERT INTO "new_Company" ("id", "name", "ownerId", "createdAt", "updatedAt")
SELECT "id", "name", "ownerId", "createdAt", "updatedAt"
FROM "Company";

-- Supprimer l'ancienne table
DROP TABLE "Company";

-- Renommer la nouvelle table
ALTER TABLE "new_Company" RENAME TO "Company";

-- Recréer les index
CREATE UNIQUE INDEX "Company_siret_key" ON "Company"("siret");

-- ========== Mise à jour de la table Employee ==========

-- Créer une nouvelle table temporaire avec les nouveaux champs DSN
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "grossSalary" REAL NOT NULL,
    "department" TEXT,
    "numeroSecuriteSociale" TEXT,
    "dateNaissance" DATETIME,
    "lieuNaissance" TEXT,
    "nationalite" TEXT,
    "typeContrat" TEXT,
    "dateEmbauche" DATETIME,
    "dateFinContrat" DATETIME,
    "numeroMatricule" TEXT,
    "poste" TEXT,
    "qualification" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copier les données existantes
INSERT INTO "new_Employee" ("id", "firstName", "lastName", "email", "grossSalary", "department", "companyId", "createdAt", "updatedAt")
SELECT "id", "firstName", "lastName", "email", "grossSalary", "department", "companyId", "createdAt", "updatedAt"
FROM "Employee";

-- Supprimer l'ancienne table
DROP TABLE "Employee";

-- Renommer la nouvelle table
ALTER TABLE "new_Employee" RENAME TO "Employee";

-- Recréer les index
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_numeroSecuriteSociale_key" ON "Employee"("numeroSecuriteSociale");

-- ========== Création de la table dsn_declarations ==========

CREATE TABLE "dsn_declarations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "periodeDeclaration" TEXT NOT NULL,
    "typeDeclaration" TEXT NOT NULL DEFAULT 'MENSUELLE',
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "contenuXml" TEXT,
    "messagesValidation" TEXT,
    "numeroDeclaration" TEXT,
    "dateGeneration" DATETIME,
    "dateTransmission" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dsn_declarations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Créer les index pour dsn_declarations
CREATE UNIQUE INDEX "dsn_declarations_companyId_periodeDeclaration_typeDeclaration_key" ON "dsn_declarations"("companyId", "periodeDeclaration", "typeDeclaration");
CREATE INDEX "dsn_declarations_companyId_idx" ON "dsn_declarations"("companyId");
CREATE INDEX "dsn_declarations_statut_idx" ON "dsn_declarations"("statut");
CREATE INDEX "dsn_declarations_periodeDeclaration_idx" ON "dsn_declarations"("periodeDeclaration");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
