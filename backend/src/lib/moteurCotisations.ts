/**
 * Moteur de calcul des cotisations sociales
 *
 * Ce module implémente le calcul détaillé des cotisations sociales pour la génération
 * de fiches de paie conformes à la réglementation française.
 *
 * @module moteurCotisations
 */

import prisma from './db';

// ========== Types ==========

/** Type de cotisation : définit qui supporte la charge */
export type TypeCotisation = 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE' | 'CHARGE_FISCALE';

/** Type de calcul de la cotisation */
export type TypeCalcul = 'POURCENTAGE' | 'MONTANT_FIXE' | 'TRANCHES';

/** Type d'assiette de calcul */
export type TypeAssiette = 'SALAIRE_BRUT' | 'SALAIRE_NET' | 'SALAIRE_PLAFONNE';

// ========== Constantes ==========

/** Plafond Annuel de la Sécurité Sociale 2025 (en euros) */
export const PASS_ANNUEL = 46368;

/** Plafond Mensuel de la Sécurité Sociale 2025 (en euros) */
export const PASS_MENSUEL = PASS_ANNUEL / 12; // 3864€

/** Plafond Journalier de la Sécurité Sociale 2025 (en euros) */
export const PASS_JOURNALIER = PASS_ANNUEL / 365; // ~127€

// ========== Interfaces ==========

/**
 * Paramètres d'entrée pour le calcul des cotisations
 */
export interface ParametresCalcul {
  /** Salaire brut mensuel en euros */
  salaireBrut: number;

  /** Date de référence pour appliquer les taux en vigueur */
  dateReference: Date;

  /** Plafond mensuel de la sécurité sociale (optionnel, par défaut PASS_MENSUEL) */
  plafondMensuel?: number;
}

/**
 * Une ligne de cotisation calculée
 */
export interface LigneCotisation {
  /** Code unique de la règle de cotisation */
  code: string;

  /** Nom de la cotisation (ex: "Assurance maladie") */
  nom: string;

  /** Catégorie de la cotisation (ex: "Sécurité sociale") */
  categorie: string;

  /** Organisme collecteur (ex: "URSSAF") */
  organisme: string;

  /** Type de cotisation (SALARIALE, PATRONALE, FISCALE) */
  typeCotisation: TypeCotisation;

  /** Assiette de calcul en euros (base sur laquelle s'applique le taux) */
  assiette: number;

  /** Taux appliqué (ex: 0.0755 pour 7,55%) */
  taux: number;

  /** Montant de la part salariale en euros (0 si patronale) */
  montantSalarial: number;

  /** Montant de la part patronale en euros (0 si salariale) */
  montantPatronal: number;

  /** Montant total (salarial + patronal) en euros */
  montantTotal: number;
}

/**
 * Résultat complet du calcul des cotisations
 */
export interface ResultatCalcul {
  /** Salaire brut de départ */
  salaireBrut: number;

  /** Liste détaillée de toutes les lignes de cotisations */
  lignesCotisations: LigneCotisation[];

  /** Total des cotisations salariales (déduites du brut) */
  totalCotisationsSalariales: number;

  /** Total des cotisations patronales (charge employeur) */
  totalCotisationsPatronales: number;

  /** Total général de toutes les cotisations */
  totalCotisations: number;

  /** Salaire net = brut - cotisations salariales */
  salaireNet: number;

  /** Coût total employeur = brut + cotisations patronales */
  coutTotal: number;

  /** Date de référence utilisée pour les taux */
  dateReference: Date;
}

/**
 * Règle de cotisation enrichie avec son taux applicable
 */
interface RegleAvecTaux {
  id: string;
  code: string;
  nom: string;
  categorie: { nom: string };
  organisme: { nom: string };
  typeCotisation: TypeCotisation;
  typeCalcul: TypeCalcul;
  typeAssiette: TypeAssiette;
  plancher: number | null;
  plafond: number | null;
  taux: number;
}

// ========== Fonctions utilitaires ==========

/**
 * Arrondit un montant à 2 décimales (centimes)
 * Utilise Math.round() qui arrondit "half away from zero" (0.5 → 1, -0.5 → -1)
 *
 * @param montant - Montant à arrondir
 * @returns Montant arrondi au centime près
 */
