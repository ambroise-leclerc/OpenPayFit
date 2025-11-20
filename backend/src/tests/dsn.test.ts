/**
 * Tests pour le générateur et validateur DSN
 */

import { DSNGenerator, DonneesDSN } from '../services/dsn/dsnGenerator';
import { DSNValidator, TypeMessageValidation } from '../services/dsn/dsnValidator';

describe('Générateur DSN', () => {
  let generator: DSNGenerator;
  let donneesSample: DonneesDSN;

  beforeEach(() => {
    generator = new DSNGenerator();

    // Données de test
    donneesSample = {
      entreprise: {
        id: 'comp-123',
        nom: 'Entreprise Test SARL',
        siret: '12345678901234',
        codeNaf: '6201Z',
        adresse: '10 Rue de la Paix',
        codePostal: '75001',
        ville: 'Paris',
        numeroUrssaf: '123456789'
      },
      periode: '2025-03',
      fichesPaie: [
        {
          employe: {
            id: 'emp-1',
            prenom: 'Jean',
            nom: 'Dupont',
            numeroSecuriteSociale: '123456789012345',
            dateNaissance: new Date('1985-05-15'),
            lieuNaissance: 'Paris, France',
            nationalite: 'FR',
            typeContrat: 'CDI',
            dateEmbauche: new Date('2020-01-01'),
            numeroMatricule: 'EMP001'
          },
          salaireBrut: 3000,
          salaireNet: 2340,
          cotisations: [
            {
              code: 'SS_MALADIE_SAL',
              nom: 'Assurance maladie',
              organisme: 'URSSAF',
              typeCotisation: 'COTISATION_SALARIALE',
              assiette: 3000,
              taux: 0.0755,
              montantSalarial: 226.5,
              montantPatronal: 0
            }
          ]
        }
      ]
    };
  });

  test('devrait générer un XML valide', () => {
    const xml = generator.genererDSN(donneesSample);

    // Vérifier la présence de l'en-tête XML
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<DSN>');
    expect(xml).toContain('</DSN>');
  });

  test('devrait générer le bloc S10 (Déclarant)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S10>');
    expect(xml).toContain('12345678901234'); // SIRET
    expect(xml).toContain('Entreprise Test SARL');
  });

  test('devrait générer le bloc S20 (Entreprise)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S20>');
    expect(xml).toContain('123456789'); // SIREN (9 premiers chiffres)
    expect(xml).toContain('6201Z'); // Code NAF
  });

  test('devrait générer le bloc S21 (Établissement)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S21>');
    expect(xml).toContain('12345678901234'); // SIRET
    expect(xml).toContain('10 Rue de la Paix');
    expect(xml).toContain('75001');
    expect(xml).toContain('Paris');
  });

  test('devrait générer le bloc S40 (Employé)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S40>');
    expect(xml).toContain('Dupont'); // Nom
    expect(xml).toContain('Jean'); // Prénom
    expect(xml).toContain('123456789012345'); // Numéro Sécu
  });

  test('devrait générer le bloc S41 (Rémunération)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S41>');
    expect(xml).toContain('2025-03'); // Période
    expect(xml).toContain('3000.00'); // Salaire brut
    expect(xml).toContain('2340.00'); // Salaire net
  });

  test('devrait générer le bloc S43 (Cotisations)', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('<S43>');
    expect(xml).toContain('SS_MALADIE_SAL'); // Code cotisation
    expect(xml).toContain('Assurance maladie'); // Nom
    expect(xml).toContain('URSSAF'); // Organisme
    expect(xml).toContain('226.50'); // Montant salarial
  });

  test('devrait échapper les caractères spéciaux XML', () => {
    const donneesAvecCaracteresSpeciaux: DonneesDSN = {
      ...donneesSample,
      entreprise: {
        ...donneesSample.entreprise,
        nom: 'Entreprise <Test> & "Associés"'
      }
    };

    const xml = generator.genererDSN(donneesAvecCaracteresSpeciaux);

    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
  });

  test('devrait formater les dates correctement', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('1985-05-15'); // Date de naissance
    expect(xml).toContain('2020-01-01'); // Date d\'embauche
  });

  test('devrait formater les montants avec 2 décimales', () => {
    const xml = generator.genererDSN(donneesSample);

    expect(xml).toContain('3000.00');
    expect(xml).toContain('2340.00');
    expect(xml).toContain('226.50');
  });
});

