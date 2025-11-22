-- Migration pour ajouter le support des événements DSN
-- Crée la table dsn_events pour stocker les événements RH (embauche, fin de contrat, arrêt maladie, etc.)
-- Crée les enums TypeEvenementDSN et StatutEvenementDSN

-- Note: SQLite ne supporte pas les enums natifs, la validation se fait au niveau applicatif

-- Enum TypeEvenementDSN (EMBAUCHE, FIN_CONTRAT, ARRET_MALADIE, CONGE_MATERNITE, CONGE_PATERNITE, CHANGEMENT_CONTRAT, AUTRE)
-- Enum StatutEvenementDSN (BROUILLON, VALIDE, DECLARE, ERREUR)

PRAGMA foreign_keys=OFF;

-- ========== Création de la table dsn_events ==========

CREATE TABLE "dsn_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeId" TEXT NOT NULL,
    "compagnieId" TEXT NOT NULL,
    "typeEvenement" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateEvenement" DATETIME NOT NULL,
    "dateDeclaration" DATETIME,
    "donneesSpecifiques" TEXT,
    "motif" TEXT,
    "commentaires" TEXT,
    "declarationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "dsn_events_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dsn_events_compagnieId_fkey" FOREIGN KEY ("compagnieId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "dsn_events_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "dsn_declarations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Créer les index pour dsn_events
CREATE INDEX "dsn_events_employeId_idx" ON "dsn_events"("employeId");
CREATE INDEX "dsn_events_compagnieId_idx" ON "dsn_events"("compagnieId");
CREATE INDEX "dsn_events_typeEvenement_idx" ON "dsn_events"("typeEvenement");
CREATE INDEX "dsn_events_statut_idx" ON "dsn_events"("statut");
CREATE INDEX "dsn_events_dateEvenement_idx" ON "dsn_events"("dateEvenement");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