function arrondir(montant: number): number {
  return Math.round(montant * 100) / 100;
}

/**
 * Récupère le taux applicable pour une règle de cotisation à une date donnée
 *
 * @param regleId - ID de la règle de cotisation
 * @param dateReference - Date pour laquelle récupérer le taux
 * @returns Le taux applicable ou null si aucun taux trouvé
 */
async function getTauxApplicable(
  regleId: string,
  dateReference: Date
): Promise<number | null> {
  const taux = await prisma.tauxCotisation.findFirst({
    where: {
      regleId,
      dateDebut: { lte: dateReference },
      OR: [
        { dateFin: null },
        { dateFin: { gt: dateReference } }
      ]
    },
    orderBy: { dateDebut: 'desc' }
  });

  return taux ? taux.taux : null;
}

/**
 * Calcule l'assiette de cotisation selon le type d'assiette
 *
 * @param typeAssiette - Type d'assiette (BRUT, NET, PLAFONNE)
 * @param salaireBrut - Salaire brut mensuel
 * @param salaireNet - Salaire net (pour assiette NET)
 * @param plafondMensuel - Plafond mensuel de la sécurité sociale
 * @returns Assiette calculée
 */
function calculerAssiette(
  typeAssiette: TypeAssiette,
  salaireBrut: number,
  salaireNet: number,
  plafondMensuel: number
): number {
  switch (typeAssiette) {
    case 'SALAIRE_BRUT':
      return salaireBrut;

    case 'SALAIRE_NET':
      return salaireNet;

    case 'SALAIRE_PLAFONNE':
      return Math.min(salaireBrut, plafondMensuel);

    default:
      return salaireBrut;
  }
}

/**
 * Applique les limites (plancher/plafond) à une assiette
 *
 * @param assiette - Assiette de base
 * @param plancher - Plancher optionnel (montant minimum)
 * @param plafond - Plafond optionnel (montant maximum)
 * @returns Assiette après application des limites
 */
function appliquerLimites(
  assiette: number,
  plancher: number | null,
  plafond: number | null
): number {
  let assietteLimitee = assiette;

  // Appliquer le plafond si défini
  if (plafond !== null && assietteLimitee > plafond) {
    assietteLimitee = plafond;
  }

  // Appliquer le plancher si défini
  if (plancher !== null && assietteLimitee < plancher) {
    assietteLimitee = plancher;
  }

  return assietteLimitee;
}

/**
 * Calcule le montant d'une cotisation selon son type de calcul
 *
 * @param typeCalcul - Type de calcul (POURCENTAGE, MONTANT_FIXE, TRANCHES)
 * @param assiette - Assiette de calcul
 * @param taux - Taux applicable
 * @returns Montant calculé
 */
function calculerMontant(
  typeCalcul: TypeCalcul,
  assiette: number,
  taux: number
): number {
  switch (typeCalcul) {
    case 'POURCENTAGE':
      return assiette * taux;

    case 'MONTANT_FIXE':
      // Pour un montant fixe, le taux représente directement le montant
      return taux;

    case 'TRANCHES':
      // TODO: Implémenter le calcul par tranches
      // Pour l'instant, on utilise un calcul simple par pourcentage
      // Cette fonctionnalité sera ajoutée dans une version future
      return assiette * taux;

    default:
      return 0;
  }
}

// ========== Fonction principale ==========

/**
 * Calcule toutes les cotisations sociales pour un salaire brut donné
 *
 * Cette fonction :
 * 1. Récupère toutes les règles de cotisations actives à la date de référence
 * 2. Calcule chaque cotisation selon son type (pourcentage, fixe, tranches)
 * 3. Applique les plafonds et planchers
 * 4. Distingue cotisations salariales et patronales
 * 5. Génère un détail ligne par ligne
 * 6. Calcule le salaire net et le coût total employeur
 *
 * @param parametres - Paramètres de calcul (salaire brut, date de référence)
 * @returns Résultat complet du calcul avec détails
 *
 * @example
 * ```typescript
 * const resultat = await calculerCotisations({
 *   salaireBrut: 3000,
 *   dateReference: new Date('2025-01-15')
 * });
 *
 * console.log(`Salaire net : ${resultat.salaireNet}€`);
 * console.log(`Coût employeur : ${resultat.coutTotal}€`);
 * ```
 */
