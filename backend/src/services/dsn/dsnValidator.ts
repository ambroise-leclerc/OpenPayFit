/**
 * Validateur DSN - Vérifie la conformité des données avant génération
 * Effectue des contrôles métier et de cohérence
 */

import { DonneesDSN, EntrepriseDSN, EmployeDSN } from './dsnGenerator';

/**
 * Types de messages de validation
 */
export enum TypeMessageValidation {
  ERREUR = 'ERREUR',
  AVERTISSEMENT = 'AVERTISSEMENT',
  INFORMATION = 'INFORMATION'
}

/**
 * Interface représentant un message de validation
 */
export interface MessageValidation {
  type: TypeMessageValidation;
  code: string;
  message: string;
  champ?: string;
}

/**
 * Résultat de la validation
 */
export interface ResultatValidation {
  valide: boolean;
  messages: MessageValidation[];
}

/**
 * Classe principale pour valider les données DSN
 */
export class DSNValidator {
  /**
   * Valide les données complètes d'une DSN
   * @param donnees Données à valider
   * @returns Résultat de la validation avec les messages
   */
  valider(donnees: DonneesDSN): ResultatValidation {
    const messages: MessageValidation[] = [];

    // Validation de l'entreprise
    messages.push(...this.validerEntreprise(donnees.entreprise));

    // Validation de la période
    messages.push(...this.validerPeriode(donnees.periode));

    // Validation des employés et fiches de paie
    for (const fichePaie of donnees.fichesPaie) {
      messages.push(...this.validerEmploye(fichePaie.employe));
      messages.push(...this.validerFichePaie(fichePaie));
    }

    // La DSN est valide s'il n'y a aucune erreur
    const valide = !messages.some(m => m.type === TypeMessageValidation.ERREUR);

    return { valide, messages };
  }

