import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { z } from 'zod';

/**
 * Énumérations pour les types de cotisations
 */
export enum TypeCotisation {
  COTISATION_SALARIALE = 'COTISATION_SALARIALE',
  COTISATION_PATRONALE = 'COTISATION_PATRONALE',
  CHARGE_FISCALE = 'CHARGE_FISCALE',
}

export enum CategorieCotisation {
  SECURITE_SOCIALE = 'SECURITE_SOCIALE',
  RETRAITE = 'RETRAITE',
  CHOMAGE = 'CHOMAGE',
  COMPLEMENTAIRE = 'COMPLEMENTAIRE',
  FORMATION = 'FORMATION',
  AUTRES = 'AUTRES',
}

export enum TypeCalcul {
  POURCENTAGE = 'POURCENTAGE',
  MONTANT_FIXE = 'MONTANT_FIXE',
  TRANCHES = 'TRANCHES',
}

export enum Assiette {
  SALAIRE_BRUT = 'SALAIRE_BRUT',
  SALAIRE_NET = 'SALAIRE_NET',
  SALAIRE_PLAFONNE = 'SALAIRE_PLAFONNE',
}

export enum Organisme {
  URSSAF = 'URSSAF',
  POLE_EMPLOI = 'POLE_EMPLOI',
  AGIRC_ARRCO = 'AGIRC_ARRCO',
  AUTRES = 'AUTRES',
}

/**
 * Schémas Zod pour la validation
 */

// Schéma pour un taux avec période de validité
const tauxSchema = z.object({
  taux: z.number().min(0).max(1).describe('Taux de cotisation entre 0 et 1'),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date de début au format YYYY-MM-DD'),
  date_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().describe('Date de fin au format YYYY-MM-DD (optionnel)'),
});

// Schéma pour le calcul
const calculSchema = z.object({
  type: z.nativeEnum(TypeCalcul).describe('Type de calcul: POURCENTAGE, MONTANT_FIXE ou TRANCHES'),
  assiette: z.nativeEnum(Assiette).describe('Assiette de calcul: SALAIRE_BRUT, SALAIRE_NET ou SALAIRE_PLAFONNE'),
  plafond: z.number().positive().optional().nullable().describe('Plafond de l\'assiette (optionnel)'),
  plancher: z.number().nonnegative().optional().nullable().describe('Plancher de l\'assiette (optionnel)'),
});

// Schéma pour la comptabilité
const comptabiliteSchema = z.object({
  compte_debit: z.string().min(1).describe('Numéro de compte à débiter'),
  compte_credit: z.string().min(1).describe('Numéro de compte à créditer'),
});

// Schéma pour une règle de cotisation
const regleCotisationSchema = z.object({
  code: z.string().min(1).describe('Code unique de la cotisation'),
  nom: z.string().min(1).describe('Nom lisible de la cotisation'),
  categorie: z.nativeEnum(CategorieCotisation).describe('Catégorie de la cotisation'),
  organisme: z.nativeEnum(Organisme).describe('Organisme collecteur'),
  type: z.nativeEnum(TypeCotisation).describe('Type de cotisation: salariale, patronale ou fiscale'),
  actif: z.boolean().describe('Indicateur d\'activation de la règle'),
  calcul: calculSchema,
  taux: z.array(tauxSchema).min(1).describe('Liste des taux avec leur période de validité'),
  comptabilite: comptabiliteSchema.optional().describe('Informations de comptabilisation (optionnel)'),
});

// Schéma pour le fichier complet
const fichierCotisationsSchema = z.object({
  version: z.string().min(1).describe('Version du format YAML'),
  date_creation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date de création du fichier'),
  description: z.string().optional().describe('Description du fichier (optionnel)'),
  cotisations: z.array(regleCotisationSchema).min(1).describe('Liste des règles de cotisations'),
});

/**
 * Types TypeScript dérivés des schémas Zod
 */
export type Taux = z.infer<typeof tauxSchema>;
export type Calcul = z.infer<typeof calculSchema>;
export type Comptabilite = z.infer<typeof comptabiliteSchema>;
export type RegleCotisation = z.infer<typeof regleCotisationSchema>;
export type FichierCotisations = z.infer<typeof fichierCotisationsSchema>;

