/**
 * Tests unitaires du moteur de calcul des cotisations
 *
 * Note : Ces tests utilisent better-sqlite3 directement (comme les autres tests)
 * au lieu du client Prisma pour éviter les problèmes de génération dans le CI.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  calculerCotisations,
  genererFichePaieTexte,
  PASS_MENSUEL,
  PASS_ANNUEL,
  ParametresCalcul,
  ResultatCalcul
} from '../lib/moteurCotisations';
import Database from 'better-sqlite3';
import path from 'path';

describe('Moteur de calcul des cotisations', () => {
  let db: Database.Database;

  // IDs des entités de test
  let categorieSSId: string;
  let categorieRetraiteId: string;
  let organismeUrssafId: string;
  let organismeAgircId: string;

  beforeAll(() => {
    // Utiliser la base de données de test
    const dbFileName = process.env.TEST_DB_PATH || 'test.db';
    const dbPath = path.join(__dirname, '../../prisma', dbFileName);
    db = new Database(dbPath);

    // Nettoyer la base de données
    db.exec('DELETE FROM taux_cotisation');
    db.exec('DELETE FROM regles_comptables');
    db.exec('DELETE FROM regles_cotisation');
    db.exec('DELETE FROM categories_cotisation');
    db.exec('DELETE FROM organismes_cotisation');

    // Créer les catégories de test
    const insertCategorie = db.prepare(`
      INSERT INTO categories_cotisation (id, code, nom, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    categorieSSId = 'cat_ss_test';
    insertCategorie.run(categorieSSId, 'SS', 'Sécurité sociale', 'Cotisations de sécurité sociale');

    categorieRetraiteId = 'cat_retraite_test';
    insertCategorie.run(categorieRetraiteId, 'RETRAITE', 'Retraite', 'Cotisations retraite');

    // Créer les organismes de test
    const insertOrganisme = db.prepare(`
      INSERT INTO organismes_cotisation (id, code, nom, description, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    organismeUrssafId = 'org_urssaf_test';
    insertOrganisme.run(organismeUrssafId, 'URSSAF', 'URSSAF', 'Union de recouvrement des cotisations');

    organismeAgircId = 'org_agirc_test';
    insertOrganisme.run(organismeAgircId, 'AGIRC_ARRCO', 'AGIRC-ARRCO', 'Retraite complémentaire');

    // Créer les règles de cotisation de test
    const insertRegle = db.prepare(`
      INSERT INTO regles_cotisation (
        id, code, nom, description, categorieId, organismeId,
        typeCotisation, typeCalcul, typeAssiette, plancher, plafond, estActif,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertTaux = db.prepare(`
      INSERT INTO taux_cotisation (id, regleId, taux, dateDebut, dateFin, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    // 1. Cotisation maladie salariale (0,75% sur salaire brut)
    const regleMaladieSalId = 'regle_maladie_sal_test';
    insertRegle.run(
      regleMaladieSalId,
      'SS_MALADIE_SAL',
      'Assurance maladie',
      'Cotisation maladie salariale',
      categorieSSId,
      organismeUrssafId,
      'COTISATION_SALARIALE',
      'POURCENTAGE',
      'SALAIRE_BRUT',
      null,
      null,
      1
    );
    insertTaux.run('taux_maladie_sal_test', regleMaladieSalId, 0.0075, '2024-01-01', null);

    // 2. Cotisation maladie patronale (7% sur salaire brut)
    const regleMaladiePatId = 'regle_maladie_pat_test';
    insertRegle.run(
      regleMaladiePatId,
      'SS_MALADIE_PAT',
      'Assurance maladie',
      'Cotisation maladie patronale',
      categorieSSId,
      organismeUrssafId,
      'COTISATION_PATRONALE',
      'POURCENTAGE',
      'SALAIRE_BRUT',
      null,
      null,
      1
    );
    insertTaux.run('taux_maladie_pat_test', regleMaladiePatId, 0.07, '2024-01-01', null);

    // 3. Cotisation retraite plafonnée (6,90% sur salaire plafonné)
    const regleRetraiteId = 'regle_retraite_test';
    insertRegle.run(
      regleRetraiteId,
      'RETRAITE_BASE_SAL',
      'Retraite de base',
      'Cotisation retraite salariale plafonnée',
      categorieRetraiteId,
      organismeUrssafId,
      'COTISATION_SALARIALE',
      'POURCENTAGE',
      'SALAIRE_PLAFONNE',
      null,
      PASS_MENSUEL,
      1
    );
    insertTaux.run('taux_retraite_test', regleRetraiteId, 0.069, '2024-01-01', null);

    // 4. Cotisation à montant fixe
    const regleMontantFixeId = 'regle_forfait_test';
    insertRegle.run(
      regleMontantFixeId,
      'FORFAIT_SOCIAL',
      'Forfait social',
      'Cotisation à montant fixe',
      categorieSSId,
      organismeUrssafId,
      'COTISATION_PATRONALE',
      'MONTANT_FIXE',
      'SALAIRE_BRUT',
      null,
      null,
      1
    );
    insertTaux.run('taux_forfait_test', regleMontantFixeId, 50, '2024-01-01', null);
  });

  afterAll(() => {
    // Nettoyer après les tests
    db.exec('DELETE FROM taux_cotisation');
    db.exec('DELETE FROM regles_comptables');
    db.exec('DELETE FROM regles_cotisation');
    db.exec('DELETE FROM categories_cotisation');
    db.exec('DELETE FROM organismes_cotisation');
    db.close();
  });

  describe('Constantes PASS', () => {
    it('devrait avoir les bonnes valeurs de PASS 2025', () => {
      expect(PASS_ANNUEL).toBe(46368);
      expect(PASS_MENSUEL).toBe(3864);
    });
  });

  describe('calculerCotisations - Cas nominal', () => {
    it('devrait calculer correctement les cotisations pour un salaire de 3000€', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Vérifications générales
      expect(resultat).toBeDefined();
      expect(resultat.salaireBrut).toBe(3000);
      expect(resultat.dateReference).toEqual(parametres.dateReference);

      // Vérifier qu'il y a des lignes de cotisations
      expect(resultat.lignesCotisations.length).toBeGreaterThan(0);

      // Vérifier la cohérence des totaux
      const totalSalarialCalcule = resultat.lignesCotisations
        .reduce((sum, ligne) => sum + ligne.montantSalarial, 0);
      const totalPatronalCalcule = resultat.lignesCotisations
        .reduce((sum, ligne) => sum + ligne.montantPatronal, 0);

      expect(Math.abs(resultat.totalCotisationsSalariales - totalSalarialCalcule)).toBeLessThan(0.02);
      expect(Math.abs(resultat.totalCotisationsPatronales - totalPatronalCalcule)).toBeLessThan(0.02);

      // Vérifier le salaire net
      expect(resultat.salaireNet).toBe(resultat.salaireBrut - resultat.totalCotisationsSalariales);

      // Vérifier le coût total
      expect(resultat.coutTotal).toBe(resultat.salaireBrut + resultat.totalCotisationsPatronales);

      // Vérifier que les montants sont arrondis au centime
      expect(resultat.salaireNet % 0.01).toBeLessThan(0.001);
      expect(resultat.totalCotisationsSalariales % 0.01).toBeLessThan(0.001);
    });

    it('devrait calculer correctement la cotisation maladie salariale', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 2000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation maladie salariale
      const ligneMaladie = resultat.lignesCotisations.find(
        l => l.code === 'SS_MALADIE_SAL'
      );

      expect(ligneMaladie).toBeDefined();
      expect(ligneMaladie!.assiette).toBe(2000);
      expect(ligneMaladie!.taux).toBe(0.0075);
      expect(ligneMaladie!.montantSalarial).toBe(15); // 2000 * 0.0075 = 15€
      expect(ligneMaladie!.montantPatronal).toBe(0);
    });

    it('devrait calculer correctement la cotisation maladie patronale', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 2000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation maladie patronale
      const ligneMaladie = resultat.lignesCotisations.find(
        l => l.code === 'SS_MALADIE_PAT'
      );

      expect(ligneMaladie).toBeDefined();
      expect(ligneMaladie!.assiette).toBe(2000);
      expect(ligneMaladie!.taux).toBe(0.07);
      expect(ligneMaladie!.montantSalarial).toBe(0);
      expect(ligneMaladie!.montantPatronal).toBe(140); // 2000 * 0.07 = 140€
    });
  });

  describe('calculerCotisations - Assiette plafonnée', () => {
    it('devrait plafonner les cotisations au PASS mensuel', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 5000, // Supérieur au PASS mensuel (3864€)
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation retraite (plafonnée)
      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_BASE_SAL'
      );

      expect(ligneRetraite).toBeDefined();
      expect(ligneRetraite!.assiette).toBe(PASS_MENSUEL); // Plafonné à 3864€
      expect(ligneRetraite!.montantSalarial).toBe(Math.round(PASS_MENSUEL * 0.069 * 100) / 100);
    });

    it('ne devrait pas plafonner si salaire < PASS mensuel', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 2500, // Inférieur au PASS mensuel
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation retraite (plafonnée)
      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_BASE_SAL'
      );

      expect(ligneRetraite).toBeDefined();
      expect(ligneRetraite!.assiette).toBe(2500); // Non plafonné
    });
  });

  describe('calculerCotisations - Montant fixe', () => {
    it('devrait appliquer un montant fixe correctement', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Trouver la ligne de cotisation à montant fixe
      const ligneForfait = resultat.lignesCotisations.find(
        l => l.code === 'FORFAIT_SOCIAL'
      );

      expect(ligneForfait).toBeDefined();
      expect(ligneForfait!.montantPatronal).toBe(50); // Montant fixe de 50€
      expect(ligneForfait!.montantSalarial).toBe(0);
    });
  });

  describe('calculerCotisations - Gestion des erreurs', () => {
    it('devrait rejeter un salaire négatif', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: -1000,
        dateReference: new Date('2025-01-15')
      };

      await expect(calculerCotisations(parametres)).rejects.toThrow(
        'Le salaire brut ne peut pas être négatif'
      );
    });

    it('devrait rejeter une date invalide', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('invalid')
      };

      await expect(calculerCotisations(parametres)).rejects.toThrow(
        'Date de référence invalide'
      );
    });
  });

  describe('calculerCotisations - Cas limites', () => {
    it('devrait gérer un salaire de 0€', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 0,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      expect(resultat.salaireBrut).toBe(0);
      expect(resultat.salaireNet).toBe(0);

      // Les cotisations en pourcentage devraient être à 0
      const lignesPourcentage = resultat.lignesCotisations.filter(
        l => l.code.includes('MALADIE') || l.code.includes('RETRAITE')
      );

      for (const ligne of lignesPourcentage) {
        expect(ligne.montantTotal).toBe(0);
      }

      // Mais les cotisations fixes devraient toujours s'appliquer
      const ligneForfait = resultat.lignesCotisations.find(
        l => l.code === 'FORFAIT_SOCIAL'
      );
      if (ligneForfait) {
        expect(ligneForfait.montantPatronal).toBe(50);
      }
    });

    it('devrait gérer un très gros salaire', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 100000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      expect(resultat.salaireBrut).toBe(100000);
      expect(resultat.salaireNet).toBeGreaterThan(0);
      expect(resultat.salaireNet).toBeLessThan(100000);

      // Les cotisations plafonnées doivent être plafonnées
      const ligneRetraite = resultat.lignesCotisations.find(
        l => l.code === 'RETRAITE_BASE_SAL'
      );
      expect(ligneRetraite!.assiette).toBe(PASS_MENSUEL);
    });
  });

  describe('calculerCotisations - Précision', () => {
    it('devrait calculer avec une précision au centime', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 2345.67,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);

      // Tous les montants doivent être arrondis au centime
      expect(resultat.salaireNet % 0.01).toBeLessThan(0.001);
      expect(resultat.totalCotisationsSalariales % 0.01).toBeLessThan(0.001);
      expect(resultat.totalCotisationsPatronales % 0.01).toBeLessThan(0.001);

      for (const ligne of resultat.lignesCotisations) {
        expect(ligne.assiette % 0.01).toBeLessThan(0.001);
        expect(ligne.montantSalarial % 0.01).toBeLessThan(0.001);
        expect(ligne.montantPatronal % 0.01).toBeLessThan(0.001);
      }
    });
  });

  describe('calculerCotisations - Performance', () => {
    it('devrait calculer en moins de 100ms', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15')
      };

      const debut = Date.now();
      await calculerCotisations(parametres);
      const duree = Date.now() - debut;

      expect(duree).toBeLessThan(100);
    });

    it('devrait gérer plusieurs calculs successifs rapidement', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15')
      };

      const debut = Date.now();

      for (let i = 0; i < 10; i++) {
        await calculerCotisations({ ...parametres, salaireBrut: 2000 + i * 100 });
      }

      const duree = Date.now() - debut;
      const moyenneParCalcul = duree / 10;

      expect(moyenneParCalcul).toBeLessThan(100);
    });
  });

  describe('genererFichePaieTexte', () => {
    it('devrait générer une fiche de paie au format texte', async () => {
      const parametres: ParametresCalcul = {
        salaireBrut: 3000,
        dateReference: new Date('2025-01-15')
      };

      const resultat = await calculerCotisations(parametres);
      const fichePaie = genererFichePaieTexte(resultat);

      // Vérifier que la fiche contient les éléments clés
      expect(fichePaie).toContain('FICHE DE PAIE');
      expect(fichePaie).toContain('Salaire brut');
      expect(fichePaie).toContain('3000.00');
      expect(fichePaie).toContain('SALAIRE NET');
      expect(fichePaie).toContain('COÛT TOTAL EMPLOYEUR');
      expect(fichePaie).toContain('Sécurité sociale');
      expect(fichePaie).toContain('Assurance maladie');
    });
  });

  describe('calculerCotisations - Historique des taux', () => {
    it('devrait utiliser le taux en vigueur à la date de référence', async () => {
      // Créer une règle avec plusieurs taux historiques
      const regleHistoriqueId = 'regle_historique_test';

      db.prepare(`
        INSERT INTO regles_cotisation (
          id, code, nom, categorieId, organismeId,
          typeCotisation, typeCalcul, typeAssiette, plancher, plafond, estActif,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        regleHistoriqueId,
        'TEST_HISTORIQUE',
        'Test historique',
        categorieSSId,
        organismeUrssafId,
        'COTISATION_SALARIALE',
        'POURCENTAGE',
        'SALAIRE_BRUT',
        null,
        null,
        1
      );

      // Ancien taux (2024)
      db.prepare(`
        INSERT INTO taux_cotisation (id, regleId, taux, dateDebut, dateFin, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('taux_hist_2024', regleHistoriqueId, 0.05, '2024-01-01', '2025-01-01');

      // Nouveau taux (2025)
      db.prepare(`
        INSERT INTO taux_cotisation (id, regleId, taux, dateDebut, dateFin, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('taux_hist_2025', regleHistoriqueId, 0.06, '2025-01-01', null);

      // Test avec date en 2024
      const resultat2024 = await calculerCotisations({
        salaireBrut: 1000,
        dateReference: new Date('2024-06-15')
      });

      const ligne2024 = resultat2024.lignesCotisations.find(
        l => l.code === 'TEST_HISTORIQUE'
      );
      expect(ligne2024).toBeDefined();
      expect(ligne2024!.taux).toBe(0.05); // Ancien taux

      // Test avec date en 2025
      const resultat2025 = await calculerCotisations({
        salaireBrut: 1000,
        dateReference: new Date('2025-06-15')
      });

      const ligne2025 = resultat2025.lignesCotisations.find(
        l => l.code === 'TEST_HISTORIQUE'
      );
      expect(ligne2025).toBeDefined();
      expect(ligne2025!.taux).toBe(0.06); // Nouveau taux

      // Nettoyer
      db.exec(`DELETE FROM taux_cotisation WHERE regleId = '${regleHistoriqueId}'`);
      db.exec(`DELETE FROM regles_cotisation WHERE id = '${regleHistoriqueId}'`);
    });
  });
});
