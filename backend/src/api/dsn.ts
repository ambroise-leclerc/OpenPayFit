/**
 * Routes API pour la gestion des DSN (Déclarations Sociales Nominatives)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import { DSNGenerator, DonneesDSN, FichePaieDSN, CotisationDSN } from '../services/dsn/dsnGenerator';
import { DSNValidator } from '../services/dsn/dsnValidator';

/**
 * Interface pour un employé (modèle Prisma de base)
 */
interface Employe {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  salaireBrut: number;
  compagnieId: string;
  numeroSecuriteSociale?: string | null;
  dateNaissance?: Date | null;
  lieuNaissance?: string | null;
  nationalite?: string | null;
  typeContrat?: string | null;
  dateEmbauche?: Date | null;
  dateFinContrat?: Date | null;
  numeroMatricule?: string | null;
  poste?: string | null;
  qualification?: string | null;
  dateCreation: Date;
  dateModification: Date;
}

/**
 * Interface pour une ligne de cotisation
 */
interface LigneCotisation {
  id: string;
  fichePaieId: string;
  code: string;
  nom: string;
  categorie: string;
  organisme: string;
  typeCotisation: string;
  assiette: number;
  taux: number;
  montantSalarial: number;
  montantPatronal: number;
  montantTotal: number;
}

/**
 * Type pour une fiche de paie avec ses relations (employé et cotisations)
 */
interface FichePaieAvecRelations {
  id: string;
  employeId: string;
  periodeVersement: string;
  salaireBrut: number;
  salaireNet: number;
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  coutTotal: number;
  dateCreation: Date;
  dateModification: Date;
  employe: Employe;
  lignesCotisations: LigneCotisation[];
}

const router = Router();

/**
 * Valide le format et la validité d'une période (YYYY-MM)
 * @param periode La période à valider
 * @returns true si valide, false sinon avec message d'erreur
 */
function validerPeriode(periode: string): { valide: boolean; erreur?: string } {
  // Vérifier le format
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    return {
      valide: false,
      erreur: 'La période doit être au format YYYY-MM (ex: 2025-03)'
    };
  }

  const [anneeStr, moisStr] = periode.split('-');
  const annee = parseInt(anneeStr, 10);
  const mois = parseInt(moisStr, 10);

  // Vérifier que le mois est valide (01-12)
  if (mois < 1 || mois > 12) {
    return {
      valide: false,
      erreur: 'Le mois doit être compris entre 01 et 12'
    };
  }

  // Vérifier que l'année est raisonnable (pas avant 2000, pas plus de 2 ans dans le futur)
  const anneeActuelle = new Date().getFullYear();
  if (annee < 2000 || annee > anneeActuelle + 2) {
    return {
      valide: false,
      erreur: `L'année doit être comprise entre 2000 et ${anneeActuelle + 2}`
    };
  }

  return { valide: true };
}

/**
 * GET /api/companies/:companyId/dsn
 * Liste toutes les déclarations DSN d'une entreprise
 */
router.get('/:companyId/dsn', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer toutes les DSN de l'entreprise
    const declarations = await prisma.dSNDeclaration.findMany({
      where: { compagnieId: companyId },
      orderBy: { dateCreation: 'desc' }
    });

    res.json(declarations);
  } catch (error) {
    console.error('Erreur lors de la récupération des DSN:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des DSN' });
  }
});

/**
 * POST /api/companies/:companyId/dsn/generate
 * Génère une nouvelle déclaration DSN pour une période donnée
 *
 * Body: {
 *   periode: "2025-03" // Format YYYY-MM
 * }
 */
