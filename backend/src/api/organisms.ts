/**
 * Routes API pour la gestion des organismes collecteurs de cotisations sociales
 *
 * Deux types d'organismes :
 * - Globaux (estGlobal = true) : Obligatoires, non modifiables, visibles par tous (URSSAF, Pôle Emploi, AGIRC-ARRCO)
 * - Spécifiques (estGlobal = false) : Créés et gérés par les entreprises (caisses de branche, mutuelles, etc.)
 *
 * Routes :
 * - GET /api/organisms : Liste tous les organismes (globaux + spécifiques à l'utilisateur)
 * - GET /api/organisms/global : Liste uniquement les organismes globaux (obligatoires)
 * - POST /api/organisms : Créer un organisme spécifique à une entreprise
 * - PUT /api/organisms/:id : Modifier un organisme spécifique (interdit pour les globaux)
 * - DELETE /api/organisms/:id : Supprimer un organisme spécifique (interdit pour les globaux)
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/organisms
 * Liste tous les organismes collecteurs :
 * - Organismes globaux (obligatoires)
 * - Organismes spécifiques aux entreprises de l'utilisateur connecté
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // Récupérer les IDs des entreprises de l'utilisateur
    const companies = await prisma.compagnie.findMany({
      where: { proprietaireId: userId },
      select: { id: true },
    });

    const companyIds = companies.map((c: { id: string }) => c.id);

    // Récupérer les organismes globaux + les organismes spécifiques de l'utilisateur
    const organisms = await prisma.organismeCotisation.findMany({
      where: {
        OR: [
          { estGlobal: true }, // Organismes obligatoires
          { compagnieId: { in: companyIds } }, // Organismes des entreprises de l'utilisateur
        ],
      },
      include: {
        compagnie: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: [{ estGlobal: 'desc' }, { nom: 'asc' }], // Globaux d'abord, puis alphabétique
    });

    res.json(organisms);
  } catch (error) {
    console.error('Erreur lors de la récupération des organismes:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des organismes' });
  }
});

/**
 * GET /api/organisms/global
 * Liste uniquement les organismes globaux (obligatoires)
 * Accessible sans authentification car ce sont des données publiques
 */
router.get('/global', async (_req: Request, res: Response) => {
  try {
    const globalOrganisms = await prisma.organismeCotisation.findMany({
      where: { estGlobal: true },
      orderBy: { nom: 'asc' },
    });

    res.json(globalOrganisms);
  } catch (error) {
    console.error('Erreur lors de la récupération des organismes globaux:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des organismes globaux' });
  }
});

