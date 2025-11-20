-- Migration SQLite pour la transmission automatique DSN

-- CreateTable TransmissionDSN
CREATE TABLE "transmissions_dsn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "declarationId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "dateTransmission" DATETIME,
    "dateAccuseReception" DATETIME,
    "dateDerniereVerification" DATETIME,
    "idTransmission" TEXT,
    "numeroProtocole" TEXT,
    "accuse" TEXT,
    "codeRetour" TEXT,
    "messagesRetour" TEXT,
    "nombreTentatives" INTEGER NOT NULL DEFAULT 0,
    "derniereErreur" TEXT,
    "prochaineTentative" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transmissions_dsn_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "dsn_declarations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable ConfigurationNetEntreprises
CREATE TABLE "configurations_net_entreprises" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compagnieId" TEXT NOT NULL,
    "siretDeclarant" TEXT NOT NULL,
    "numeroAdhesion" TEXT,
    "typeCertificat" TEXT NOT NULL DEFAULT 'PEM',
    "certificat" TEXT,
    "clePrivee" TEXT,
    "motDePasseCertificat" TEXT,
    "urlApi" TEXT NOT NULL DEFAULT 'https://www.net-entreprises.fr/api/dsn',
    "modeTest" INTEGER NOT NULL DEFAULT 1,
    "estActif" INTEGER NOT NULL DEFAULT 0,
    "derniereVerification" DATETIME,
    "derniereErreur" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "configurations_net_entreprises_compagnieId_fkey" FOREIGN KEY ("compagnieId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "transmissions_dsn_declarationId_idx" ON "transmissions_dsn"("declarationId");

-- CreateIndex
CREATE INDEX "transmissions_dsn_statut_idx" ON "transmissions_dsn"("statut");

-- CreateIndex
CREATE INDEX "transmissions_dsn_dateTransmission_idx" ON "transmissions_dsn"("dateTransmission");

-- CreateIndex
CREATE UNIQUE INDEX "configurations_net_entreprises_compagnieId_key" ON "configurations_net_entreprises"("compagnieId");