/**
 * Classe pour analyser et valider les fichiers YAML de règles de cotisations
 */
export class AnalyseurCotisations {
  /**
   * Charge et valide un fichier YAML de règles de cotisations
   * @param cheminFichier - Chemin vers le fichier YAML
   * @returns Les règles de cotisations validées
   * @throws Error si le fichier est invalide ou ne respecte pas le schéma
   */
  public chargerDepuisFichier(cheminFichier: string): FichierCotisations {
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(cheminFichier)) {
        throw new Error(`Le fichier ${cheminFichier} n'existe pas`);
      }

      // Lire le contenu du fichier
      const contenuFichier = fs.readFileSync(cheminFichier, 'utf8');

      // Parser le YAML
      const donnees = yaml.load(contenuFichier);

      // Valider avec Zod
      const resultat = fichierCotisationsSchema.parse(donnees);

      return resultat;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Formater les erreurs Zod de manière lisible
        const erreurs = error.issues.map((err: z.ZodIssue) =>
          `  - ${err.path.join('.')}: ${err.message}`
        ).join('\n');
        throw new Error(`Erreurs de validation du fichier YAML:\n${erreurs}`);
      }
      throw error;
    }
  }

  /**
   * Valide une chaîne YAML de règles de cotisations
   * @param contenuYaml - Contenu YAML sous forme de chaîne
   * @returns Les règles de cotisations validées
   * @throws Error si le contenu est invalide
   */
  public validerYaml(contenuYaml: string): FichierCotisations {
    try {
      const donnees = yaml.load(contenuYaml);
      return fichierCotisationsSchema.parse(donnees);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const erreurs = error.issues.map((err: z.ZodIssue) =>
          `  - ${err.path.join('.')}: ${err.message}`
        ).join('\n');
        throw new Error(`Erreurs de validation YAML:\n${erreurs}`);
      }
      throw error;
    }
  }

  /**
   * Obtient le taux applicable à une date donnée pour une règle de cotisation
   * @param regle - La règle de cotisation
   * @param date - La date pour laquelle obtenir le taux (défaut: aujourd'hui)
   * @returns Le taux applicable ou undefined si aucun taux n'est valide
   */
  public obtenirTauxADate(regle: RegleCotisation, date: Date = new Date()): Taux | undefined {
    const dateStr = date.toISOString().split('T')[0];

    return regle.taux.find(t => {
      const debut = t.date_debut;
      const fin = t.date_fin;

      if (fin) {
        return dateStr >= debut && dateStr <= fin;
      }
      return dateStr >= debut;
    });
  }

  /**
   * Filtre les règles actives
   * @param fichier - Le fichier de cotisations
   * @returns Les règles actives uniquement
   */
  public obtenirReglesActives(fichier: FichierCotisations): RegleCotisation[] {
    return fichier.cotisations.filter(c => c.actif);
  }

  /**
   * Filtre les règles par type
   * @param fichier - Le fichier de cotisations
   * @param type - Le type de cotisation recherché
   * @returns Les règles du type spécifié
   */
  public obtenirReglesParType(fichier: FichierCotisations, type: TypeCotisation): RegleCotisation[] {
    return fichier.cotisations.filter(c => c.type === type);
  }

  /**
   * Filtre les règles par catégorie
   * @param fichier - Le fichier de cotisations
   * @param categorie - La catégorie recherchée
   * @returns Les règles de la catégorie spécifiée
   */
  public obtenirReglesParCategorie(fichier: FichierCotisations, categorie: CategorieCotisation): RegleCotisation[] {
    return fichier.cotisations.filter(c => c.categorie === categorie);
  }

  /**
   * Méthode future pour importer les règles en base de données
   * @param regles - Les règles à importer
   * @note Cette méthode sera implémentée dans l'issue #3
   */
  public async importerRegles(regles: FichierCotisations): Promise<void> {
    // TODO: À implémenter dans l'issue #3 (API import/export)
    throw new Error('importerRegles() sera implémenté dans l\'issue #3');
  }
}

/**
 * Instance par défaut de l'analyseur
 */
export const analyseurCotisations = new AnalyseurCotisations();