/**
 * GET /api/organisms/:id
 * Récupère les détails d'un organisme spécifique
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const organism = await prisma.organismeCotisation.findUnique({
      where: { id },
      include: {
        compagnie: {
          select: {
            id: true,
            nom: true,
            proprietaireId: true,
          },
        },
      },
    });

    if (!organism) {
      return res.status(404).json({ error: 'Organisme non trouvé' });
    }

    // Vérifier que l'utilisateur a le droit de voir cet organisme
    // (soit il est global, soit il appartient à une entreprise de l'utilisateur)
    if (!organism.estGlobal && organism.compagnie?.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès interdit à cet organisme' });
    }

    res.json(organism);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de l\'organisme' });
  }
});

/**
 * POST /api/organisms
 * Créer un nouvel organisme spécifique à une entreprise
 * Corps de la requête :
 * {
 *   code: string (unique),
 *   nom: string,
 *   typeOrganisme: 'URSSAF' | 'RETRAITE' | 'CHOMAGE' | 'PREVOYANCE' | 'MUTUELLE' | 'FORMATION' | 'AUTRE',
 *   description?: string,
 *   compagnieId: string (ID de l'entreprise),
 *   adresse?: string,
 *   codePostal?: string,
 *   ville?: string,
 *   telephone?: string,
 *   email?: string,
 *   siteWeb?: string,
 *   numeroSiret?: string
 * }
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const {
      code,
      nom,
      typeOrganisme,
      description,
      compagnieId,
      adresse,
      codePostal,
      ville,
      telephone,
      email,
      siteWeb,
      numeroSiret,
    } = req.body;

    // Validation des champs obligatoires
    if (!code || !nom || !typeOrganisme || !compagnieId) {
      return res.status(400).json({
        error: 'Les champs code, nom, typeOrganisme et compagnieId sont obligatoires',
      });
    }

    // Vérifier que l'entreprise existe et appartient à l'utilisateur
    const company = await prisma.compagnie.findUnique({
      where: { id: compagnieId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas propriétaire de cette entreprise' });
    }

    // Vérifier que le code n'existe pas déjà
    const existingOrganism = await prisma.organismeCotisation.findUnique({
      where: { code },
    });

    if (existingOrganism) {
      return res.status(400).json({ error: 'Un organisme avec ce code existe déjà' });
    }

    // Créer l'organisme spécifique (estGlobal = false)
    const organism = await prisma.organismeCotisation.create({
      data: {
        code,
        nom,
        typeOrganisme,
        description,
        estGlobal: false, // Toujours faux pour les organismes créés par les utilisateurs
        compagnieId,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        siteWeb,
        numeroSiret,
      },
      include: {
        compagnie: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    res.status(201).json(organism);
  } catch (error) {
    console.error('Erreur lors de la création de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création de l\'organisme' });
  }
});

/**
 * PUT /api/organisms/:id
 * Modifier un organisme spécifique à une entreprise
 * Les organismes globaux ne peuvent pas être modifiés
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const {
      nom,
      typeOrganisme,
      description,
      adresse,
      codePostal,
      ville,
      telephone,
      email,
      siteWeb,
      numeroSiret,
    } = req.body;

    // Récupérer l'organisme existant
    const existingOrganism = await prisma.organismeCotisation.findUnique({
      where: { id },
      include: {
        compagnie: true,
      },
    });

    if (!existingOrganism) {
      return res.status(404).json({ error: 'Organisme non trouvé' });
    }

    // Interdire la modification des organismes globaux
    if (existingOrganism.estGlobal) {
      return res.status(403).json({
        error: 'Les organismes globaux (obligatoires) ne peuvent pas être modifiés',
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    if (existingOrganism.compagnie?.proprietaireId !== userId) {
      return res.status(403).json({
        error: 'Vous n\'êtes pas autorisé à modifier cet organisme',
      });
    }

    // Mettre à jour l'organisme (ne pas permettre de changer le code ou compagnieId)
    const updatedOrganism = await prisma.organismeCotisation.update({
      where: { id },
      data: {
        nom,
        typeOrganisme,
        description,
        adresse,
        codePostal,
        ville,
        telephone,
        email,
        siteWeb,
        numeroSiret,
      },
      include: {
        compagnie: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
    });

    res.json(updatedOrganism);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de l\'organisme' });
  }
});

/**
 * DELETE /api/organisms/:id
 * Supprimer un organisme spécifique à une entreprise
 * Les organismes globaux ne peuvent pas être supprimés
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Récupérer l'organisme existant
    const existingOrganism = await prisma.organismeCotisation.findUnique({
      where: { id },
      include: {
        compagnie: true,
      },
    });

    if (!existingOrganism) {
      return res.status(404).json({ error: 'Organisme non trouvé' });
    }

    // Interdire la suppression des organismes globaux
    if (existingOrganism.estGlobal) {
      return res.status(403).json({
        error: 'Les organismes globaux (obligatoires) ne peuvent pas être supprimés',
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise
    if (existingOrganism.compagnie?.proprietaireId !== userId) {
      return res.status(403).json({
        error: 'Vous n\'êtes pas autorisé à supprimer cet organisme',
      });
    }

    // Supprimer l'organisme
    await prisma.organismeCotisation.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'organisme' });
  }
});

export default router;