export async function calculerCotisations(
  parametres: ParametresCalcul
): Promise<ResultatCalcul> {
  const { salaireBrut, dateReference, plafondMensuel = PASS_MENSUEL } = parametres;

  // Validation des paramètres
  if (salaireBrut < 0) {
    throw new Error('Le salaire brut ne peut pas être négatif');
  }

  if (!dateReference || isNaN(dateReference.getTime())) {
    throw new Error('Date de référence invalide');
  }

  // Récupérer toutes les règles de cotisations actives
  const regles = await prisma.regleCotisation.findMany({
    where: { estActif: true },
    include: {
      categorie: { select: { nom: true } },
      organisme: { select: { nom: true } }
    }
  });

  // Enrichir les règles avec leurs taux applicables
  const reglesAvecTaux: RegleAvecTaux[] = [];

  for (const regle of regles) {
    const taux = await getTauxApplicable(regle.id, dateReference);

    // Ignorer les règles sans taux applicable
    if (taux !== null) {
      reglesAvecTaux.push({
        id: regle.id,
        code: regle.code,
        nom: regle.nom,
        categorie: regle.categorie,
        organisme: regle.organisme,
        typeCotisation: regle.typeCotisation,
        typeCalcul: regle.typeCalcul,
        typeAssiette: regle.typeAssiette,
        plancher: regle.plancher,
        plafond: regle.plafond,
        taux
      });
    }
  }

  // Initialiser les variables de calcul
  let totalCotisationsSalariales = 0;
  let totalCotisationsPatronales = 0;
  const lignesCotisations: LigneCotisation[] = [];

  // Calculer une première estimation du salaire net pour les assiettes de type SALAIRE_NET
  // (on réitérera si nécessaire pour converger)
  let salaireNetEstime = salaireBrut * 0.78; // Estimation initiale ~22% de charges

  // Boucle de convergence pour le calcul du salaire net
  // Certaines cotisations (ex: CSG/CRDS) sont calculées sur le salaire net
  // On itère jusqu'à convergence
  const MAX_ITERATIONS = 5;
  let iteration = 0;
  let convergence = false;

  while (!convergence && iteration < MAX_ITERATIONS) {
    iteration++;
    const ancienTotal = totalCotisationsSalariales;
    totalCotisationsSalariales = 0;
    totalCotisationsPatronales = 0;
    lignesCotisations.length = 0;

    // Calculer chaque cotisation
    for (const regle of reglesAvecTaux) {
      // Calculer l'assiette selon le type
      const assietteBase = calculerAssiette(
        regle.typeAssiette,
        salaireBrut,
        salaireNetEstime,
        plafondMensuel
      );

      // Appliquer les limites (plancher/plafond)
      const assiette = appliquerLimites(
        assietteBase,
        regle.plancher,
        regle.plafond
      );

      // Calculer le montant de la cotisation
      const montantBrut = calculerMontant(
        regle.typeCalcul,
        assiette,
        regle.taux
      );

      // Arrondir au centime
      const montant = arrondir(montantBrut);

      // Répartir entre salarial et patronal
      let montantSalarial = 0;
      let montantPatronal = 0;

      if (regle.typeCotisation === 'COTISATION_SALARIALE') {
        montantSalarial = montant;
        totalCotisationsSalariales += montant;
      } else if (regle.typeCotisation === 'COTISATION_PATRONALE') {
        montantPatronal = montant;
        totalCotisationsPatronales += montant;
      } else if (regle.typeCotisation === 'CHARGE_FISCALE') {
        // Les charges fiscales sont généralement patronales
        montantPatronal = montant;
        totalCotisationsPatronales += montant;
      }

      // Créer la ligne de cotisation
      lignesCotisations.push({
        code: regle.code,
        nom: regle.nom,
        categorie: regle.categorie.nom,
        organisme: regle.organisme.nom,
        typeCotisation: regle.typeCotisation,
        assiette: arrondir(assiette),
        taux: regle.taux,
        montantSalarial: arrondir(montantSalarial),
        montantPatronal: arrondir(montantPatronal),
        montantTotal: arrondir(montant)
      });
    }

    // Arrondir les totaux
    totalCotisationsSalariales = arrondir(totalCotisationsSalariales);
    totalCotisationsPatronales = arrondir(totalCotisationsPatronales);

    // Nouveau salaire net estimé
    const nouveauSalaireNet = arrondir(salaireBrut - totalCotisationsSalariales);

    // Vérifier la convergence (les deux valeurs doivent avoir convergé)
    if (Math.abs(nouveauSalaireNet - salaireNetEstime) < 0.01 &&
        Math.abs(totalCotisationsSalariales - ancienTotal) < 0.01) {
      convergence = true;
    }

    salaireNetEstime = nouveauSalaireNet;
  }

  // Calculer les totaux finaux
  const salaireNet = arrondir(salaireBrut - totalCotisationsSalariales);
  const totalCotisations = arrondir(totalCotisationsSalariales + totalCotisationsPatronales);
  const coutTotal = arrondir(salaireBrut + totalCotisationsPatronales);

  // Retourner le résultat complet
  return {
    salaireBrut,
    lignesCotisations,
    totalCotisationsSalariales,
    totalCotisationsPatronales,
    totalCotisations,
    salaireNet,
    coutTotal,
    dateReference
  };
}

