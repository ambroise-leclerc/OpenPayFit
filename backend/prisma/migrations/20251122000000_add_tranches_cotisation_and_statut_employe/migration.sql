-- CreateEnum pour StatutEmploye
-- Note: SQLite ne supporte pas les ENUMs natifs, ils sont gérés comme des contraintes CHECK par Prisma

-- Ajouter la colonne statutEmploye à la table Employee
-- Utilise une transaction PRAGMA pour modifier la table en toute sécurité
PRAGMA foreign_keys=OFF;

-- Créer une nouvelle table temporaire avec la nouvelle colonne
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
    "statutEmploye" TEXT NOT NULL DEFAULT 'NON_CADRE',
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copier les données existantes
INSERT INTO "new_Employee" SELECT
    "id",
    "firstName",
    "lastName",
    "email",
    "grossSalary",
    "department",
    "numeroSecuriteSociale",
    "dateNaissance",
    "lieuNaissance",
    "nationalite",
    "typeContrat",
    "dateEmbauche",
    "dateFinContrat",
    "numeroMatricule",
    "poste",
    "qualification",
    'NON_CADRE' as "statutEmploye",
    "companyId",
    "createdAt",
    "updatedAt"
FROM "Employee";

-- Supprimer l'ancienne table
DROP TABLE "Employee";

-- Renommer la nouvelle table
ALTER TABLE "new_Employee" RENAME TO "Employee";

-- Recréer les index et contraintes uniques
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE UNIQUE INDEX "Employee_numeroSecuriteSociale_key" ON "Employee"("numeroSecuriteSociale");

-- Créer la nouvelle table tranches_cotisation
CREATE TABLE "tranches_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "numeroTranche" INTEGER NOT NULL,
    "nomTranche" TEXT NOT NULL,
    "borneInferieure" REAL NOT NULL,
    "borneSuperieure" REAL,
    "tauxSalarial" REAL NOT NULL DEFAULT 0,
    "tauxPatronal" REAL NOT NULL DEFAULT 0,
    "appliqueCadre" BOOLEAN NOT NULL DEFAULT true,
    "appliqueNonCadre" BOOLEAN NOT NULL DEFAULT true,
    "appliqueDirigeant" BOOLEAN NOT NULL DEFAULT false,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tranches_cotisation_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_cotisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Créer les index pour tranches_cotisation
CREATE UNIQUE INDEX "tranches_cotisation_regleId_numeroTranche_dateDebut_key" ON "tranches_cotisation"("regleId", "numeroTranche", "dateDebut");
CREATE INDEX "tranches_cotisation_regleId_dateDebut_idx" ON "tranches_cotisation"("regleId", "dateDebut");

PRAGMA foreign_keys=ON;
