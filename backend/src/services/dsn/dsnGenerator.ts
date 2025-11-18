/**
 * Générateur de fichiers DSN (Déclaration Sociale Nominative)
 * Conforme à la NORME 4DS
 *
 * La DSN est organisée en blocs hiérarchiques :
 * - S10 : Déclarant (l'entité qui fait la déclaration)
 * - S20 : Entreprise
 * - S21 : Établissement
 * - S40 : Individu (employé)
 * - S41 : Rémunération
 * - S43 : Cotisation (détail des cotisations)
 */

/**
 * Interface représentant les données d'une entreprise pour la DSN
 */
export interface EntrepriseDSN {
  id: string;
  nom: string;
  siret: string;
  codeNaf?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  numeroUrssaf?: string;
}

/**
 * Interface représentant les données d'un employé pour la DSN
 */
export interface EmployeDSN {
  id: string;
  prenom: string;
  nom: string;
  numeroSecuriteSociale?: string;
  dateNaissance?: Date;
  lieuNaissance?: string;
  nationalite?: string;
  typeContrat?: string;
  dateEmbauche?: Date;
  dateFinContrat?: Date;
  numeroMatricule?: string;
}

/**
 * Interface représentant une ligne de cotisation pour la DSN
 */
export interface CotisationDSN {
  code: string;
  nom: string;
  organisme: string;
  typeCotisation: string;
  assiette: number;
  taux: number;
  montantSalarial: number;
  montantPatronal: number;
}

/**
 * Interface représentant une fiche de paie pour la DSN
 */
export interface FichePaieDSN {
  employe: EmployeDSN;
  salaireBrut: number;
  salaireNet: number;
  cotisations: CotisationDSN[];
}

/**
 * Interface représentant les données complètes pour générer une DSN
 */
export interface DonneesDSN {
  entreprise: EntrepriseDSN;
  periode: string; // Format YYYY-MM
  fichesPaie: FichePaieDSN[];
}

/**
 * Classe principale pour générer des fichiers DSN
 */
export class DSNGenerator {
  /**
   * Génère le XML complet d'une DSN
   * @param donnees Données de l'entreprise et des employés
   * @returns Le contenu XML de la DSN
   */
  genererDSN(donnees: DonneesDSN): string {
    const xml: string[] = [];

    // En-tête XML
    xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push('<DSN>');

    // Bloc S10 - Déclarant
    xml.push(this.genererBlocS10(donnees));

    // Bloc S20 - Entreprise
    xml.push(this.genererBlocS20(donnees));

    // Bloc S21 - Établissement
    xml.push(this.genererBlocS21(donnees));

    // Pour chaque employé : Blocs S40, S41, S43
    for (const fichePaie of donnees.fichesPaie) {
      xml.push(this.genererBlocS40(fichePaie.employe));
      xml.push(this.genererBlocS41(fichePaie, donnees.periode));
      xml.push(this.genererBlocS43(fichePaie.cotisations));
    }

    xml.push('</DSN>');

    return xml.join('\n');
  }

  /**
   * Génère le bloc S10 - Déclarant
   * Contient les informations sur l'entité qui fait la déclaration
   */
  private genererBlocS10(donnees: DonneesDSN): string {
    return `  <S10>
    <S10.G00.00.001>01</S10.G00.00.001> <!-- Type de déclarant : 01 = Entreprise -->
    <S10.G00.00.002>${this.echapperXML(donnees.entreprise.siret)}</S10.G00.00.002> <!-- SIRET du déclarant -->
    <S10.G00.00.003>${this.echapperXML(donnees.entreprise.nom)}</S10.G00.00.003> <!-- Raison sociale -->
  </S10>`;
  }

  /**
   * Génère le bloc S20 - Entreprise
   * Contient les informations administratives de l'entreprise
   */
  private genererBlocS20(donnees: DonneesDSN): string {
    const entreprise = donnees.entreprise;
    return `  <S20>
    <S20.G00.05.001>${this.echapperXML(entreprise.siret.substring(0, 9))}</S20.G00.05.001> <!-- SIREN -->
    <S20.G00.05.002>${this.echapperXML(entreprise.nom)}</S20.G00.05.002> <!-- Raison sociale -->
    ${entreprise.codeNaf ? `<S20.G00.05.003>${this.echapperXML(entreprise.codeNaf)}</S20.G00.05.003> <!-- Code NAF -->` : ''}
    ${entreprise.adresse ? `<S20.G00.05.004>${this.echapperXML(entreprise.adresse)}</S20.G00.05.004> <!-- Adresse -->` : ''}
    ${entreprise.codePostal ? `<S20.G00.05.005>${this.echapperXML(entreprise.codePostal)}</S20.G00.05.005> <!-- Code postal -->` : ''}
    ${entreprise.ville ? `<S20.G00.05.006>${this.echapperXML(entreprise.ville)}</S20.G00.05.006> <!-- Ville -->` : ''}
  </S20>`;
  }