/**
 * Génère une fiche de paie simplifiée au format texte
 *
 * @param resultat - Résultat du calcul des cotisations
 * @returns Fiche de paie formatée
 */
export function genererFichePaieTexte(resultat: ResultatCalcul): string {
  const lignes: string[] = [];

  lignes.push('='.repeat(80));
  lignes.push('FICHE DE PAIE');
  lignes.push('='.repeat(80));
  lignes.push('');
  lignes.push(`Date de référence : ${resultat.dateReference.toLocaleDateString('fr-FR')}`);
  lignes.push(`Salaire brut : ${resultat.salaireBrut.toFixed(2)} €`);
  lignes.push('');
  lignes.push('-'.repeat(80));
  lignes.push('DÉTAIL DES COTISATIONS');
  lignes.push('-'.repeat(80));
  lignes.push('');

  // Grouper par catégorie
  const parCategorie = new Map<string, LigneCotisation[]>();
  for (const ligne of resultat.lignesCotisations) {
    const cat = ligne.categorie;
    if (!parCategorie.has(cat)) {
      parCategorie.set(cat, []);
    }
    parCategorie.get(cat)!.push(ligne);
  }

  // Afficher par catégorie
  for (const [categorie, lignesCat] of parCategorie.entries()) {
    lignes.push(`${categorie}:`);
    lignes.push('');

    for (const ligne of lignesCat) {
      const assiette = ligne.assiette.toFixed(2).padStart(10);
      const taux = (ligne.taux * 100).toFixed(2).padStart(6);
      const salarial = ligne.montantSalarial.toFixed(2).padStart(10);
      const patronal = ligne.montantPatronal.toFixed(2).padStart(10);

      lignes.push(`  ${ligne.nom.padEnd(40)} ${assiette} € × ${taux} %`);
      lignes.push(`    Part salariale: ${salarial} €  Part patronale: ${patronal} €`);
      lignes.push('');
    }
  }

  lignes.push('-'.repeat(80));
  lignes.push('TOTAUX');
  lignes.push('-'.repeat(80));
  lignes.push(`Salaire brut                         : ${resultat.salaireBrut.toFixed(2)} €`);
  lignes.push(`Total cotisations salariales         : ${resultat.totalCotisationsSalariales.toFixed(2)} €`);
  lignes.push(`SALAIRE NET                          : ${resultat.salaireNet.toFixed(2)} €`);
  lignes.push('');
  lignes.push(`Total cotisations patronales         : ${resultat.totalCotisationsPatronales.toFixed(2)} €`);
  lignes.push(`COÛT TOTAL EMPLOYEUR                 : ${resultat.coutTotal.toFixed(2)} €`);
  lignes.push('='.repeat(80));

  return lignes.join('\n');
}
