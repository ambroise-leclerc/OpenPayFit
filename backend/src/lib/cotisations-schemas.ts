import { z } from 'zod';
import { TYPE_COTISATION_VALIDES, TYPE_CALCUL_VALIDES, TYPE_ASSIETTE_VALIDES } from './cotisations-constants';

/**
 * Schémas de validation Zod pour l'import de données de cotisations
 */

// Schéma pour une catégorie
export const categorieSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
});

// Schéma pour un organisme
export const organismeSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
});

// Schéma pour un taux
export const tauxSchema = z.object({
  taux: z.number().min(0, 'Le taux doit être >= 0').max(1, 'Le taux doit être <= 1'),
  dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de début au format YYYY-MM-DD requis'),
  dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de fin au format YYYY-MM-DD').optional().nullable(),
});

// Schéma pour une règle
export const regleSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
  categorieCode: z.string().min(1, 'Le code de catégorie est requis'),
  organismeCode: z.string().min(1, 'Le code d\'organisme est requis'),
  typeCotisation: z.enum(TYPE_COTISATION_VALIDES as any, 'Type de cotisation invalide'),
  typeCalcul: z.enum(TYPE_CALCUL_VALIDES as any, 'Type de calcul invalide'),
  typeAssiette: z.enum(TYPE_ASSIETTE_VALIDES as any, 'Type d\'assiette invalide'),
  plancher: z.number().nonnegative('Le plancher doit être >= 0').optional().nullable(),
  plafond: z.number().nonnegative('Le plafond doit être >= 0').optional().nullable(),
  estActif: z.boolean().optional(),
  taux: z.array(tauxSchema).optional(),
});

// Schéma pour l'ensemble des données d'import
export const importDataSchema = z.object({
  categories: z.array(categorieSchema).optional(),
  organismes: z.array(organismeSchema).optional(),
  regles: z.array(regleSchema).optional(),
}).refine(
  (data) => data.categories || data.organismes || data.regles,
  {
    message: 'Les données doivent contenir au moins un des champs: categories, organismes, regles',
  }
);

/**
 * Type TypeScript dérivé du schéma d'import
 */
export type ImportData = z.infer<typeof importDataSchema>;
