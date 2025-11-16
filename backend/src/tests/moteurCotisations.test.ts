/**
 * Tests unitaires du moteur de calcul des cotisations
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
import prisma from '../lib/db';

describe('Moteur de calcul des cotisations', () => {
  // IDs des entités de test
  let categorieSSId: string;
  let categorieRetraiteId: string;
  let organismeUrssafId: string;
  let organismeAgirc: string;
  let regleMaladieSalId: string;
  let regleMaladiePatId: string;
  let regleRetraiteId: string;
  let regleMontantFixeId: string;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.tauxCotisation.deleteMany();
    await prisma.regleComptable.deleteMany();
    await prisma.regleCotisation.deleteMany();
    await prisma.categorieCotisation.deleteMany();
    await prisma.organismeCotisation.deleteMany();

    // Créer les catégories de test
    const categorieSS = await prisma.categorieCotisation.create({
      data: {
        code: 'SS',
        nom: 'Sécurité sociale',
        description: 'Cotisations de sécurité sociale'
      }
    });
    categorieSSId = categorieSS.id;

    const categorieRetraite = await prisma.categorieCotisation.create({
      data: {
        code: 'RETRAITE',
        nom: 'Retraite',
        description: 'Cotisations retraite'
      }
    });
    categorieRetraiteId = categorieRetraite.id;

    // Créer les organismes de test
    const organismeUrssaf = await prisma.organismeCotisation.create({
      data: {
        code: 'URSSAF',
        nom: 'URSSAF',
        description: 'Union de recouvrement des cotisations'
      }
    });
    organismeUrssafId = organismeUrssaf.id;

    const organismeAgircArrco = await prisma.organismeCotisation.create({
      data: {
        code: 'AGIRC_ARRCO',
        nom: 'AGIRC-ARRCO',
        description: 'Retraite complémentaire'
      }
    });
    organismeAgirc = organismeAgircArrco.id;

    // Créer les règles de cotisation de test

    // 1. Cotisation maladie salariale (0,75% sur salaire brut)
    const regleMaladieSal = await prisma.regleCotisation.create({
      data: {
        code: 'SS_MALADIE_SAL',
        nom: 'Assurance maladie',
        description: 'Cotisation maladie salariale',
        categorieId: categorieSSId,
        organismeId: organismeUrssafId,
        typeCotisation: 'COTISATION_SALARIALE',
        typeCalcul: 'POURCENTAGE',
        typeAssiette: 'SALAIRE_BRUT',
        plancher: null,
        plafond: null,
        estActif: true
      }
    });
    regleMaladieSalId = regleMaladieSal.id;

    await prisma.tauxCotisation.create({
      data: {
        regleId: regleMaladieSalId,
        taux: 0.0075, // 0,75%
        dateDebut: new Date('2024-01-01'),
        dateFin: null
      }
    });

    // 2. Cotisation maladie patronale (7% sur salaire brut)
    const regleMaladiePat = await prisma.regleCotisation.create({
      data: {
        code: 'SS_MALADIE_PAT',
        nom: 'Assurance maladie',
        description: 'Cotisation maladie patronale',
        categorieId: categorieSSId,
        organismeId: organismeUrssafId,
        typeCotisation: 'COTISATION_PATRONALE',
        typeCalcul: 'POURCENTAGE',
        typeAssiette: 'SALAIRE_BRUT',
        plancher: null,
        plafond: null,
        estActif: true
      }
    });
    regleMaladiePatId = regleMaladiePat.id;

    await prisma.tauxCotisation.create({
      data: {
        regleId: regleMaladiePatId,
        taux: 0.07, // 7%
        dateDebut: new Date('2024-01-01'),
        dateFin: null
      }
    });

    // 3. Cotisation retraite plafonnée (6,90% sur salaire plafonné)
    const regleRetraite = await prisma.regleCotisation.create({
      data: {
        code: 'RETRAITE_BASE_SAL',
        nom: 'Retraite de base',
        description: 'Cotisation retraite salariale plafonnée',
        categorieId: categorieRetraiteId,
        organismeId: organismeUrssafId,
        typeCotisation: 'COTISATION_SALARIALE',
        typeCalcul: 'POURCENTAGE',
        typeAssiette: 'SALAIRE_PLAFONNE',
        plancher: null,
        plafond: PASS_MENSUEL,
        estActif: true
      }
    });
    regleRetraiteId = regleRetraite.id;

    await prisma.tauxCotisation.create({
      data: {
        regleId: regleRetraiteId,
        taux: 0.069, // 6,90%
        dateDebut: new Date('2024-01-01'),
        dateFin: null
      }
    });

    // 4. Cotisation à montant fixe
    const regleMontantFixe = await prisma.regleCotisation.create({
      data: {
        code: 'FORFAIT_SOCIAL',
        nom: 'Forfait social',
        description: 'Cotisation à montant fixe',
        categorieId: categorieSSId,
        organismeId: organismeUrssafId,
        typeCotisation: 'COTISATION_PATRONALE',
        typeCalcul: 'MONTANT_FIXE',
        typeAssiette: 'SALAIRE_BRUT',
        plancher: null,
        plafond: null,
        estActif: true
      }
    });
    regleMontantFixeId = regleMontantFixe.id;

    await prisma.tauxCotisation.create({
      data: {
        regleId: regleMontantFixeId,
        taux: 50, // 50€ fixe
        dateDebut: new Date('2024-01-01'),
        dateFin: null
      }
    });
  });

  afterAll(async () => {
    // Nettoyer après les tests
    await prisma.tauxCotisation.deleteMany();
    await prisma.regleComptable.deleteMany();
    await prisma.regleCotisation.deleteMany();
    await prisma.categorieCotisation.deleteMany();
    await prisma.organismeCotisation.deleteMany();
    await prisma.$disconnect();
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
      const regleHistorique = await prisma.regleCotisation.create({
        data: {
          code: 'TEST_HISTORIQUE',
          nom: 'Test historique',
          categorieId: categorieSSId,
          organismeId: organismeUrssafId,
          typeCotisation: 'COTISATION_SALARIALE',
          typeCalcul: 'POURCENTAGE',
          typeAssiette: 'SALAIRE_BRUT',
          plancher: null,
          plafond: null,
          estActif: true
        }
      });

      // Ancien taux (2024)
      await prisma.tauxCotisation.create({
        data: {
          regleId: regleHistorique.id,
          taux: 0.05, // 5%
          dateDebut: new Date('2024-01-01'),
          dateFin: new Date('2025-01-01')
        }
      });

      // Nouveau taux (2025)
      await prisma.tauxCotisation.create({
        data: {
          regleId: regleHistorique.id,
          taux: 0.06, // 6%
          dateDebut: new Date('2025-01-01'),
          dateFin: null
        }
      });

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
      await prisma.tauxCotisation.deleteMany({
        where: { regleId: regleHistorique.id }
      });
      await prisma.regleCotisation.delete({
        where: { id: regleHistorique.id }
      });
    });
  });
});
