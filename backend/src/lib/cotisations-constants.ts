/**
 * Constantes et validateurs pour les règles de cotisations
 */

// ========== Types Enum valides ==========

export const TYPE_COTISATION_VALIDES = [
  'COTISATION_SALARIALE',
  'COTISATION_PATRONALE',
  'CHARGE_FISCALE',
] as const;

export const TYPE_CALCUL_VALIDES = [
  'POURCENTAGE',
  'MONTANT_FIXE',
  'TRANCHES',
] as const;

export const TYPE_ASSIETTE_VALIDES = [
  'SALAIRE_BRUT',
  'SALAIRE_NET',
  'SALAIRE_PLAFONNE',
] as const;

// ========== Configuration PASS (Plafond Annuel de la Sécurité Sociale) ==========

/**
 * Configuration du PASS pour l'année en cours
 * À mettre à jour chaque année selon les directives officielles
 *
 * Source: https://www.urssaf.fr/portail/home/taux-et-baremes/plafond-de-la-securite-social.html
 */
export const PASS_CONFIG = {
  annee: 2025,
  montantAnnuel: 46368, // 46 368 € annuel pour 2025
  montantMensuel: 3864,  // 3 864 € mensuel pour 2025
  montantHebdomadaire: 894,  // 894 € hebdomadaire pour 2025
  montantJournalier: 226,    // 226 € journalier pour 2025
} as const;

// ========== Fonctions de validation ==========

/**
 * Valide un type de cotisation
 */
export function isTypeCotisationValide(type: string): boolean {
  return TYPE_COTISATION_VALIDES.includes(type as any);
}

/**
 * Valide un type de calcul
 */
export function isTypeCalculValide(type: string): boolean {
  return TYPE_CALCUL_VALIDES.includes(type as any);
}

/**
 * Valide un type d'assiette
 */
export function isTypeAssietteValide(type: string): boolean {
  return TYPE_ASSIETTE_VALIDES.includes(type as any);
}

/**
 * Récupère le PASS mensuel pour l'année en cours
 */
export function getPassMensuel(): number {
  return PASS_CONFIG.montantMensuel;
}

/**
 * Récupère le PASS annuel pour l'année en cours
 */
export function getPassAnnuel(): number {
  return PASS_CONFIG.montantAnnuel;
}

// ========== Messages d'erreur ==========

export const MESSAGES_ERREUR = {
  TYPE_COTISATION_INVALIDE: `Type de cotisation invalide. Valeurs acceptées : ${TYPE_COTISATION_VALIDES.join(', ')}`,
  TYPE_CALCUL_INVALIDE: `Type de calcul invalide. Valeurs acceptées : ${TYPE_CALCUL_VALIDES.join(', ')}`,
  TYPE_ASSIETTE_INVALIDE: `Type d'assiette invalide. Valeurs acceptées : ${TYPE_ASSIETTE_VALIDES.join(', ')}`,
  TAUX_INVALIDE: 'Le taux doit être un nombre entre 0 et 1',
  PLANCHER_INVALIDE: 'Le plancher doit être un nombre positif',
  PLAFOND_INVALIDE: 'Le plafond doit être un nombre positif',
  DATE_DEBUT_REQUISE: 'La date de début est requise',
  DATE_FIN_ANTERIEURE: 'La date de fin doit être postérieure à la date de début',
  DATES_EGALES: 'La date de fin ne peut pas être égale à la date de début',
} as const;
