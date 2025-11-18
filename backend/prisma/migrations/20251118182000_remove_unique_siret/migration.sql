-- Suppression de la contrainte UNIQUE sur le champ SIRET
-- Le SIRET est nullable et la validation d'unicité se fait au niveau applicatif

DROP INDEX IF EXISTS "Company_siret_key";
