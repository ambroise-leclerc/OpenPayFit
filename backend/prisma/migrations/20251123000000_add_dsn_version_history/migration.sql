-- Migration pour ajouter le support de l'historique des versions DSN
-- Crée la table dsn_versions pour stocker l'historique complet des modifications
-- Chaque modification d'une DSN crée une nouvelle version pour traçabilité et audit

PRAGMA foreign_keys=OFF;

-- ========== Création de la table dsn_versions ==========

CREATE TABLE "dsn_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationId" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "contenuXml" TEXT,
    "messagesValidation" TEXT,
    "statut" TEXT NOT NULL,
    "modifiePar" TEXT,
    "raisonModification" TEXT,
    "commentaire" TEXT,
    "champsModifies" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dsn_versions_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "dsn_declarations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Créer les index pour dsn_versions
CREATE INDEX "dsn_versions_declarationId_idx" ON "dsn_versions"("declarationId");
CREATE INDEX "dsn_versions_createdAt_idx" ON "dsn_versions"("createdAt");

-- Créer une contrainte unique sur (declarationId, numeroVersion)
CREATE UNIQUE INDEX "dsn_versions_declarationId_numeroVersion_key" ON "dsn_versions"("declarationId", "numeroVersion");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