router.post('/:companyId/dsn/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { periode } = req.body;
    const userId = req.userId;

    // Validation des paramètres
    if (!periode) {
      return res.status(400).json({
        error: 'La période est obligatoire'
      });
    }

    const validationPeriode = validerPeriode(periode);
    if (!validationPeriode.valide) {
      return res.status(400).json({
        error: validationPeriode.erreur
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId },
      include: {
        employes: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Vérifier les informations obligatoires de l'entreprise
    if (!company.siret) {
      return res.status(400).json({
        error: 'Le SIRET de l\'entreprise est obligatoire pour générer une DSN. Veuillez compléter les informations de l\'entreprise.'
      });
    }

    // Récupérer les fiches de paie de la période
    const fichesPaie = await prisma.fichePaie.findMany({
      where: {
        employeId: {
          in: company.employes.map((e: Employe) => e.id)
        },
        periodeVersement: periode
      },
      include: {
        employe: true,
        lignesCotisations: true
      }
    });

    if (fichesPaie.length === 0) {
      return res.status(400).json({
        error: `Aucune fiche de paie trouvée pour la période ${periode}. Veuillez générer les fiches de paie avant de créer la DSN.`
      });
    }

    // Préparer les données pour le générateur DSN
    const donneesDSN: DonneesDSN = {
      entreprise: {
        id: company.id,
        nom: company.nom,
        siret: company.siret,
        codeNaf: company.codeNaf || undefined,
        adresse: company.adresse || undefined,
        codePostal: company.codePostal || undefined,
        ville: company.ville || undefined,
        numeroUrssaf: company.numeroUrssaf || undefined
      },
      periode: periode,
      fichesPaie: fichesPaie.map((fp: FichePaieAvecRelations) => {
        const cotisations: CotisationDSN[] = fp.lignesCotisations.map((lc: LigneCotisation) => ({
          code: lc.code,
          nom: lc.nom,
          organisme: lc.organisme,
          typeCotisation: lc.typeCotisation,
          assiette: lc.assiette,
          taux: lc.taux,
          montantSalarial: lc.montantSalarial,
          montantPatronal: lc.montantPatronal
        }));

        const fichePaieDSN: FichePaieDSN = {
          employe: {
            id: fp.employe.id,
            prenom: fp.employe.prenom,
            nom: fp.employe.nom,
            numeroSecuriteSociale: fp.employe.numeroSecuriteSociale || undefined,
            dateNaissance: fp.employe.dateNaissance || undefined,
            lieuNaissance: fp.employe.lieuNaissance || undefined,
            nationalite: fp.employe.nationalite || undefined,
            typeContrat: fp.employe.typeContrat || undefined,
            dateEmbauche: fp.employe.dateEmbauche || undefined,
            dateFinContrat: fp.employe.dateFinContrat || undefined,
            numeroMatricule: fp.employe.numeroMatricule || undefined
          },
          salaireBrut: fp.salaireBrut,
          salaireNet: fp.salaireNet,
          cotisations: cotisations
        };

        return fichePaieDSN;
      })
    };

    // Valider les données
    const validator = new DSNValidator();
    const resultatValidation = validator.valider(donneesDSN);

    // Si la validation échoue, retourner les erreurs
    const erreurs = resultatValidation.messages.filter(m => m.type === 'ERREUR');
    if (erreurs.length > 0) {
      return res.status(400).json({
        error: 'La DSN ne peut pas être générée car certaines données sont manquantes ou incorrectes',
        validation: resultatValidation
      });
    }

    // Générer le XML de la DSN
    const generator = new DSNGenerator();
    const contenuXml = generator.genererDSN(donneesDSN);

    // Créer ou mettre à jour la déclaration DSN
    const dsnExistante = await prisma.dSNDeclaration.findFirst({
      where: {
        compagnieId: companyId,
        periodeDeclaration: periode,
        typeDeclaration: 'MENSUELLE'
      }
    });

    let declaration;
    if (dsnExistante) {
      // Mettre à jour la DSN existante
      declaration = await prisma.dSNDeclaration.update({
        where: { id: dsnExistante.id },
        data: {
          contenuXml: contenuXml,
          messagesValidation: DSNValidator.formaterMessagesJSON(resultatValidation.messages),
          statut: resultatValidation.valide ? 'VALIDEE' : 'ERREUR',
          dateGeneration: new Date()
        }
      });
    } else {
      // Créer une nouvelle DSN
      const numeroDSN = `DSN-${periode}-${Date.now()}`;
      declaration = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: companyId,
          periodeDeclaration: periode,
          typeDeclaration: 'MENSUELLE',
          statut: resultatValidation.valide ? 'VALIDEE' : 'ERREUR',
          contenuXml: contenuXml,
          messagesValidation: DSNValidator.formaterMessagesJSON(resultatValidation.messages),
          numeroDeclaration: numeroDSN,
          dateGeneration: new Date()
        }
      });
    }

    res.status(201).json({
      declaration: declaration,
      validation: resultatValidation
    });
  } catch (error) {
    console.error('Erreur lors de la génération de la DSN:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la DSN' });
  }
});

