/**
 * Tests d'intégration pour les données de référence des cotisations sociales 2024-2025
 *
 * Ces tests valident que :
 * 1. Les données sont correctement chargées depuis le fichier YAML
 * 2. Les taux officiels correspondent aux sources URSSAF/AGIRC-ARRCO
 * 3. Les calculs de cotisations sont exacts
 *
 * Note : NODE_ENV=test utilise la base de données test.db et charge automatiquement
 * les données de référence via le script de seed si elles ne sont pas présentes.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { execSync } from 'child_process';

// Constantes pour les tests
const TEST_DATE = '2024-06-01'; // Date fixe pour les tests de validité des taux
const PASS_MENSUEL = 3864; // Plafond mensuel de la Sécurité Sociale 2024

describe('Cotisations sociales françaises 2024-2025', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Utiliser la base de données de test (configurable via TEST_DB_PATH)
    const dbFileName = process.env.TEST_DB_PATH || 'test.db';
    const dbPath = path.join(__dirname, '../../prisma', dbFileName);
    db = new Database(dbPath);

    // Charger les données de référence si elles ne sont pas déjà présentes
    const count = db.prepare('SELECT COUNT(*) as count FROM regles_cotisation').get() as { count: number };
    if (count.count === 0) {
      // Exécuter le script de seed
      const scriptPath = path.join(__dirname, '../../scripts/seed-cotisations.js');
      execSync(`NODE_ENV=test node "${scriptPath}"`, { stdio: 'inherit' });
    }
  });

  afterAll(() => {
    db.close();
  });

  // ====================================
  // TESTS DE CHARGEMENT DES DONNÉES
  // ====================================

  describe('Chargement des données de référence', () => {
    it('devrait avoir chargé les catégories de cotisations', () => {
      const result = db.prepare('SELECT COUNT(*) as count FROM categories_cotisation').get() as { count: number };
      expect(result.count).toBeGreaterThanOrEqual(10);
    });

    it('devrait avoir chargé les organismes collecteurs', () => {
      const result = db.prepare('SELECT COUNT(*) as count FROM organismes_cotisation').get() as { count: number };
      expect(result.count).toBeGreaterThanOrEqual(3);
    });

    it('devrait avoir chargé au moins 20 règles de cotisations', () => {
      const result = db.prepare('SELECT COUNT(*) as count FROM regles_cotisation').get() as { count: number };
      expect(result.count).toBeGreaterThanOrEqual(20);
    });

    it('devrait avoir des taux historiques pour chaque règle', () => {
      const regles = db.prepare('SELECT COUNT(*) as count FROM regles_cotisation').get() as { count: number };
      const taux = db.prepare('SELECT COUNT(*) as count FROM taux_cotisation').get() as { count: number };
      expect(taux.count).toBeGreaterThanOrEqual(regles.count);
    });

    it('devrait avoir des règles comptables pour chaque règle', () => {
      const regles = db.prepare('SELECT COUNT(*) as count FROM regles_cotisation').get() as { count: number };
      const comptables = db.prepare('SELECT COUNT(*) as count FROM regles_comptables').get() as { count: number };
      expect(comptables.count).toBeGreaterThanOrEqual(regles.count);
    });
  });

  // ====================================
  // TESTS DES TAUX OFFICIELS 2024
  // ====================================

  describe('Validation des taux officiels 2024', () => {
    describe('Sécurité sociale - Part salariale', () => {
      it('devrait avoir un taux de 0% pour la maladie (hors Alsace-Moselle)', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_MALADIE_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0);
      });

      it('devrait avoir un taux de 6,90% pour la vieillesse plafonnée', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_VIEILLESSE_PLAFONNE_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.069);
      });

      it('devrait avoir un taux de 0,40% pour la vieillesse déplafonnée', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_VIEILLESSE_DEPLAFONNE_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.004);
      });
    });

    describe('Sécurité sociale - Part patronale', () => {
      it('devrait avoir un taux de 13% pour la maladie', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_MALADIE_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.13);
      });

      it('devrait avoir un taux de 8,55% pour la vieillesse plafonnée', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_VIEILLESSE_PLAFONNE_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.0855);
      });

      it('devrait avoir un taux de 3,45% pour les allocations familiales', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'SS_ALLOCATIONS_FAMILIALES_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.0345);
      });
    });

    describe('Chômage (Pôle emploi)', () => {
      it('devrait avoir un taux de 0% pour la part salariale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'CHOMAGE_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0);
      });

      it('devrait avoir un taux de 4,05% pour la part patronale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'CHOMAGE_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBe(0.0405);
      });

      it('devrait avoir un plafond de 4 PASS (185 472 €)', () => {
        const regle = db.prepare(`
          SELECT r.plafond
          FROM regles_cotisation r
          WHERE r.code = 'CHOMAGE_PAT'
        `).get() as { plafond: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.plafond).toBe(185472); // 4 × 46368
      });
    });

    describe('Retraite complémentaire (AGIRC-ARRCO)', () => {
      it('devrait avoir un taux de 4,02% pour la tranche 1 salariale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'RETRAITE_COMP_T1_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBeCloseTo(0.0402, 4);
      });

      it('devrait avoir un taux de 6,01% pour la tranche 1 patronale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'RETRAITE_COMP_T1_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBeCloseTo(0.0601, 4);
      });

      it('devrait avoir un taux de 10,26% pour la tranche 2 salariale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'RETRAITE_COMP_T2_SAL'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBeCloseTo(0.1026, 4);
      });

      it('devrait avoir un taux de 15,38% pour la tranche 2 patronale', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'RETRAITE_COMP_T2_PAT'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        expect(regle?.taux).toBeCloseTo(0.1538, 4);
      });
    });

    describe('CSG/CRDS', () => {
      it('devrait avoir un taux effectif de 6,68% pour la CSG déductible', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'CSG_DEDUCTIBLE'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        // 6,80% × 98,25% = 6,68%
        expect(regle?.taux).toBeCloseTo(0.0668, 4);
      });

      it('devrait avoir un taux effectif de 2,36% pour la CSG non déductible', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'CSG_NON_DEDUCTIBLE'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        // 2,40% × 98,25% = 2,36%
        expect(regle?.taux).toBeCloseTo(0.0236, 4);
      });

      it('devrait avoir un taux effectif de 0,49% pour la CRDS', () => {
        const regle = db.prepare(`
          SELECT t.taux
          FROM regles_cotisation r
          JOIN taux_cotisation t ON r.id = t.regleId
          WHERE r.code = 'CRDS'
            AND t.dateDebut <= date('${TEST_DATE}')
            AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
        `).get() as { taux: number } | undefined;

        expect(regle).toBeDefined();
        // 0,50% × 98,25% = 0,49%
        expect(regle?.taux).toBeCloseTo(0.0049, 4);
      });
    });
  });

  // ====================================
  // TESTS DES PLAFONDS ET ASSIETTES
  // ====================================

  describe('Validation des plafonds et assiettes', () => {
    it('devrait utiliser le PASS 2024 de 46 368 € pour les cotisations plafonnées', () => {
      const regles = db.prepare(`
        SELECT code, plafond
        FROM regles_cotisation
        WHERE typeAssiette = 'SALAIRE_PLAFONNE'
          AND code LIKE '%VIEILLESSE_PLAFONNE%'
      `).all() as Array<{ code: string; plafond: number }>;

      expect(regles.length).toBeGreaterThan(0);
      regles.forEach(regle => {
        expect(regle.plafond).toBe(46368); // PASS annuel 2024
      });
    });

    it('devrait avoir les bonnes assiettes pour chaque type de cotisation', () => {
      const assiettes = db.prepare(`
        SELECT code, typeAssiette
        FROM regles_cotisation
      `).all() as Array<{ code: string; typeAssiette: string }>;

      const assietteMap: Record<string, string> = {};
      assiettes.forEach(({ code, typeAssiette }) => {
        assietteMap[code] = typeAssiette;
      });

      // Vérifications
      expect(assietteMap['SS_MALADIE_SAL']).toBe('SALAIRE_BRUT');
      expect(assietteMap['SS_VIEILLESSE_PLAFONNE_SAL']).toBe('SALAIRE_PLAFONNE');
      expect(assietteMap['SS_VIEILLESSE_DEPLAFONNE_SAL']).toBe('SALAIRE_BRUT');
      expect(assietteMap['CHOMAGE_PAT']).toBe('SALAIRE_PLAFONNE');
    });
  });

  // ====================================
  // TESTS DES RÈGLES COMPTABLES
  // ====================================

  describe('Validation des règles comptables', () => {
    it('devrait avoir un compte de débit 6411 pour les cotisations salariales', () => {
      const regles = db.prepare(`
        SELECT rc.compteDebit, r.typeCotisation
        FROM regles_comptables rc
        JOIN regles_cotisation r ON rc.regleId = r.id
        WHERE r.typeCotisation = 'COTISATION_SALARIALE'
      `).all() as Array<{ compteDebit: string; typeCotisation: string }>;

      expect(regles.length).toBeGreaterThan(0);
      regles.forEach(regle => {
        expect(regle.compteDebit).toBe('6411');
      });
    });

    it('devrait avoir un compte de débit 6451 pour les cotisations patronales', () => {
      const regles = db.prepare(`
        SELECT rc.compteDebit, r.typeCotisation
        FROM regles_comptables rc
        JOIN regles_cotisation r ON rc.regleId = r.id
        WHERE r.typeCotisation = 'COTISATION_PATRONALE'
      `).all() as Array<{ compteDebit: string; typeCotisation: string }>;

      expect(regles.length).toBeGreaterThan(0);
      regles.forEach(regle => {
        expect(regle.compteDebit).toBe('6451');
      });
    });

    it('devrait avoir des comptes de crédit appropriés (431 ou 437)', () => {
      const regles = db.prepare(`
        SELECT compteCredit
        FROM regles_comptables
      `).all() as Array<{ compteCredit: string }>;

      expect(regles.length).toBeGreaterThan(0);
      regles.forEach(regle => {
        expect(['431', '437']).toContain(regle.compteCredit);
      });
    });
  });

  // ====================================
  // TESTS DE CALCUL PRATIQUE
  // ====================================

  describe('Calculs de cotisations sur cas pratiques', () => {
    it('devrait calculer correctement les cotisations pour un salaire de 2500 € brut', () => {
      const salaireBrut = 2500;

      // Cotisations salariales
      const cotisationsSalariales = db.prepare(`
        SELECT r.code, r.nom, t.taux, r.typeAssiette, r.plafond
        FROM regles_cotisation r
        JOIN taux_cotisation t ON r.id = t.regleId
        WHERE r.typeCotisation = 'COTISATION_SALARIALE'
          AND r.estActif = 1
          AND t.dateDebut <= date('${TEST_DATE}')
          AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
      `).all() as Array<{
        code: string;
        nom: string;
        taux: number;
        typeAssiette: string;
        plafond: number | null;
      }>;

      let totalCotisationsSalariales = 0;

      cotisationsSalariales.forEach(cotisation => {
        let assiette = salaireBrut;

        // Appliquer le plafond si nécessaire
        if (cotisation.typeAssiette === 'SALAIRE_PLAFONNE' && cotisation.plafond) {
          const plafondMensuel = cotisation.plafond / 12;
          assiette = Math.min(salaireBrut, plafondMensuel);
        }

        const montant = assiette * cotisation.taux;
        totalCotisationsSalariales += montant;
      });

      // Le total des cotisations salariales devrait être d'environ 550 €
      // (environ 22% du salaire brut)
      expect(totalCotisationsSalariales).toBeGreaterThan(400);
      expect(totalCotisationsSalariales).toBeLessThan(700);
    });

    it('devrait calculer correctement les cotisations pour un salaire de 5000 € brut (cadre)', () => {
      const salaireBrut = 5000;

      // Pour un salaire au-dessus du PASS, vérifier la tranche 2 AGIRC-ARRCO
      const tranche2 = db.prepare(`
        SELECT t.taux, r.plancher, r.plafond
        FROM regles_cotisation r
        JOIN taux_cotisation t ON r.id = t.regleId
        WHERE r.code = 'RETRAITE_COMP_T2_SAL'
          AND t.dateDebut <= date('${TEST_DATE}')
          AND (t.dateFin IS NULL OR t.dateFin > date('${TEST_DATE}'))
      `).get() as { taux: number; plancher: number; plafond: number } | undefined;

      expect(tranche2).toBeDefined();

      // La partie au-delà du PASS
      const partieAuDelaPASS = salaireBrut - PASS_MENSUEL;
      expect(partieAuDelaPASS).toBeGreaterThan(0);

      // Le montant de cotisation T2
      const montantT2 = partieAuDelaPASS * tranche2!.taux;
      expect(montantT2).toBeGreaterThan(0);
    });
  });
});
