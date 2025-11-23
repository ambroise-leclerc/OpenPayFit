/**
 * Service de gestion des versions DSN
 * Gère l'historique complet des modifications des déclarations DSN
 */

import prisma from '../../lib/db';

/**
 * Interface pour une version DSN
 */
export interface DSNVersionData {
  declarationId: string;
  contenuXml: string | null;
  messagesValidation: string | null;
  statut: string;
  modifiePar?: string;
  raisonModification?: string;
  commentaire?: string;
  champsModifies?: string[];
}

/**
 * Interface pour une différence entre deux versions
 */
export interface VersionDiff {
  champ: string;
  ancienneValeur: any;
  nouvelleValeur: any;
}

/**
 * Interface pour le résultat de comparaison de versions
 */
export interface ComparisonResult {
  version1: number;
  version2: number;
  differences: VersionDiff[];
  nombreChangements: number;
}

/**
 * Service de versioning DSN
 */
export class DSNVersionService {
  /**
   * Crée une nouvelle version d'une DSN
   * @param data Données de la version
   * @returns La version créée
   */
  async creerVersion(data: DSNVersionData): Promise<any> {
    // Récupérer le dernier numéro de version
    const derniereVersion = await prisma.dSNVersion.findFirst({
      where: { declarationId: data.declarationId },
      orderBy: { numeroVersion: 'desc' },
      select: { numeroVersion: true }
    });

    const nouveauNumeroVersion = (derniereVersion?.numeroVersion || 0) + 1;

    // Créer la nouvelle version
    const version = await prisma.dSNVersion.create({
      data: {
        declarationId: data.declarationId,
        numeroVersion: nouveauNumeroVersion,
        contenuXml: data.contenuXml,
        messagesValidation: data.messagesValidation,
        statut: data.statut,
        modifiePar: data.modifiePar,
        raisonModification: data.raisonModification,
        commentaire: data.commentaire,
        champsModifies: data.champsModifies ? JSON.stringify(data.champsModifies) : null
      }
    });

    return version;
  }

  /**
   * Récupère toutes les versions d'une DSN
   * @param declarationId ID de la déclaration
   * @returns Liste des versions triées par numéro décroissant
   */
  async obtenirHistorique(declarationId: string): Promise<any[]> {
    const versions = await prisma.dSNVersion.findMany({
      where: { declarationId },
      orderBy: { numeroVersion: 'desc' }
    });

    return versions;
  }

  /**
   * Récupère une version spécifique
   * @param declarationId ID de la déclaration
   * @param numeroVersion Numéro de la version
   * @returns La version ou null si non trouvée
   */
  async obtenirVersion(declarationId: string, numeroVersion: number): Promise<any | null> {
    const version = await prisma.dSNVersion.findUnique({
      where: {
        declarationId_numeroVersion: {
          declarationId,
          numeroVersion
        }
      }
    });

    return version;
  }

  /**
   * Compare deux versions d'une DSN
   * @param declarationId ID de la déclaration
   * @param numeroVersion1 Numéro de la première version
   * @param numeroVersion2 Numéro de la deuxième version
   * @returns Résultat de la comparaison
   */
  async comparerVersions(
    declarationId: string,
    numeroVersion1: number,
    numeroVersion2: number
  ): Promise<ComparisonResult> {
    // Récupérer les deux versions
    const version1 = await this.obtenirVersion(declarationId, numeroVersion1);
    const version2 = await this.obtenirVersion(declarationId, numeroVersion2);

    if (!version1 || !version2) {
      throw new Error('Une ou plusieurs versions introuvables');
    }

    const differences: VersionDiff[] = [];

    // Comparer le contenu XML
    if (version1.contenuXml !== version2.contenuXml) {
      differences.push({
        champ: 'contenuXml',
        ancienneValeur: this.tronquerXml(version1.contenuXml),
        nouvelleValeur: this.tronquerXml(version2.contenuXml)
      });
    }

    // Comparer le statut
    if (version1.statut !== version2.statut) {
      differences.push({
        champ: 'statut',
        ancienneValeur: version1.statut,
        nouvelleValeur: version2.statut
      });
    }

    // Comparer les messages de validation
    if (version1.messagesValidation !== version2.messagesValidation) {
      differences.push({
        champ: 'messagesValidation',
        ancienneValeur: this.parseJsonSafe(version1.messagesValidation),
        nouvelleValeur: this.parseJsonSafe(version2.messagesValidation)
      });
    }

    return {
      version1: numeroVersion1,
      version2: numeroVersion2,
      differences,
      nombreChangements: differences.length
    };
  }

