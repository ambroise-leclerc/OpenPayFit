/**
 * Routes API pour la gestion des DSN (Déclarations Sociales Nominatives)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import { DSNGenerator, DonneesDSN, FichePaieDSN, CotisationDSN } from '../services/dsn/dsnGenerator';
import { DSNValidator } from '../services/dsn/dsnValidator';

const router = Router();

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
    if (!periode || !/^\d{4}-\d{2}$/.test(periode)) {
      return res.status(400).json({
        error: 'La période est obligatoire et doit être au format YYYY-MM (ex: 2025-03)'
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
          in: company.employes.map((e: any) => e.id)
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
      fichesPaie: fichesPaie.map((fp: any) => {
        const cotisations: CotisationDSN[] = fp.lignesCotisations.map((lc: any) => ({
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

    // Définir les en-têtes pour le téléchargement
    const nomFichier = `DSN_${company.siret}_${declaration.periodeDeclaration}.xml`;
    res.setHeader('Content-Type', 'application/xml');
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

    // Retourner les messages de validation stockés
    const messages = declaration.messagesValidation ?
      JSON.parse(declaration.messagesValidation) : [];

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

export default router;
