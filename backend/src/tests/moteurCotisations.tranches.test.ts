/**
 * Tests unitaires pour le calcul des cotisations par tranches
 *
 * Ce fichier teste le nouveau système de tranches 1, 2, 3 basé sur le PASS
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  calculerCotisations,
  PASS_MENSUEL,
  PASS_ANNUEL,
  ParametresCalcul,
  StatutEmploye
} from '../lib/moteurCotisations';
import Database from 'better-sqlite3';
import path from 'path';

describe('Moteur de calcul des cotisations - Calcul par tranches', () => {
  let db: Database.Database;

  // IDs des entités de test
  let categorieRetraiteId: string;
  let organismeAgirc: string;
  let regleRetraiteCompId: string;

  beforeAll(() => {
    // Utiliser la base de données de test
    const dbFileName = process.env.TEST_DB_PATH || 'test.db';
    const dbPath = path.join(__dirname, '../../prisma', dbFileName);
    db = new Database(dbPath);

    // Nettoyer les tables liées aux tranches
    db.exec('DELETE FROM tranches_cotisation');
    db.exec('DELETE FROM taux_cotisation');
    db.exec('DELETE FROM regles_comptables');
    db.exec('DELETE FROM regles_cotisation');
    db.exec('DELETE FROM categories_cotisation');
    db.exec('DELETE FROM organismes_cotisation');

    // Créer les catégories de test
    categorieRetraiteId = 'cat_retraite_comp_test';
    db.prepare(`
      INSERT INTO categories_cotisation (id, code, nom, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(categorieRetraiteId, 'RETRAITE_COMP', 'Retraite complémentaire', 'Retraite complémentaire AGIRC-ARRCO');

    // Créer les organismes de test
    organismeAgirc = 'org_agirc_test';
    db.prepare(`
      INSERT INTO organismes_cotisation (id, code, nom, typeOrganisme, description, estGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(organismeAgirc, 'AGIRC_ARRCO', 'AGIRC-ARRCO', 'RETRAITE', 'Retraite complémentaire', 1);

    // Créer une règle de cotisation avec calcul par tranches
    regleRetraiteCompId = 'regle_retraite_comp_test';
    db.prepare(`
      INSERT INTO regles_cotisation (
        id, code, nom, description, categorieId, organismeId,
        typeCotisation, typeCalcul, typeAssiette, plancher, plafond, estActif,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      regleRetraiteCompId,
      'RETRAITE_COMP_TRANCHES',
      'Retraite complémentaire par tranches',
      'Retraite complémentaire calculée par tranches 1, 2, 3',
      categorieRetraiteId,
      organismeAgirc,
      'COTISATION_SALARIALE', // On testera les deux parts séparément via les tranches
      'TRANCHES',
      'SALAIRE_BRUT',
      null,
      null,
      1
    );

    // Créer les tranches pour la retraite complémentaire
    // Tranche 1 : 0 à 1 PASS (applique à tous)
    db.prepare(`
      INSERT INTO tranches_cotisation (
        id, regleId, numeroTranche, nomTranche,
        borneInferieure, borneSuperieure,
        tauxSalarial, tauxPatronal,
        appliqueCadre, appliqueNonCadre, appliqueDirigeant,
        dateDebut, dateFin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'tranche1_test',
      regleRetraiteCompId,
      1,
      'Tranche 1',
      0,
      1,
      0.0340, // 3,40% salarial
      0.0460, // 4,60% patronal
      1, // applique cadre
      1, // applique non-cadre
      1, // applique dirigeant (tranche 1 s'applique à tous)
      '2024-01-01',
      null
    );

    // Tranche 2 : 1 à 8 PASS (applique uniquement aux cadres)
    db.prepare(`
      INSERT INTO tranches_cotisation (
        id, regleId, numeroTranche, nomTranche,
        borneInferieure, borneSuperieure,
        tauxSalarial, tauxPatronal,
        appliqueCadre, appliqueNonCadre, appliqueDirigeant,
        dateDebut, dateFin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'tranche2_test',
      regleRetraiteCompId,
      2,
      'Tranche 2',
      1,
      8,
      0.0860, // 8,60% salarial
      0.1290, // 12,90% patronal
      1, // applique cadre
      0, // n'applique pas non-cadre
      0, // n'applique pas dirigeant
      '2024-01-01',
      null
    );

    // Tranche 3 : Au-delà de 8 PASS (applique uniquement aux cadres dirigeants)
    db.prepare(`
      INSERT INTO tranches_cotisation (
        id, regleId, numeroTranche, nomTranche,
        borneInferieure, borneSuperieure,
        tauxSalarial, tauxPatronal,
        appliqueCadre, appliqueNonCadre, appliqueDirigeant,
        dateDebut, dateFin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'tranche3_test',
      regleRetraiteCompId,
      3,
      'Tranche 3',
      8,
      null, // Pas de limite supérieure
      0.0100, // 1,00% salarial
      0.0150, // 1,50% patronal
      0, // n'applique pas cadre normal
      0, // n'applique pas non-cadre
      1, // applique dirigeant
      '2024-01-01',
      null
    );
  });

  afterAll(() => {
    // Nettoyer après les tests
    db.exec('DELETE FROM tranches_cotisation');
    db.exec('DELETE FROM taux_cotisation');
    db.exec('DELETE FROM regles_comptables');
    db.exec('DELETE FROM regles_cotisation');
    db.exec('DELETE FROM categories_cotisation');
    db.exec('DELETE FROM organismes_cotisation');
    db.close();
  });

  describe('Calcul par tranches - Tranche 1 uniquement (salaire < 1 PASS)', () => {
    it('devrait calculer correctement pour un non-cadre avec salaire dans la tranche 1', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000, // Inférieur à 1 PASS mensuel (3864€)
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'NON_CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation retraite comp
      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      expect(ligneRetraite).toBeDefined();

      // Calcul attendu : 3000 * 12 = 36000€ annuel (< 1 PASS)
      // Tranche 1 s'applique sur 36000€
      // Salarial : 36000 * 0.034 = 1224€ annuel = 102€ mensuel
      // Patronal : 36000 * 0.046 = 1656€ annuel = 138€ mensuel
      expect(ligneRetraite!.montantSalarial).toBeCloseTo(102, 0);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(138, 0);
    });

    it('devrait calculer correctement pour un cadre avec salaire dans la tranche 1', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      // Même résultat que pour non-cadre car seule la tranche 1 s'applique
      expect(ligneRetraite!.montantSalarial).toBeCloseTo(102, 0);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(138, 0);
    });
  });

  describe('Calcul par tranches - Tranches 1 et 2 (salaire entre 1 et 8 PASS)', () => {
    it('devrait calculer correctement pour un cadre avec salaire à cheval sur tranches 1 et 2', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 6000, // 72000€ annuel, entre 1 PASS (46368€) et 8 PASS
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      expect(ligneRetraite).toBeDefined();

      // Calcul attendu :
      // Tranche 1 : 0 à 46368€ -> 46368 * 0.034 (sal) + 46368 * 0.046 (pat)
      //   Salarial : 46368 * 0.034 = 1576.51€ annuel
      //   Patronal : 46368 * 0.046 = 2132.93€ annuel
      // Tranche 2 : 46368€ à 72000€ -> 25632€ * 0.086 (sal) + 25632 * 0.129 (pat)
      //   Salarial : 25632 * 0.086 = 2204.35€ annuel
      //   Patronal : 25632 * 0.129 = 3306.53€ annuel
      // Total annuel :
      //   Salarial : 1576.51 + 2204.35 = 3780.86€ -> 315.07€ mensuel
      //   Patronal : 2132.93 + 3306.53 = 5439.46€ -> 453.29€ mensuel

      expect(ligneRetraite!.montantSalarial).toBeCloseTo(315, 0);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(453, 0);
    });

    it('ne devrait appliquer que la tranche 1 pour un non-cadre même avec salaire élevé', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 6000,
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'NON_CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      // Pour un non-cadre, seule la tranche 1 s'applique (plafonnée à 1 PASS)
      // Tranche 1 : 0 à 46368€ (1 PASS)
      //   Salarial : 46368 * 0.034 = 1576.51€ annuel = 131.38€ mensuel
      //   Patronal : 46368 * 0.046 = 2132.93€ annuel = 177.74€ mensuel
      expect(ligneRetraite!.montantSalarial).toBeCloseTo(131.38, 1);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(177.74, 1);
    });
  });

  describe('Calcul par tranches - Très hauts salaires (> 8 PASS)', () => {
    it('devrait calculer correctement pour un cadre dirigeant avec salaire > 8 PASS', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 50000, // 600000€ annuel, bien au-delà de 8 PASS (370944€)
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE_DIRIGEANT'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      expect(ligneRetraite).toBeDefined();

      // Calcul attendu pour cadre dirigeant :
      // Tranche 1 : 0 à 46368€
      //   Salarial : 46368 * 0.034 = 1576.51€
      //   Patronal : 46368 * 0.046 = 2132.93€
      // Tranche 2 ne s'applique pas aux dirigeants
      // Tranche 3 : Au-delà de 370944€ (8 PASS) -> 600000 - 370944 = 229056€
      //   Salarial : 229056 * 0.01 = 2290.56€
      //   Patronal : 229056 * 0.015 = 3435.84€
      // Total annuel :
      //   Salarial : 1576.51 + 2290.56 = 3867.07€ -> 322.26€ mensuel
      //   Patronal : 2132.93 + 3435.84 = 5568.77€ -> 464.06€ mensuel

      expect(ligneRetraite!.montantSalarial).toBeCloseTo(322, 0);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(464, 0);
    });

    it('ne devrait pas appliquer la tranche 3 pour un cadre normal', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 50000,
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      // Pour un cadre normal, tranches 1 et 2 seulement (plafond à 8 PASS)
      // Tranche 1 : 0 à 46368€
      //   Salarial : 46368 * 0.034 = 1576.51€
      //   Patronal : 46368 * 0.046 = 2132.93€
      // Tranche 2 : 46368€ à 370944€ (8 PASS) -> 324576€
      //   Salarial : 324576 * 0.086 = 27913.54€
      //   Patronal : 324576 * 0.129 = 41870.30€
      // Total annuel :
      //   Salarial : 1576.51 + 27913.54 = 29490.05€ -> 2457.50€ mensuel
      //   Patronal : 2132.93 + 41870.30 = 44003.23€ -> 3666.94€ mensuel

      expect(ligneRetraite!.montantSalarial).toBeCloseTo(2457.50, 1);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(3666.94, 1);
    });
  });

  describe('Calcul par tranches - Cas limites', () => {
    it('devrait gérer un salaire exactement égal à 1 PASS', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: PASS_MENSUEL, // Exactement 1 PASS mensuel
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      // Exactement 1 PASS annuel, seule la tranche 1 s'applique
      expect(ligneRetraite).toBeDefined();
      expect(ligneRetraite!.montantSalarial).toBeGreaterThan(0);
    });

    it('devrait gérer un salaire de 0€', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 0,
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'CADRE'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      if (ligneRetraite) {
        expect(ligneRetraite.montantSalarial).toBe(0);
        expect(ligneRetraite.montantPatronal).toBe(0);
      }
    });
  });

  describe('Calcul par tranches - Tous les statuts', () => {
    it('devrait gérer le statut FORFAIT_JOURS comme un cadre', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 6000,
        dateReference: new Date('2025-01-15'),
        statutEmploye: 'FORFAIT_JOURS'
      };

      const resultat = await calculerCotisations(parametres);

      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_COMP_TRANCHES'
      );

      // Forfait jours devrait avoir le même traitement qu'un cadre
      expect(ligneRetraite).toBeDefined();
      expect(ligneRetraite!.montantSalarial).toBeCloseTo(315, 0);
      expect(ligneRetraite!.montantPatronal).toBeCloseTo(453, 0);
    });
  });
});