  /**
   * Restaure une version précédente d'une DSN
   * @param declarationId ID de la déclaration
   * @param numeroVersion Numéro de la version à restaurer
   * @param modifiePar ID de l'utilisateur qui effectue la restauration
   * @returns La nouvelle version créée (restauration)
   */
  async restaurerVersion(
    declarationId: string,
    numeroVersion: number,
    modifiePar: string
  ): Promise<any> {
    // Récupérer la version à restaurer
    const versionARestaurer = await this.obtenirVersion(declarationId, numeroVersion);

    if (!versionARestaurer) {
      throw new Error(`Version ${numeroVersion} introuvable`);
    }

    // Récupérer la déclaration actuelle
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: declarationId }
    });

    if (!declaration) {
      throw new Error('Déclaration DSN introuvable');
    }

    // Créer une nouvelle version avec les données de la version à restaurer
    const nouvelleVersion = await this.creerVersion({
      declarationId,
      contenuXml: versionARestaurer.contenuXml,
      messagesValidation: versionARestaurer.messagesValidation,
      statut: versionARestaurer.statut,
      modifiePar,
      raisonModification: `Restauration de la version ${numeroVersion}`,
      commentaire: `Restauration automatique depuis la version ${numeroVersion}`,
      champsModifies: ['contenuXml', 'messagesValidation', 'statut']
    });

    // Mettre à jour la déclaration avec le contenu restauré
    await prisma.dSNDeclaration.update({
      where: { id: declarationId },
      data: {
        contenuXml: versionARestaurer.contenuXml,
        messagesValidation: versionARestaurer.messagesValidation,
        statut: versionARestaurer.statut
      }
    });

    return nouvelleVersion;
  }

  /**
   * Exporte l'historique des versions au format JSON
   * @param declarationId ID de la déclaration
   * @returns Historique complet au format JSON
   */
  async exporterHistorique(declarationId: string): Promise<string> {
    const versions = await this.obtenirHistorique(declarationId);

    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: declarationId },
      select: {
        periodeDeclaration: true,
        typeDeclaration: true,
        numeroDeclaration: true
      }
    });

    const export_data = {
      declaration: declaration,
      nombreVersions: versions.length,
      versions: versions.map(v => ({
        ...v,
        champsModifies: this.parseJsonSafe(v.champsModifies)
      })),
      dateExport: new Date().toISOString()
    };

    return JSON.stringify(export_data, null, 2);
  }

  /**
   * Exporte l'historique au format CSV
   * @param declarationId ID de la déclaration
   * @returns Historique au format CSV
   */
  async exporterHistoriqueCSV(declarationId: string): Promise<string> {
    const versions = await this.obtenirHistorique(declarationId);

    const headers = [
      'Numero Version',
      'Statut',
      'Modifie Par',
      'Raison Modification',
      'Date Creation',
      'Nombre Champs Modifies'
    ];

    const rows = versions.map(v => {
      const champsModifies = this.parseJsonSafe(v.champsModifies);
      return [
        v.numeroVersion,
        v.statut,
        v.modifiePar || 'Système',
        v.raisonModification || '',
        new Date(v.dateCreation).toLocaleString('fr-FR'),
        Array.isArray(champsModifies) ? champsModifies.length : 0
      ];
    });

    const csv = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    return csv;
  }

  /**
   * Détecte les changements entre la DSN actuelle et les données fournies
   * @param declarationId ID de la déclaration
   * @param nouvellesData Nouvelles données
   * @returns Liste des champs modifiés
   */
  async detecterChangements(
    declarationId: string,
    nouvellesData: { contenuXml?: string; messagesValidation?: string; statut?: string }
  ): Promise<string[]> {
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: declarationId }
    });

    if (!declaration) {
      throw new Error('Déclaration DSN introuvable');
    }

    const champsModifies: string[] = [];

    if (nouvellesData.contenuXml !== undefined &&
        nouvellesData.contenuXml !== declaration.contenuXml) {
      champsModifies.push('contenuXml');
    }

    if (nouvellesData.messagesValidation !== undefined &&
        nouvellesData.messagesValidation !== declaration.messagesValidation) {
      champsModifies.push('messagesValidation');
    }

    if (nouvellesData.statut !== undefined &&
        nouvellesData.statut !== declaration.statut) {
      champsModifies.push('statut');
    }

    return champsModifies;
  }

  /**
   * Utilitaire : Tronque le contenu XML pour l'affichage
   */
  private tronquerXml(xml: string | null, maxLength: number = 200): string {
    if (!xml) return '';
    if (xml.length <= maxLength) return xml;
    return xml.substring(0, maxLength) + '... [tronqué]';
  }

  /**
   * Utilitaire : Parse JSON de manière sécurisée
   */
  private parseJsonSafe(json: string | null): any {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch (e) {
      return json;
    }
  }
}
