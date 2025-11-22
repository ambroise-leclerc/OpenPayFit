/**
 * Constantes pour la gestion des DSN (Déclarations Sociales Nominatives)
 */

/**
 * Types d'événements DSN valides
 * Ces types correspondent à l'enum TypeEvenementDSN du schéma Prisma
 */
export const TYPES_EVENEMENTS_DSN = [
  'EMBAUCHE',
  'FIN_CONTRAT',
  'ARRET_MALADIE',
  'CONGE_MATERNITE',
  'CONGE_PATERNITE',
  'CHANGEMENT_CONTRAT',
  'AUTRE'
] as const;

/**
 * Type TypeScript pour un type d'événement DSN
 */
export type TypeEvenementDSN = typeof TYPES_EVENEMENTS_DSN[number];

/**
 * Vérifie si une valeur est un type d'événement DSN valide
 */
export function estTypeEvenementValide(type: string): type is TypeEvenementDSN {
  return TYPES_EVENEMENTS_DSN.includes(type as any);
}
