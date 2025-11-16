-- Migration vers le système de fiches de paie détaillées
-- Ajoute les colonnes pour le nouveau système de calcul détaillé des cotisations

-- Ajouter les nouvelles colonnes à la table Payslip (qui est mappée au modèle FichePaie)
ALTER TABLE "Payslip" ADD COLUMN "totalCotisationsSalariales" REAL;
ALTER TABLE "Payslip" ADD COLUMN "totalCotisationsPatronales" REAL;
ALTER TABLE "Payslip" ADD COLUMN "totalChargesFiscales" REAL;
ALTER TABLE "Payslip" ADD COLUMN "coutTotal" REAL;

-- Ajouter la colonne updatedAt si elle n'existe pas déjà
-- (elle devrait exister via une migration précédente, mais on ajoute par sécurité)
-- ALTER TABLE "Payslip" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Créer la table pour les lignes de cotisation détaillées
CREATE TABLE IF NOT EXISTS "lignes_cotisation_fiche_paie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fichePaieId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "organisme" TEXT NOT NULL,
    "typeCotisation" TEXT NOT NULL,
    "assiette" REAL NOT NULL,
    "taux" REAL NOT NULL,
    "montantSalarial" REAL NOT NULL,
    "montantPatronal" REAL NOT NULL,
    "montantTotal" REAL NOT NULL,
    "compteDebit" TEXT,
    "compteCredit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lignes_cotisation_fiche_paie_fichePaieId_fkey"
        FOREIGN KEY ("fichePaieId")
        REFERENCES "Payslip" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Créer un index sur fichePaieId pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS "lignes_cotisation_fiche_paie_fichePaieId_idx"
    ON "lignes_cotisation_fiche_paie"("fichePaieId");

-- Note: Les fiches de paie existantes conserveront leurs données dans les colonnes
-- 'deductions' et 'netSalary' pour compatibilité. Les nouvelles fiches de paie
-- utiliseront les colonnes 'totalCotisationsSalariales', 'totalCotisationsPatronales',
-- 'totalChargesFiscales' et 'coutTotal' avec des lignes de cotisation détaillées.