  /**
   * Génère le bloc S21 - Établissement
   * Contient les informations sur l'établissement
   */
  private genererBlocS21(donnees: DonneesDSN): string {
    const entreprise = donnees.entreprise;
    return `  <S21>
    <S21.G00.06.001>${this.echapperXML(entreprise.siret)}</S21.G00.06.001> <!-- SIRET de l'établissement -->
    <S21.G00.06.002>${this.echapperXML(entreprise.nom)}</S21.G00.06.002> <!-- Raison sociale -->
    ${entreprise.adresse ? `<S21.G00.06.003>${this.echapperXML(entreprise.adresse)}</S21.G00.06.003> <!-- Adresse -->` : ''}
    ${entreprise.codePostal ? `<S21.G00.06.004>${this.echapperXML(entreprise.codePostal)}</S21.G00.06.004> <!-- Code postal -->` : ''}
    ${entreprise.ville ? `<S21.G00.06.005>${this.echapperXML(entreprise.ville)}</S21.G00.06.005> <!-- Ville -->` : ''}
    ${entreprise.numeroUrssaf ? `<S21.G00.06.006>${this.echapperXML(entreprise.numeroUrssaf)}</S21.G00.06.006> <!-- N° URSSAF -->` : ''}
  </S21>`;
  }

  /**
   * Génère le bloc S40 - Individu (employé)
   * Contient les informations personnelles de l'employé
   */
  private genererBlocS40(employe: EmployeDSN): string {
    return `  <S40>
    <S40.G00.20.001>${this.echapperXML(employe.nom)}</S40.G00.20.001> <!-- Nom de famille -->
    <S40.G00.20.002>${this.echapperXML(employe.prenom)}</S40.G00.20.002> <!-- Prénom -->
    ${employe.numeroSecuriteSociale ? `<S40.G00.20.003>${this.echapperXML(employe.numeroSecuriteSociale)}</S40.G00.20.003> <!-- N° Sécurité Sociale -->` : ''}
    ${employe.dateNaissance ? `<S40.G00.20.004>${this.formaterDate(employe.dateNaissance)}</S40.G00.20.004> <!-- Date de naissance -->` : ''}
    ${employe.lieuNaissance ? `<S40.G00.20.005>${this.echapperXML(employe.lieuNaissance)}</S40.G00.20.005> <!-- Lieu de naissance -->` : ''}
    ${employe.nationalite ? `<S40.G00.20.006>${this.echapperXML(employe.nationalite)}</S40.G00.20.006> <!-- Nationalité -->` : ''}
    ${employe.numeroMatricule ? `<S40.G00.20.007>${this.echapperXML(employe.numeroMatricule)}</S40.G00.20.007> <!-- N° matricule -->` : ''}
  </S40>`;
  }

  /**
   * Génère le bloc S41 - Rémunération
   * Contient les informations sur la paie de l'employé
   */
  private genererBlocS41(fichePaie: FichePaieDSN, periode: string): string {
    return `  <S41>
    <S41.G00.30.001>${periode}</S41.G00.30.001> <!-- Période de paie (YYYY-MM) -->
    <S41.G00.30.002>${this.formaterMontant(fichePaie.salaireBrut)}</S41.G00.30.002> <!-- Salaire brut -->
    <S41.G00.30.003>${this.formaterMontant(fichePaie.salaireNet)}</S41.G00.30.003> <!-- Salaire net -->
    ${fichePaie.employe.typeContrat ? `<S41.G00.30.004>${this.echapperXML(fichePaie.employe.typeContrat)}</S41.G00.30.004> <!-- Type de contrat -->` : ''}
    ${fichePaie.employe.dateEmbauche ? `<S41.G00.30.005>${this.formaterDate(fichePaie.employe.dateEmbauche)}</S41.G00.30.005> <!-- Date d'embauche -->` : ''}
  </S41>`;
  }

  /**
   * Génère le bloc S43 - Cotisations
   * Contient le détail de toutes les cotisations sociales
   */
  private genererBlocS43(cotisations: CotisationDSN[]): string {
    const xml: string[] = ['  <S43>'];

    for (const cotisation of cotisations) {
      xml.push(`    <S43.G00.50.001>${this.echapperXML(cotisation.code)}</S43.G00.50.001> <!-- Code cotisation -->`);
      xml.push(`    <S43.G00.50.002>${this.echapperXML(cotisation.nom)}</S43.G00.50.002> <!-- Libellé -->`);
      xml.push(`    <S43.G00.50.003>${this.echapperXML(cotisation.organisme)}</S43.G00.50.003> <!-- Organisme -->`);
      xml.push(`    <S43.G00.50.004>${this.formaterMontant(cotisation.assiette)}</S43.G00.50.004> <!-- Assiette -->`);
      xml.push(`    <S43.G00.50.005>${this.formaterTaux(cotisation.taux)}</S43.G00.50.005> <!-- Taux -->`);
      xml.push(`    <S43.G00.50.006>${this.formaterMontant(cotisation.montantSalarial)}</S43.G00.50.006> <!-- Montant salarial -->`);
      xml.push(`    <S43.G00.50.007>${this.formaterMontant(cotisation.montantPatronal)}</S43.G00.50.007> <!-- Montant patronal -->`);
    }

    xml.push('  </S43>');
    return xml.join('\n');
  }

  /**
   * Échappe les caractères spéciaux XML
   */
  private echapperXML(texte: string): string {
    if (!texte) return '';
    return texte
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Formate une date au format YYYY-MM-DD requis par la DSN
   */
  private formaterDate(date: Date): string {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  /**
   * Formate un montant en euros avec 2 décimales
   */
  private formaterMontant(montant: number): string {
    if (montant === undefined || montant === null) return '0.00';
    return montant.toFixed(2);
  }

  /**
   * Formate un taux (pourcentage) avec 4 décimales
   */
  private formaterTaux(taux: number): string {
    if (taux === undefined || taux === null) return '0.0000';
    return taux.toFixed(4);
  }
}

/**
 * Fonction utilitaire pour créer une instance du générateur DSN
 */
export function creerGenerateurDSN(): DSNGenerator {
  return new DSNGenerator();
}
