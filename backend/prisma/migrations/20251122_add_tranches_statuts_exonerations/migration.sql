-- Migration pour ajouter le support des tranches A, B, C, statuts d'employés et exonérations
-- Implémente les fonctionnalités de l'issue #44 : Calculateur de cotisations avancé avec tranches A, B, C

-- Nouveaux enums :
-- - StatutEmploye (NON_CADRE, CADRE, FORFAIT_JOURS)
-- - TrancheSalariale (TRANCHE_A, TRANCHE_B, TRANCHE_C)
-- - TypeExoneration (ACCRE_ACRE, ZRR, ZFU, BER, ZRD, APPRENTI, PROFESSIONNALISATION, AUTRE)

-- Note: SQLite ne supporte pas les enums natifs, la validation se fait au niveau applicatif

PRAGMA foreign_keys=OFF;

-- ========== Modification de la table Employee ==========

-- Ajouter le champ statut à la table Employee
ALTER TABLE "Employee" ADD COLUMN "statut" TEXT NOT NULL DEFAULT 'NON_CADRE';

-- ========== Modification de la table regles_cotisation ==========

-- Ajouter les champs applicableACadre, applicableANonCadre, applicableAForfaitJours
ALTER TABLE "regles_cotisation" ADD COLUMN "applicableACadre" BOOLEAN;
ALTER TABLE "regles_cotisation" ADD COLUMN "applicableANonCadre" BOOLEAN;
ALTER TABLE "regles_cotisation" ADD COLUMN "applicableAForfaitJours" BOOLEAN;

-- ========== Création de la table tranches_cotisation ==========

CREATE TABLE "tranches_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "tranche" TEXT NOT NULL,
    "taux" REAL NOT NULL,
    "plancherPASS" REAL NOT NULL DEFAULT 0,
    "plafondPASS" REAL NOT NULL,
    "ordre" INTEGER NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tranches_cotisation_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_cotisation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Créer les index pour tranches_cotisation
CREATE UNIQUE INDEX "tranches_cotisation_regleId_tranche_dateDebut_key" ON "tranches_cotisation"("regleId", "tranche", "dateDebut");
CREATE INDEX "tranches_cotisation_regleId_dateDebut_idx" ON "tranches_cotisation"("regleId", "dateDebut");

-- ========== Création de la table definitions_exoneration ==========

CREATE TABLE "definitions_exoneration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "nom" TEXT NOT NULL,
    "typeExoneration" TEXT NOT NULL,
    "description" TEXT,
    "tauxReduction" REAL,
    "plafondSalarial" REAL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Créer les index pour definitions_exoneration
CREATE INDEX "definitions_exoneration_typeExoneration_idx" ON "definitions_exoneration"("typeExoneration");

-- ========== Création de la table exonerations_employe ==========

CREATE TABLE "exonerations_employe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeId" TEXT NOT NULL,
    "definitionExonerationId" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "commentaires" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exonerations_employe_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exonerations_employe_definitionExonerationId_fkey" FOREIGN KEY ("definitionExonerationId") REFERENCES "definitions_exoneration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Créer les index pour exonerations_employe
CREATE INDEX "exonerations_employe_employeId_idx" ON "exonerations_employe"("employeId");
CREATE INDEX "exonerations_employe_definitionExonerationId_idx" ON "exonerations_employe"("definitionExonerationId");
CREATE INDEX "exonerations_employe_dateDebut_dateFin_idx" ON "exonerations_employe"("dateDebut", "dateFin");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
