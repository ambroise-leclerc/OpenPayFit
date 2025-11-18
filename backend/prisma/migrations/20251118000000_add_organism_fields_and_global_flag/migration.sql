-- CreateEnum TypeOrganisme
-- AlterTable organismes_cotisation

-- Ajouter les nouvelles colonnes
ALTER TABLE "organismes_cotisation" ADD COLUMN "typeOrganisme" TEXT NOT NULL DEFAULT 'AUTRE';
ALTER TABLE "organismes_cotisation" ADD COLUMN "estGlobal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organismes_cotisation" ADD COLUMN "adresse" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "codePostal" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "ville" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "telephone" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "email" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "siteWeb" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "numeroSiret" TEXT;
ALTER TABLE "organismes_cotisation" ADD COLUMN "companyId" TEXT;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE "organismes_cotisation" ADD CONSTRAINT "organismes_cotisation_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Créer les index
CREATE INDEX "organismes_cotisation_companyId_idx" ON "organismes_cotisation"("companyId");
CREATE INDEX "organismes_cotisation_estGlobal_idx" ON "organismes_cotisation"("estGlobal");
