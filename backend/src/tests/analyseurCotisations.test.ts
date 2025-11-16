import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  AnalyseurCotisations,
  TypeCotisation,
  CategorieCotisation,
  TypeCalcul,
  Assiette,
  Organisme,
} from '../lib/analyseurCotisations';

describe('AnalyseurCotisations', () => {
  let analyseur: AnalyseurCotisations;
  const fixturesDir = path.join(__dirname, '../../fixtures/cotisations');

  beforeAll(() => {
    analyseur = new AnalyseurCotisations();
  });

  describe('chargerDepuisFichier', () => {
    it('devrait charger et valider un fichier YAML valide', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const resultat = analyseur.chargerDepuisFichier(cheminFichier);

      expect(resultat).toBeDefined();
      expect(resultat.version).toBe('1.0');
      expect(resultat.cotisations).toHaveLength(4);
      expect(resultat.cotisations[0].code).toBe('MALADIE_SAL');
    });

    it('devrait charger le fichier complet des cotisations 2024', () => {
      const cheminFichier = path.join(fixturesDir, 'cotisations-2024.yaml');
      const resultat = analyseur.chargerDepuisFichier(cheminFichier);

      expect(resultat).toBeDefined();
      expect(resultat.version).toBe('1.0');
      expect(resultat.cotisations.length).toBeGreaterThan(10);
      expect(resultat.description).toContain('2024');
    });

    it('devrait lever une erreur si le fichier n\'existe pas', () => {
      expect(() => {
        analyseur.chargerDepuisFichier('/chemin/inexistant.yaml');
      }).toThrow('n\'existe pas');
    });

    it('devrait valider les types énumérés correctement', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const resultat = analyseur.chargerDepuisFichier(cheminFichier);

      const cotisation = resultat.cotisations[0];
      expect(cotisation.type).toBe(TypeCotisation.COTISATION_SALARIALE);
      expect(cotisation.categorie).toBe(CategorieCotisation.SECURITE_SOCIALE);
      expect(cotisation.organisme).toBe(Organisme.URSSAF);
      expect(cotisation.calcul.type).toBe(TypeCalcul.POURCENTAGE);
      expect(cotisation.calcul.assiette).toBe(Assiette.SALAIRE_BRUT);
    });
  });

  describe('validerYaml', () => {
    it('devrait valider une chaîne YAML valide', () => {
      const yamlValide = `
version: "1.0"
date_creation: "2024-01-01"
description: "Test"
cotisations:
  - code: TEST_CODE
    nom: "Test cotisation"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
      plafond: null
      plancher: null
    taux:
      - taux: 0.075
        date_debut: "2024-01-01"
        date_fin: null
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
`;

      const resultat = analyseur.validerYaml(yamlValide);
      expect(resultat).toBeDefined();
      expect(resultat.cotisations).toHaveLength(1);
      expect(resultat.cotisations[0].code).toBe('TEST_CODE');
    });

    it('devrait rejeter un YAML avec un taux invalide (> 1)', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "2024-01-01"
cotisations:
  - code: TEST_CODE
    nom: "Test"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 1.5
        date_debut: "2024-01-01"
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });

    it('devrait rejeter un YAML avec un taux négatif', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "2024-01-01"
cotisations:
  - code: TEST_CODE
    nom: "Test"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: -0.1
        date_debut: "2024-01-01"
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });

    it('devrait rejeter un YAML avec une date mal formatée', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "01/01/2024"
cotisations:
  - code: TEST_CODE
    nom: "Test"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.075
        date_debut: "2024-01-01"
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });

    it('devrait rejeter un YAML avec un type énuméré invalide', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "2024-01-01"
cotisations:
  - code: TEST_CODE
    nom: "Test"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_INVALIDE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.075
        date_debut: "2024-01-01"
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });

    it('devrait rejeter un YAML sans cotisations', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "2024-01-01"
cotisations: []
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });

    it('devrait rejeter un YAML avec un code vide', () => {
      const yamlInvalide = `
version: "1.0"
date_creation: "2024-01-01"
cotisations:
  - code: ""
    nom: "Test"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.075
        date_debut: "2024-01-01"
`;

      expect(() => {
        analyseur.validerYaml(yamlInvalide);
      }).toThrow('validation');
    });
  });

  describe('obtenirTauxADate', () => {
    it('devrait retourner le taux valide pour une date donnée', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);
      const regle = fichier.cotisations[0];

      const taux = analyseur.obtenirTauxADate(regle, new Date('2024-06-15'));
      expect(taux).toBeDefined();
      expect(taux?.taux).toBe(0.0755);
    });

    it('devrait retourner le taux actuel si aucune date n\'est fournie', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);
      const regle = fichier.cotisations[0];

      const taux = analyseur.obtenirTauxADate(regle);
      expect(taux).toBeDefined();
    });

    it('devrait retourner le bon taux selon l\'historique', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-evolution-taux.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);
      const regle = fichier.cotisations[0]; // CHOMAGE_SAL_EVOLUTIF

      // Taux 2022-2023
      const taux2023 = analyseur.obtenirTauxADate(regle, new Date('2023-06-15'));
      expect(taux2023).toBeDefined();
      expect(taux2023?.taux).toBe(0.0205);

      // Taux 2024
      const taux2024 = analyseur.obtenirTauxADate(regle, new Date('2024-06-15'));
      expect(taux2024).toBeDefined();
      expect(taux2024?.taux).toBe(0.0240);
    });

    it('devrait retourner undefined pour une date hors période', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-evolution-taux.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);
      const regle = fichier.cotisations[0];

      const taux = analyseur.obtenirTauxADate(regle, new Date('2021-01-01'));
      expect(taux).toBeUndefined();
    });
  });

  describe('obtenirReglesActives', () => {
    it('devrait retourner uniquement les règles actives', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-evolution-taux.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesActives = analyseur.obtenirReglesActives(fichier);
      expect(reglesActives).toHaveLength(2);
      expect(reglesActives.every(r => r.actif)).toBe(true);
    });

    it('devrait retourner toutes les règles si toutes sont actives', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesActives = analyseur.obtenirReglesActives(fichier);
      expect(reglesActives).toHaveLength(fichier.cotisations.length);
    });
  });

  describe('obtenirReglesParType', () => {
    it('devrait filtrer les règles par type salarial', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesSalariales = analyseur.obtenirReglesParType(
        fichier,
        TypeCotisation.COTISATION_SALARIALE
      );
      expect(reglesSalariales).toHaveLength(3);
      expect(reglesSalariales.every(r => r.type === TypeCotisation.COTISATION_SALARIALE)).toBe(true);
    });

    it('devrait filtrer les règles par type patronal', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesPatronales = analyseur.obtenirReglesParType(
        fichier,
        TypeCotisation.COTISATION_PATRONALE
      );
      expect(reglesPatronales).toHaveLength(1);
      expect(reglesPatronales[0].code).toBe('MALADIE_PAT');
    });
  });

  describe('obtenirReglesParCategorie', () => {
    it('devrait filtrer les règles par catégorie Sécurité Sociale', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesSecu = analyseur.obtenirReglesParCategorie(
        fichier,
        CategorieCotisation.SECURITE_SOCIALE
      );
      expect(reglesSecu).toHaveLength(2);
      expect(reglesSecu.every(r => r.categorie === CategorieCotisation.SECURITE_SOCIALE)).toBe(true);
    });

    it('devrait filtrer les règles par catégorie Retraite', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesRetraite = analyseur.obtenirReglesParCategorie(
        fichier,
        CategorieCotisation.RETRAITE
      );
      expect(reglesRetraite).toHaveLength(1);
      expect(reglesRetraite[0].code).toBe('RETRAITE_BASE_SAL');
    });

    it('devrait filtrer les règles par catégorie Chômage', () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      const reglesChomage = analyseur.obtenirReglesParCategorie(
        fichier,
        CategorieCotisation.CHOMAGE
      );
      expect(reglesChomage).toHaveLength(1);
      expect(reglesChomage[0].code).toBe('CHOMAGE_SAL');
    });
  });

  describe('importerRegles', () => {
    it('devrait lever une erreur car non implémenté', async () => {
      const cheminFichier = path.join(fixturesDir, 'exemple-simple.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      await expect(analyseur.importerRegles(fichier)).rejects.toThrow('issue #3');
    });
  });

  describe('Validation complète du fichier cotisations-2024', () => {
    it('devrait valider toutes les cotisations du fichier 2024', () => {
      const cheminFichier = path.join(fixturesDir, 'cotisations-2024.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      // Vérifier la structure générale
      expect(fichier.version).toBe('1.0');
      expect(fichier.cotisations.length).toBeGreaterThan(0);

      // Vérifier que toutes les cotisations ont les champs requis
      fichier.cotisations.forEach(cotisation => {
        expect(cotisation.code).toBeDefined();
        expect(cotisation.nom).toBeDefined();
        expect(cotisation.categorie).toBeDefined();
        expect(cotisation.organisme).toBeDefined();
        expect(cotisation.type).toBeDefined();
        expect(cotisation.actif).toBeDefined();
        expect(cotisation.calcul).toBeDefined();
        expect(cotisation.taux).toBeDefined();
        expect(cotisation.taux.length).toBeGreaterThan(0);
      });

      // Vérifier qu'il y a des cotisations salariales et patronales
      const salariales = analyseur.obtenirReglesParType(fichier, TypeCotisation.COTISATION_SALARIALE);
      const patronales = analyseur.obtenirReglesParType(fichier, TypeCotisation.COTISATION_PATRONALE);
      expect(salariales.length).toBeGreaterThan(0);
      expect(patronales.length).toBeGreaterThan(0);

      // Vérifier les catégories principales
      const secu = analyseur.obtenirReglesParCategorie(fichier, CategorieCotisation.SECURITE_SOCIALE);
      const retraite = analyseur.obtenirReglesParCategorie(fichier, CategorieCotisation.RETRAITE);
      const chomage = analyseur.obtenirReglesParCategorie(fichier, CategorieCotisation.CHOMAGE);
      expect(secu.length).toBeGreaterThan(0);
      expect(retraite.length).toBeGreaterThan(0);
      expect(chomage.length).toBeGreaterThan(0);
    });

    it('devrait avoir des taux valides pour toutes les cotisations', () => {
      const cheminFichier = path.join(fixturesDir, 'cotisations-2024.yaml');
      const fichier = analyseur.chargerDepuisFichier(cheminFichier);

      fichier.cotisations.forEach(cotisation => {
        cotisation.taux.forEach(t => {
          expect(t.taux).toBeGreaterThanOrEqual(0);
          expect(t.taux).toBeLessThanOrEqual(1);
          expect(t.date_debut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      });
    });
  });
});