/**
 * GET /api/companies/:companyId/dsn/:dsnId
 * Récupère les détails d'une déclaration DSN
 */
router.get('/:companyId/dsn/:dsnId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer la DSN
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: dsnId }
    });

    if (!declaration) {
      return res.status(404).json({ error: 'Déclaration DSN non trouvée' });
    }

    if (declaration.compagnieId !== companyId) {
      return res.status(403).json({ error: 'Cette DSN n\'appartient pas à cette entreprise' });
    }

    res.json(declaration);
  } catch (error) {
    console.error('Erreur lors de la récupération de la DSN:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la DSN' });
  }
});

/**
 * GET /api/companies/:companyId/dsn/:dsnId/download
 * Télécharge le fichier XML d'une déclaration DSN
 */
router.get('/:companyId/dsn/:dsnId/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer la DSN
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: dsnId }
    });

    if (!declaration) {
      return res.status(404).json({ error: 'Déclaration DSN non trouvée' });
    }

    if (declaration.compagnieId !== companyId) {
      return res.status(403).json({ error: 'Cette DSN n\'appartient pas à cette entreprise' });
    }

    if (!declaration.contenuXml) {
      return res.status(400).json({ error: 'Le contenu XML de cette DSN n\'est pas disponible' });
    }

    // Sécuriser le nom de fichier (éviter l'injection)
    const siretSecurise = company.siret?.replace(/[^0-9]/g, '') || 'XXXXXXXXXXXXXXX';
    const periodeSecurisee = declaration.periodeDeclaration.replace(/[^0-9-]/g, '');
    const nomFichier = `DSN_${siretSecurise}_${periodeSecurisee}.xml`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.send(declaration.contenuXml);
  } catch (error) {
    console.error('Erreur lors du téléchargement de la DSN:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement de la DSN' });
  }
});

/**
 * POST /api/companies/:companyId/dsn/:dsnId/validate
 * Valide à nouveau une déclaration DSN
 */
router.post('/:companyId/dsn/:dsnId/validate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer la DSN
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: dsnId }
    });

    if (!declaration) {
      return res.status(404).json({ error: 'Déclaration DSN non trouvée' });
    }

    if (declaration.compagnieId !== companyId) {
      return res.status(403).json({ error: 'Cette DSN n\'appartient pas à cette entreprise' });
    }

    // Retourner les messages de validation stockés (avec parsing sécurisé)
    let messages = [];
    if (declaration.messagesValidation) {
      try {
        messages = JSON.parse(declaration.messagesValidation);
      } catch (error) {
        console.error('Erreur parsing messagesValidation:', error);
        messages = [];
      }
    }

    res.json({
      valide: declaration.statut === 'VALIDEE',
      messages: messages,
      statut: declaration.statut
    });
  } catch (error) {
    console.error('Erreur lors de la validation de la DSN:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de la DSN' });
  }
});

/**
 * DELETE /api/companies/:companyId/dsn/:dsnId
 * Supprime une déclaration DSN (uniquement si elle est en brouillon)
 */
router.delete('/:companyId/dsn/:dsnId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer la DSN
    const declaration = await prisma.dSNDeclaration.findUnique({
      where: { id: dsnId }
    });

    if (!declaration) {
      return res.status(404).json({ error: 'Déclaration DSN non trouvée' });
    }

    if (declaration.compagnieId !== companyId) {
      return res.status(403).json({ error: 'Cette DSN n\'appartient pas à cette entreprise' });
    }

    // Ne permettre la suppression que des DSN en brouillon
    if (declaration.statut === 'TRANSMISE') {
      return res.status(400).json({
        error: 'Impossible de supprimer une DSN déjà transmise'
      });
    }

    // Supprimer la DSN
    await prisma.dSNDeclaration.delete({
      where: { id: dsnId }
    });

    res.json({ message: 'DSN supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la DSN:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la DSN' });
  }
});

