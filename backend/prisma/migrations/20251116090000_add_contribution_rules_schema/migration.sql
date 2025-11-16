-- CreateTable
CREATE TABLE "categories_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "organismes_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "regles_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorieId" TEXT NOT NULL,
    "organismeId" TEXT NOT NULL,
    "typeCotisation" TEXT NOT NULL,
    "typeCalcul" TEXT NOT NULL,
    "typeAssiette" TEXT NOT NULL,
    "plancher" REAL,
    "plafond" REAL,
    "estActif" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "regles_cotisation_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_cotisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "regles_cotisation_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "organismes_cotisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "taux_cotisation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "taux" REAL NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "taux_cotisation_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_cotisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "regles_comptables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regleId" TEXT NOT NULL,
    "compteDebit" TEXT NOT NULL,
    "compteCredit" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "regles_comptables_regleId_fkey" FOREIGN KEY ("regleId") REFERENCES "regles_cotisation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_cotisation_code_key" ON "categories_cotisation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organismes_cotisation_code_key" ON "organismes_cotisation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regles_cotisation_code_key" ON "regles_cotisation"("code");

-- CreateIndex
CREATE INDEX "taux_cotisation_regleId_dateDebut_idx" ON "taux_cotisation"("regleId", "dateDebut");
