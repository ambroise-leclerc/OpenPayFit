/**
 * Service de transmission automatique des DSN vers net-entreprises.fr
 * Implémente le protocole EDI Machine-to-Machine pour l'envoi automatique des déclarations
 */

import https from 'https';
import axios, { AxiosInstance, AxiosError } from 'axios';
import prisma from '../../lib/db';

/**
 * Interface pour les résultats de transmission
 */
export interface ResultatTransmission {
  succes: boolean;
  idTransmission?: string;
  numeroProtocole?: string;
  codeRetour?: string;
  messages?: string[];
  erreur?: string;
}

/**
 * Interface pour les accusés de réception
 */
export interface AccuseReception {
  idTransmission: string;
  statut: 'ACCEPTE' | 'REJETE' | 'EN_TRAITEMENT';
  codeRetour: string;
  messages: Array<{
    type: 'INFO' | 'AVERTISSEMENT' | 'ERREUR';
    code: string;
    message: string;
  }>;
  contenuXml?: string;
}

/**
 * Service de transmission Net-Entreprises
 * Gère la communication avec l'API EDI Machine-to-Machine
 */
export class NetEntreprisesService {
  private client: AxiosInstance;
  private compagnieId: string;
  private configuration: any;

  /**
   * Crée une instance du service pour une entreprise donnée
   * @param compagnieId ID de l'entreprise
   */
  constructor(compagnieId: string) {
    this.compagnieId = compagnieId;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
        'User-Agent': 'OpenPayFit/1.0'
      }
    });
  }

  /**
   * Charge la configuration Net-Entreprises de l'entreprise
   * @throws Error si la configuration n'existe pas ou est invalide
   */
  private async chargerConfiguration(): Promise<void> {
    const config = await prisma.configurationNetEntreprises.findUnique({
      where: { compagnieId: this.compagnieId }
    });

    if (!config) {
      throw new Error('Configuration Net-Entreprises non trouvée pour cette entreprise');
    }

    if (!config.estActif) {
      throw new Error('Configuration Net-Entreprises inactive. Veuillez activer la configuration.');
    }

    this.configuration = config;

    // Configurer le client HTTPS avec certificat si disponible
    if (config.certificat && config.clePrivee) {
      try {
        // Décoder les certificats depuis base64
        const cert = Buffer.from(config.certificat, 'base64').toString('utf-8');
        const key = Buffer.from(config.clePrivee, 'base64').toString('utf-8');

        this.client = axios.create({
          timeout: 30000,
          baseURL: config.urlApi,
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml',
            'User-Agent': 'OpenPayFit/1.0',
            'X-SIRET-Declarant': config.siretDeclarant
          },
          httpsAgent: new https.Agent({
            cert: cert,
            key: key,
            passphrase: config.motDePasseCertificat || undefined,
            rejectUnauthorized: !config.modeTest // En mode test, accepter les certificats auto-signés
          })
        });
      } catch (error) {
        throw new Error(`Erreur lors du chargement des certificats: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Transmet une DSN vers net-entreprises.fr
   * @param dsnId ID de la déclaration DSN à transmettre
   * @returns Résultat de la transmission
   */
  async transmettreDS N(dsnId: string): Promise<ResultatTransmission> {
    try {
      // Charger la configuration
      await this.chargerConfiguration();

      // Récupérer la DSN à transmettre
      const dsn = await prisma.dSNDeclaration.findUnique({
        where: { id: dsnId },
        include: {
          compagnie: true
        }
      });

      if (!dsn) {
        return {
          succes: false,
          erreur: 'DSN non trouvée'
        };
      }

      if (dsn.compagnieId !== this.compagnieId) {
        return {
          succes: false,
          erreur: 'Cette DSN n\'appartient pas à cette entreprise'
        };
      }

      if (dsn.statut !== 'VALIDEE') {
        return {
          succes: false,
          erreur: 'Seules les DSN validées peuvent être transmises'
        };
      }

      if (!dsn.contenuXml) {
        return {
          succes: false,
          erreur: 'Le contenu XML de la DSN est manquant'
        };
      }

      // Créer l'enregistrement de transmission
      const transmission = await prisma.transmissionDSN.create({
        data: {
          declarationId: dsnId,
          statut: 'EN_COURS',
          nombreTentatives: 1
        }
      });

      try {
        // Envoyer la DSN via l'API
        // Note: Cette partie est une simulation car nous n'avons pas accès à l'API réelle
        // Dans un environnement réel, l'endpoint serait quelque chose comme:
        // POST /api/dsn/v1/deposer
        const response = await this.envoyerDSN(dsn.contenuXml);

        // Mettre à jour la transmission avec le résultat
        await prisma.transmissionDSN.update({
          where: { id: transmission.id },
          data: {
            statut: 'TRANSMISE',
            dateTransmission: new Date(),
            idTransmission: response.idTransmission,
            numeroProtocole: response.numeroProtocole,
            codeRetour: response.codeRetour
          }
        });

        // Mettre à jour le statut de la DSN
        await prisma.dSNDeclaration.update({
          where: { id: dsnId },
          data: {
            statut: 'TRANSMISE',
            dateTransmission: new Date()
          }
        });

        return {
          succes: true,
          idTransmission: response.idTransmission,
          numeroProtocole: response.numeroProtocole,
          codeRetour: response.codeRetour,
          messages: response.messages
        };

      } catch (error) {
        // Gérer les erreurs de transmission
        const messageErreur = this.extraireMessageErreur(error);

        await prisma.transmissionDSN.update({
          where: { id: transmission.id },
          data: {
            statut: 'ERREUR',
            derniereErreur: messageErreur,
            prochaineTentative: this.calculerProchaineTentative(1)
          }
        });

        return {
          succes: false,
          erreur: messageErreur
        };
      }

    } catch (error) {
      return {
        succes: false,
        erreur: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Envoie le contenu XML de la DSN vers l'API
   * @param contenuXml Contenu XML de la DSN
   * @returns Réponse de l'API
   */
  private async envoyerDSN(contenuXml: string): Promise<any> {
    // NOTE: Cette implémentation est une simulation
    // Dans un environnement réel avec accès à l'API Net-Entreprises, vous devriez:
    // 1. Utiliser l'endpoint réel fourni par Net-Entreprises
    // 2. Envoyer le XML avec les bons headers
    // 3. Parser la réponse XML

    if (this.configuration.modeTest) {
      // En mode test, simuler une réponse réussie
      return {
        idTransmission: `TEST-${Date.now()}`,
        numeroProtocole: `PROTO-${Date.now()}`,
        codeRetour: '00',
        messages: ['Transmission simulée en mode test']
      };
    }

    // En mode production, tenter l'appel réel
    try {
      const response = await this.client.post('/deposer', contenuXml);

      // Parser la réponse XML (à adapter selon le format réel de l'API)
      return this.parserReponseTransmission(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new Error(`Erreur HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`);
        } else if (axiosError.request) {
          throw new Error('Aucune réponse du serveur Net-Entreprises');
        }
      }
      throw error;
    }
  }

  /**
   * Parse la réponse XML de transmission
   * @param xmlResponse Réponse XML brute
   * @returns Objet structuré
   */
  private parserReponseTransmission(xmlResponse: string): any {
    // NOTE: Cette fonction devrait parser le XML de réponse
    // Pour l'instant, retourne un objet de test
    // Dans un environnement réel, utilisez une bibliothèque comme xml2js
    return {
      idTransmission: 'PARSE-TODO',
      numeroProtocole: 'PARSE-TODO',
      codeRetour: '00',
      messages: ['Parser XML à implémenter']
    };
  }

  /**
   * Récupère l'accusé de réception d'une transmission
   * @param transmissionId ID de la transmission
   * @returns Accusé de réception ou null si non disponible
   */
  async recupererAccuseReception(transmissionId: string): Promise<AccuseReception | null> {
    try {
      await this.chargerConfiguration();

      const transmission = await prisma.transmissionDSN.findUnique({
        where: { id: transmissionId }
      });

      if (!transmission || !transmission.idTransmission) {
        return null;
      }

      if (this.configuration.modeTest) {
        // En mode test, simuler un accusé de réception
        return {
          idTransmission: transmission.idTransmission,
          statut: 'ACCEPTE',
          codeRetour: '00',
          messages: [{
            type: 'INFO',
            code: '000',
            message: 'DSN acceptée (simulation mode test)'
          }]
        };
      }

      // En mode production, appeler l'API réelle
      // Endpoint type: GET /api/dsn/v1/accuse/{idTransmission}
      const response = await this.client.get(`/accuse/${transmission.idTransmission}`);

      const accuse = this.parserAccuseReception(response.data);

      // Mettre à jour la transmission avec l'AR
      await prisma.transmissionDSN.update({
        where: { id: transmissionId },
        data: {
          statut: accuse.statut === 'ACCEPTE' ? 'ACCUSE_RECEPTION' : 'REJETEE',
          dateAccuseReception: new Date(),
          dateDerniereVerification: new Date(),
          accuse: accuse.contenuXml,
          messagesRetour: JSON.stringify(accuse.messages)
        }
      });

      return accuse;

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'AR:', error);
      return null;
    }
  }

  /**
   * Parse l'accusé de réception XML
   * @param xmlResponse Réponse XML brute
   * @returns Accusé de réception structuré
   */
  private parserAccuseReception(xmlResponse: string): AccuseReception {
    // NOTE: Parser le XML réel de l'accusé de réception
    // Pour l'instant, retourne un objet de test
    return {
      idTransmission: 'PARSE-TODO',
      statut: 'ACCEPTE',
      codeRetour: '00',
      messages: [],
      contenuXml: xmlResponse
    };
  }

  /**
   * Vérifie le statut d'une transmission
   * @param transmissionId ID de la transmission
   * @returns Statut actuel
   */
  async verifierStatut(transmissionId: string): Promise<string> {
    const transmission = await prisma.transmissionDSN.findUnique({
      where: { id: transmissionId }
    });

    if (!transmission) {
      throw new Error('Transmission non trouvée');
    }

    // Si la transmission est terminée, pas besoin de vérifier
    if (['ACCUSE_RECEPTION', 'REJETEE'].includes(transmission.statut)) {
      return transmission.statut;
    }

    // Si transmise, essayer de récupérer l'AR
    if (transmission.statut === 'TRANSMISE') {
      const accuse = await this.recupererAccuseReception(transmissionId);
      if (accuse) {
        return accuse.statut === 'ACCEPTE' ? 'ACCUSE_RECEPTION' : 'REJETEE';
      }
    }

    return transmission.statut;
  }

  /**
   * Extrait un message d'erreur lisible depuis une exception
   * @param error Erreur capturée
   * @returns Message d'erreur formaté
   */
  private extraireMessageErreur(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return `Erreur HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        return 'Aucune réponse du serveur Net-Entreprises. Vérifiez votre connexion.';
      }
      return axiosError.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Erreur inconnue lors de la transmission';
  }

  /**
   * Calcule la date de la prochaine tentative avec backoff exponentiel
   * @param nombreTentatives Nombre de tentatives déjà effectuées
   * @returns Date de la prochaine tentative
   */
  private calculerProchaineTentative(nombreTentatives: number): Date {
    // Backoff exponentiel: 5 min, 15 min, 1h, 4h, 24h
    const delaisMinutes = [5, 15, 60, 240, 1440];
    const delai = delaisMinutes[Math.min(nombreTentatives - 1, delaisMinutes.length - 1)];

    const prochaine = new Date();
    prochaine.setMinutes(prochaine.getMinutes() + delai);
    return prochaine;
  }

  /**
   * Retente une transmission échouée
   * @param transmissionId ID de la transmission à retenter
   * @returns Résultat de la nouvelle tentative
   */
  async retenterTransmission(transmissionId: string): Promise<ResultatTransmission> {
    const transmission = await prisma.transmissionDSN.findUnique({
      where: { id: transmissionId },
      include: {
        declaration: true
      }
    });

    if (!transmission) {
      return {
        succes: false,
        erreur: 'Transmission non trouvée'
      };
    }

    if (transmission.nombreTentatives >= 5) {
      return {
        succes: false,
        erreur: 'Nombre maximum de tentatives atteint (5)'
      };
    }

    // Mettre à jour le compteur de tentatives
    await prisma.transmissionDSN.update({
      where: { id: transmissionId },
      data: {
        nombreTentatives: transmission.nombreTentatives + 1,
        statut: 'EN_COURS'
      }
    });

    // Retenter la transmission
    return await this.transmettreDS N(transmission.declarationId);
  }

  /**
   * Teste la configuration Net-Entreprises
   * @returns true si la configuration est valide et fonctionnelle
   */
  async testerConfiguration(): Promise<{ valide: boolean; erreur?: string }> {
    try {
      await this.chargerConfiguration();

      if (this.configuration.modeTest) {
        // En mode test, considérer comme valide
        return { valide: true };
      }

      // En mode production, tenter un ping de l'API
      try {
        await this.client.get('/ping');

        await prisma.configurationNetEntreprises.update({
          where: { id: this.configuration.id },
          data: {
            derniereVerification: new Date(),
            derniereErreur: null
          }
        });

        return { valide: true };

      } catch (error) {
        const messageErreur = this.extraireMessageErreur(error);

        await prisma.configurationNetEntreprises.update({
          where: { id: this.configuration.id },
          data: {
            derniereVerification: new Date(),
            derniereErreur: messageErreur
          }
        });

        return { valide: false, erreur: messageErreur };
      }

    } catch (error) {
      return {
        valide: false,
        erreur: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

/**
 * Crée une instance du service pour une entreprise donnée
 * @param compagnieId ID de l'entreprise
 * @returns Instance du service
 */
export function creerServiceNetEntreprises(compagnieId: string): NetEntreprisesService {
  return new NetEntreprisesService(compagnieId);
}
