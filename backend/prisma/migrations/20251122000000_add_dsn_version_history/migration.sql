-- Migration pour ajouter le support de l'historique des versions DSN
-- Crée la table dsn_versions pour tracer toutes les modifications apportées aux DSN
-- Crée l'enum TypeModificationDSN

-- Note: SQLite ne supporte pas les enums natifs, la validation se fait au niveau applicatif

-- Enum TypeModificationDSN (CREATION, MODIFICATION, REGENERATION, RESTAURATION)

PRAGMA foreign_keys=OFF;

-- ========== Création de la table dsn_versions ==========

CREATE TABLE "dsn_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationId" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "typeModification" TEXT NOT NULL DEFAULT 'MODIFICATION',
    "contenuXml" TEXT,
    "messagesValidation" TEXT,
    "statut" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "commentaire" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dsn_versions_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "dsn_declarations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dsn_versions_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Créer la contrainte unique sur (declarationId, numeroVersion)
CREATE UNIQUE INDEX "dsn_versions_declarationId_numeroVersion_key" ON "dsn_versions"("declarationId", "numeroVersion");

-- Créer les index pour dsn_versions
CREATE INDEX "dsn_versions_declarationId_idx" ON "dsn_versions"("declarationId");
CREATE INDEX "dsn_versions_auteurId_idx" ON "dsn_versions"("auteurId");
CREATE INDEX "dsn_versions_createdAt_idx" ON "dsn_versions"("createdAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