// ========== Routes pour la transmission automatique DSN ==========

/**
 * POST /api/companies/:companyId/dsn/:dsnId/transmit
 * Transmet automatiquement une DSN vers net-entreprises.fr
 */
router.post('/:companyId/dsn/:dsnId/transmit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Vérifier que la DSN existe et appartient à cette entreprise
    const dsn = await prisma.dSNDeclaration.findUnique({
      where: { id: dsnId }
    });

    if (!dsn) {
      return res.status(404).json({ error: 'DSN non trouvée' });
    }

    if (dsn.compagnieId !== companyId) {
      return res.status(403).json({ error: 'Cette DSN n\'appartient pas à cette entreprise' });
    }

    // Importer dynamiquement le service
    const { NetEntreprisesService } = await import('../services/dsn/netEntreprisesService');
    const service = new NetEntreprisesService(companyId);

    // Transmettre la DSN
    const resultat = await service.transmettreDS N(dsnId);

    if (resultat.succes) {
      res.status(200).json({
        message: 'DSN transmise avec succès',
        transmission: resultat
      });
    } else {
      res.status(400).json({
        error: resultat.erreur || 'Erreur lors de la transmission',
        details: resultat
      });
    }

  } catch (error) {
    console.error('Erreur lors de la transmission de la DSN:', error);
    res.status(500).json({
      error: 'Erreur lors de la transmission de la DSN',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * GET /api/companies/:companyId/dsn/:dsnId/transmission-status
 * Récupère le statut de transmission d'une DSN
 */
router.get('/:companyId/dsn/:dsnId/transmission-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, dsnId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer toutes les transmissions de cette DSN
    const transmissions = await prisma.transmissionDSN.findMany({
      where: {
        declaration: {
          id: dsnId,
          compagnieId: companyId
        }
      },
      orderBy: { dateCreation: 'desc' }
    });

    if (transmissions.length === 0) {
      return res.status(404).json({ error: 'Aucune transmission trouvée pour cette DSN' });
    }

    res.json({
      transmissions: transmissions,
      derniere: transmissions[0]
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut de transmission' });
  }
});

/**
 * POST /api/companies/:companyId/dsn/:dsnId/transmission/:transmissionId/retry
 * Retente une transmission échouée
 */
router.post('/:companyId/dsn/:dsnId/transmission/:transmissionId/retry', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId, transmissionId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Importer et utiliser le service
    const { NetEntreprisesService } = await import('../services/dsn/netEntreprisesService');
    const service = new NetEntreprisesService(companyId);

    const resultat = await service.retenterTransmission(transmissionId);

    if (resultat.succes) {
      res.status(200).json({
        message: 'Transmission retentée avec succès',
        transmission: resultat
      });
    } else {
      res.status(400).json({
        error: resultat.erreur || 'Erreur lors de la nouvelle tentative',
        details: resultat
      });
    }

  } catch (error) {
    console.error('Erreur lors de la nouvelle tentative:', error);
    res.status(500).json({ error: 'Erreur lors de la nouvelle tentative de transmission' });
  }
});

// ========== Routes pour la configuration Net-Entreprises ==========

/**
 * GET /api/companies/:companyId/net-entreprises/config
 * Récupère la configuration Net-Entreprises de l'entreprise
 */
router.get('/:companyId/net-entreprises/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Récupérer la configuration (sans exposer les secrets)
    const config = await prisma.configurationNetEntreprises.findUnique({
      where: { compagnieId: companyId },
      select: {
        id: true,
        siretDeclarant: true,
        numeroAdhesion: true,
        urlApi: true,
        modeTest: true,
        estActif: true,
        derniereVerification: true,
        derniereErreur: true,
        dateCreation: true,
        dateModification: true
        // Ne pas exposer certificat, clePrivee, motDePasseCertificat
      }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    res.json(config);

  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
  }
});

/**
 * POST /api/companies/:companyId/net-entreprises/config
 * Crée ou met à jour la configuration Net-Entreprises
 *
 * Body: {
 *   siretDeclarant: string,
 *   numeroAdhesion?: string,
 *   certificat?: string (base64),
 *   clePrivee?: string (base64),
 *   motDePasseCertificat?: string,
 *   modeTest?: boolean
 * }
 */
router.post('/:companyId/net-entreprises/config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.userId;
    const {
      siretDeclarant,
      numeroAdhesion,
      certificat,
      clePrivee,
      motDePasseCertificat,
      modeTest
    } = req.body;

    // Validation
    if (!siretDeclarant || siretDeclarant.length !== 14) {
      return res.status(400).json({
        error: 'Le SIRET du déclarant est obligatoire et doit contenir 14 chiffres'
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Vérifier si une configuration existe déjà
    const configExistante = await prisma.configurationNetEntreprises.findUnique({
      where: { compagnieId: companyId }
    });

    const donnees: any = {
      siretDeclarant,
      numeroAdhesion,
      modeTest: modeTest !== undefined ? modeTest : true
    };

    // Ajouter les certificats seulement s'ils sont fournis
    if (certificat) donnees.certificat = certificat;
    if (clePrivee) donnees.clePrivee = clePrivee;
    if (motDePasseCertificat) donnees.motDePasseCertificat = motDePasseCertificat;

    let config;
    if (configExistante) {
      // Mettre à jour
      config = await prisma.configurationNetEntreprises.update({
        where: { id: configExistante.id },
        data: donnees,
        select: {
          id: true,
          siretDeclarant: true,
          numeroAdhesion: true,
          urlApi: true,
          modeTest: true,
          estActif: true,
          derniereVerification: true,
          derniereErreur: true,
          dateCreation: true,
          dateModification: true
        }
      });
    } else {
      // Créer
      config = await prisma.configurationNetEntreprises.create({
        data: {
          ...donnees,
          compagnieId: companyId
        },
        select: {
          id: true,
          siretDeclarant: true,
          numeroAdhesion: true,
          urlApi: true,
          modeTest: true,
          estActif: true,
          derniereVerification: true,
          derniereErreur: true,
          dateCreation: true,
          dateModification: true
        }
      });
    }

    res.status(configExistante ? 200 : 201).json({
      message: configExistante ? 'Configuration mise à jour' : 'Configuration créée',
      config: config
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
  }
});

/**
 * POST /api/companies/:companyId/net-entreprises/config/test
 * Teste la configuration Net-Entreprises
 */
router.post('/:companyId/net-entreprises/config/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const userId = req.userId;

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Tester la configuration
    const { NetEntreprisesService } = await import('../services/dsn/netEntreprisesService');
    const service = new NetEntreprisesService(companyId);
    const resultat = await service.testerConfiguration();

    if (resultat.valide) {
      res.json({
        message: 'Configuration valide et fonctionnelle',
        valide: true
      });
    } else {
      res.status(400).json({
        message: 'Configuration invalide',
        valide: false,
        erreur: resultat.erreur
      });
    }

  } catch (error) {
    console.error('Erreur lors du test de la configuration:', error);
    res.status(500).json({
      error: 'Erreur lors du test de la configuration',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * PATCH /api/companies/:companyId/net-entreprises/config/toggle
 * Active ou désactive la configuration Net-Entreprises
 */
router.patch('/:companyId/net-entreprises/config/toggle', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { estActif } = req.body;
    const userId = req.userId;

    if (typeof estActif !== 'boolean') {
      return res.status(400).json({ error: 'Le paramètre estActif doit être un booléen' });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // Mettre à jour le statut
    const config = await prisma.configurationNetEntreprises.update({
      where: { compagnieId: companyId },
      data: { estActif },
      select: {
        id: true,
        siretDeclarant: true,
        numeroAdhesion: true,
        urlApi: true,
        modeTest: true,
        estActif: true,
        derniereVerification: true,
        derniereErreur: true,
        dateCreation: true,
        dateModification: true
      }
    });

    res.json({
      message: `Configuration ${estActif ? 'activée' : 'désactivée'}`,
      config: config
    });

  } catch (error) {
    console.error('Erreur lors de la modification du statut:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du statut de la configuration' });
  }
});

export default router;