  /**
   * Valide les informations de l'entreprise
   */
  private validerEntreprise(entreprise: EntrepriseDSN): MessageValidation[] {
    const messages: MessageValidation[] = [];

    // SIRET obligatoire
    if (!entreprise.siret) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'ENT001',
        message: 'Le numéro SIRET est obligatoire pour la DSN',
        champ: 'siret'
      });
    } else if (!/^\d{14}$/.test(entreprise.siret)) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'ENT002',
        message: 'Le numéro SIRET doit contenir exactement 14 chiffres',
        champ: 'siret'
      });
    }

    // Raison sociale obligatoire
    if (!entreprise.nom || entreprise.nom.trim().length === 0) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'ENT003',
        message: 'La raison sociale est obligatoire',
        champ: 'nom'
      });
    }

    // Code NAF recommandé
    if (!entreprise.codeNaf) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'ENT004',
        message: 'Le code NAF est recommandé pour la DSN',
        champ: 'codeNaf'
      });
    } else if (!/^\d{4}[A-Z]$/.test(entreprise.codeNaf)) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'ENT005',
        message: 'Le code NAF doit être au format 4 chiffres + 1 lettre (ex: 6201Z)',
        champ: 'codeNaf'
      });
    }

    // Adresse recommandée
    if (!entreprise.adresse || !entreprise.codePostal || !entreprise.ville) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'ENT006',
        message: 'L\'adresse complète est recommandée pour la DSN',
        champ: 'adresse'
      });
    }

    // Code postal français
    if (entreprise.codePostal && !/^\d{5}$/.test(entreprise.codePostal)) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'ENT007',
        message: 'Le code postal doit contenir 5 chiffres',
        champ: 'codePostal'
      });
    }

    return messages;
  }

  /**
   * Valide la période de déclaration
   */
  private validerPeriode(periode: string): MessageValidation[] {
    const messages: MessageValidation[] = [];

    if (!periode) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'PER001',
        message: 'La période de déclaration est obligatoire',
        champ: 'periode'
      });
    } else if (!/^\d{4}-\d{2}$/.test(periode)) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'PER002',
        message: 'La période doit être au format YYYY-MM (ex: 2025-03)',
        champ: 'periode'
      });
    } else {
      // Vérifier que le mois est valide (01-12)
      const [annee, mois] = periode.split('-');
      const moisNum = parseInt(mois, 10);
      if (moisNum < 1 || moisNum > 12) {
        messages.push({
          type: TypeMessageValidation.ERREUR,
          code: 'PER003',
          message: 'Le mois doit être entre 01 et 12',
          champ: 'periode'
        });
      }

      // Avertissement si la période est dans le futur
      const periodeDate = new Date(`${annee}-${mois}-01`);
      const maintenant = new Date();
      if (periodeDate > maintenant) {
        messages.push({
          type: TypeMessageValidation.AVERTISSEMENT,
          code: 'PER004',
          message: 'La période de déclaration est dans le futur',
          champ: 'periode'
        });
      }
    }

    return messages;
  }

  /**
   * Valide les informations d'un employé
   */
  private validerEmploye(employe: EmployeDSN): MessageValidation[] {
    const messages: MessageValidation[] = [];

    // Nom et prénom obligatoires
    if (!employe.nom || employe.nom.trim().length === 0) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'EMP001',
        message: `Le nom de l'employé ${employe.id} est obligatoire`,
        champ: 'nom'
      });
    }

    if (!employe.prenom || employe.prenom.trim().length === 0) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'EMP002',
        message: `Le prénom de l'employé ${employe.id} est obligatoire`,
        champ: 'prenom'
      });
    }

    // Numéro de sécurité sociale recommandé
    if (!employe.numeroSecuriteSociale) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'EMP003',
        message: `Le numéro de sécurité sociale de ${employe.prenom} ${employe.nom} est recommandé`,
        champ: 'numeroSecuriteSociale'
      });
    } else if (!/^\d{15}$/.test(employe.numeroSecuriteSociale)) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'EMP004',
        message: `Le numéro de sécurité sociale de ${employe.prenom} ${employe.nom} doit contenir 15 chiffres`,
        champ: 'numeroSecuriteSociale'
      });
    }

    // Date de naissance recommandée
    if (!employe.dateNaissance) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'EMP005',
        message: `La date de naissance de ${employe.prenom} ${employe.nom} est recommandée`,
        champ: 'dateNaissance'
      });
    } else {
      // Vérifier que l'âge est cohérent (entre 16 et 99 ans)
      const dateNaissance = new Date(employe.dateNaissance);
      const maintenant = new Date();
      const age = maintenant.getFullYear() - dateNaissance.getFullYear();
      if (age < 16 || age > 99) {
        messages.push({
          type: TypeMessageValidation.AVERTISSEMENT,
          code: 'EMP006',
          message: `L'âge de ${employe.prenom} ${employe.nom} (${age} ans) semble incorrect`,
          champ: 'dateNaissance'
        });
      }
    }

    // Type de contrat recommandé
    if (!employe.typeContrat) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'EMP007',
        message: `Le type de contrat de ${employe.prenom} ${employe.nom} est recommandé`,
        champ: 'typeContrat'
      });
    }

    // Date d'embauche recommandée
    if (!employe.dateEmbauche) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'EMP008',
        message: `La date d'embauche de ${employe.prenom} ${employe.nom} est recommandée`,
        champ: 'dateEmbauche'
      });
    }

    return messages;
  }

  /**
   * Valide une fiche de paie
   */
  private validerFichePaie(fichePaie: any): MessageValidation[] {
    const messages: MessageValidation[] = [];
    const employe = fichePaie.employe;

    // Salaire brut positif
    if (!fichePaie.salaireBrut || fichePaie.salaireBrut <= 0) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'PAY001',
        message: `Le salaire brut de ${employe.prenom} ${employe.nom} doit être positif`,
        champ: 'salaireBrut'
      });
    }

    // Salaire net cohérent avec le brut
    if (fichePaie.salaireNet && fichePaie.salaireNet > fichePaie.salaireBrut) {
      messages.push({
        type: TypeMessageValidation.ERREUR,
        code: 'PAY002',
        message: `Le salaire net de ${employe.prenom} ${employe.nom} ne peut pas être supérieur au salaire brut`,
        champ: 'salaireNet'
      });
    }

    // Vérifier que les cotisations sont présentes
    if (!fichePaie.cotisations || fichePaie.cotisations.length === 0) {
      messages.push({
        type: TypeMessageValidation.AVERTISSEMENT,
        code: 'PAY003',
        message: `Aucune cotisation n'est définie pour ${employe.prenom} ${employe.nom}`,
        champ: 'cotisations'
      });
    }

    return messages;
  }

  /**
   * Formatte les messages de validation en JSON
   */
  static formaterMessagesJSON(messages: MessageValidation[]): string {
    return JSON.stringify(messages, null, 2);
  }

  /**
   * Formatte les messages de validation en texte lisible
   * Échappe les caractères dangereux pour éviter les injections
   */
  static formaterMessagesTexte(messages: MessageValidation[]): string {
    if (messages.length === 0) {
      return 'Aucun problème détecté.';
    }

    const lignes: string[] = [];
    for (const message of messages) {
      const symbole = message.type === TypeMessageValidation.ERREUR ? '❌' :
                      message.type === TypeMessageValidation.AVERTISSEMENT ? '⚠️' : 'ℹ️';
      // Échapper les caractères pour éviter les injections
      const messageSecurise = this.echapperTexte(message.message);
      lignes.push(`${symbole} [${message.code}] ${messageSecurise}`);
    }

    return lignes.join('\n');
  }

  /**
   * Échappe les caractères dangereux dans le texte
   * @param texte Texte à échapper
   * @returns Texte sécurisé
   */
  private static echapperTexte(texte: string): string {
    if (!texte) return '';
    return texte
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

/**
 * Fonction utilitaire pour créer une instance du validateur DSN
 */
export function creerValidateurDSN(): DSNValidator {
  return new DSNValidator();
}
