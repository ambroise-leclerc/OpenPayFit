-- CreateEnum TypeOrganisme
-- Note: SQLite ne supporte pas les enums natifs, la validation se fait au niveau applicatif
-- Les valeurs possibles sont: URSSAF, RETRAITE, CHOMAGE, PREVOYANCE, MUTUELLE, FORMATION, AUTRE

-- RedefineTables
PRAGMA foreign_keys=OFF;

-- Créer une nouvelle table temporaire avec les nouveaux champs
CREATE TABLE "new_organismes_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "typeOrganisme" TEXT NOT NULL DEFAULT 'AUTRE',
    "description" TEXT,
    "estGlobal" BOOLEAN NOT NULL DEFAULT 0,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "numeroSiret" TEXT,
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organismes_cotisation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copier les données existantes (si elles existent)
INSERT INTO "new_organismes_cotisation" ("id", "code", "nom", "description", "createdAt", "updatedAt", "typeOrganisme", "estGlobal")
SELECT "id", "code", "nom", "description", "createdAt", "updatedAt", 'AUTRE', 0
FROM "organismes_cotisation";

-- Supprimer l'ancienne table
DROP TABLE "organismes_cotisation";

-- Renommer la nouvelle table
ALTER TABLE "new_organismes_cotisation" RENAME TO "organismes_cotisation";

-- Recréer les index
CREATE UNIQUE INDEX "organismes_cotisation_code_key" ON "organismes_cotisation"("code");
CREATE INDEX "organismes_cotisation_companyId_idx" ON "organismes_cotisation"("companyId");
CREATE INDEX "organismes_cotisation_estGlobal_idx" ON "organismes_cotisation"("estGlobal");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