describe('Validateur DSN', () => {
  let validator: DSNValidator;
  let donneesSample: DonneesDSN;

  beforeEach(() => {
    validator = new DSNValidator();

    donneesSample = {
      entreprise: {
        id: 'comp-123',
        nom: 'Entreprise Test SARL',
        siret: '12345678901234',
        codeNaf: '6201Z',
        adresse: '10 Rue de la Paix',
        codePostal: '75001',
        ville: 'Paris',
        numeroUrssaf: '123456789'
      },
      periode: '2025-03',
      fichesPaie: [
        {
          employe: {
            id: 'emp-1',
            prenom: 'Jean',
            nom: 'Dupont',
            numeroSecuriteSociale: '123456789012345',
            dateNaissance: new Date('1985-05-15'),
            lieuNaissance: 'Paris, France',
            nationalite: 'FR',
            typeContrat: 'CDI',
            dateEmbauche: new Date('2020-01-01'),
            numeroMatricule: 'EMP001'
          },
          salaireBrut: 3000,
          salaireNet: 2340,
          cotisations: [
            {
              code: 'SS_MALADIE_SAL',
              nom: 'Assurance maladie',
              organisme: 'URSSAF',
              typeCotisation: 'COTISATION_SALARIALE',
              assiette: 3000,
              taux: 0.0755,
              montantSalarial: 226.5,
              montantPatronal: 0
            }
          ]
        }
      ]
    };
  });

  test('devrait valider des données correctes', () => {
    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(true);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.length).toBe(0);
  });

  test('devrait détecter un SIRET manquant', () => {
    donneesSample.entreprise.siret = '';

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.length).toBeGreaterThan(0);
    expect(erreurs.some(e => e.code === 'ENT001')).toBe(true);
  });

  test('devrait détecter un SIRET invalide', () => {
    donneesSample.entreprise.siret = '123'; // Trop court

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.some(e => e.code === 'ENT002')).toBe(true);
  });

  test('devrait détecter une période invalide', () => {
    donneesSample.periode = '2025-13'; // Mois invalide

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.some(e => e.code === 'PER003')).toBe(true);
  });

  test('devrait détecter un nom d\'employé manquant', () => {
    donneesSample.fichesPaie[0].employe.nom = '';

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.some(e => e.code === 'EMP001')).toBe(true);
  });

  test('devrait détecter un salaire brut invalide', () => {
    donneesSample.fichesPaie[0].salaireBrut = -1000;

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.some(e => e.code === 'PAY001')).toBe(true);
  });

  test('devrait détecter un salaire net supérieur au brut', () => {
    donneesSample.fichesPaie[0].salaireNet = 4000; // Supérieur au brut (3000)

    const resultat = validator.valider(donneesSample);

    expect(resultat.valide).toBe(false);
    const erreurs = resultat.messages.filter(m => m.type === TypeMessageValidation.ERREUR);
    expect(erreurs.some(e => e.code === 'PAY002')).toBe(true);
  });

  test('devrait émettre des avertissements pour des données recommandées manquantes', () => {
    donneesSample.entreprise.codeNaf = undefined;
    donneesSample.fichesPaie[0].employe.numeroSecuriteSociale = undefined;

    const resultat = validator.valider(donneesSample);

    // Devrait être valide malgré les avertissements
    expect(resultat.valide).toBe(true);

    const avertissements = resultat.messages.filter(m => m.type === TypeMessageValidation.AVERTISSEMENT);
    expect(avertissements.length).toBeGreaterThan(0);
    expect(avertissements.some(a => a.code === 'ENT004')).toBe(true); // Code NAF
    expect(avertissements.some(a => a.code === 'EMP003')).toBe(true); // N° sécu
  });

  test('devrait formater les messages en JSON', () => {
    const resultat = validator.valider(donneesSample);

    const json = DSNValidator.formaterMessagesJSON(resultat.messages);
    expect(json).toBeTruthy();
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('devrait formater les messages en texte', () => {
    donneesSample.entreprise.siret = ''; // Provoquer une erreur

    const resultat = validator.valider(donneesSample);

    const texte = DSNValidator.formaterMessagesTexte(resultat.messages);
    expect(texte).toBeTruthy();
    expect(texte).toContain('❌'); // Symbole d'erreur
    expect(texte).toContain('[ENT001]');
  });
});
