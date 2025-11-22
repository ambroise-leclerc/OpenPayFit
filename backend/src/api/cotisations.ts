import { Router, Request, Response } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';
import YAML from 'yaml';
import { ZodError } from 'zod';
import {
  TYPE_COTISATION_VALIDES,
  TYPE_CALCUL_VALIDES,
  TYPE_ASSIETTE_VALIDES,
  isTypeCotisationValide,
  isTypeCalculValide,
  isTypeAssietteValide,
  getPassMensuel,
  MESSAGES_ERREUR,
} from '../lib/cotisations-constants';
import { importDataSchema } from '../lib/cotisations-schemas';

const router = Router();

// ========== Endpoints pour les Catégories de Cotisation ==========

// GET /api/cotisations/categories - Liste toutes les catégories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.categorieCotisation.findMany({
      include: {
        regles: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

// GET /api/cotisations/categories/:id - Récupère une catégorie par ID
router.get('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const categorie = await prisma.categorieCotisation.findUnique({
      where: { id },
      include: {
        regles: {
          include: {
            organisme: true,
            taux: true,
          },
        },
      },
    });

    if (!categorie) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    res.json(categorie);
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la catégorie' });
  }
});

// POST /api/cotisations/categories - Créer une nouvelle catégorie
router.post('/categories', async (req: Request, res: Response) => {
  const { code, nom, description } = req.body;

  // Validation des champs requis
  if (!code || !nom) {
    return res.status(400).json({ error: 'Les champs code et nom sont requis' });
  }

  try {
    const nouvelleCategorie = await prisma.categorieCotisation.create({
      data: {
        code,
        nom,
        description,
      },
    });
    res.status(201).json(nouvelleCategorie);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Une catégorie avec ce code existe déjà' });
    }
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
  }
});

// PUT /api/cotisations/categories/:id - Modifier une catégorie
router.put('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, nom, description } = req.body;

  try {
    const categorieModifiee = await prisma.categorieCotisation.update({
      where: { id },
      data: {
        code,
        nom,
        description,
      },
    });
    res.json(categorieModifiee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Une catégorie avec ce code existe déjà' });
      }
    }
    console.error('Erreur lors de la modification de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de la catégorie' });
  }
});

// DELETE /api/cotisations/categories/:id - Supprimer une catégorie
router.delete('/categories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.categorieCotisation.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Catégorie non trouvée' });
      }
      if (error.code === 'P2003') {
        return res.status(409).json({ error: 'Impossible de supprimer : des règles sont associées à cette catégorie' });
      }
    }
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

// ========== Endpoints pour les Organismes de Cotisation ==========

// GET /api/cotisations/organismes - Liste tous les organismes
router.get('/organismes', async (req: Request, res: Response) => {
  try {
    const organismes = await prisma.organismeCotisation.findMany({
      include: {
        regles: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
    res.json(organismes);
  } catch (error) {
    console.error('Erreur lors de la récupération des organismes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des organismes' });
  }
});

// GET /api/cotisations/organismes/:id - Récupère un organisme par ID
router.get('/organismes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const organisme = await prisma.organismeCotisation.findUnique({
      where: { id },
      include: {
        regles: {
          include: {
            categorie: true,
            taux: true,
          },
        },
      },
    });

    if (!organisme) {
      return res.status(404).json({ error: 'Organisme non trouvé' });
    }

    res.json(organisme);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'organisme' });
  }
});

// POST /api/cotisations/organismes - Créer un nouvel organisme
router.post('/organismes', async (req: Request, res: Response) => {
  const { code, nom, description } = req.body;

  // Validation des champs requis
  if (!code || !nom) {
    return res.status(400).json({ error: 'Les champs code et nom sont requis' });
  }

  try {
    const nouvelOrganisme = await prisma.organismeCotisation.create({
      data: {
        code,
        nom,
        description,
      },
    });
    res.status(201).json(nouvelOrganisme);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Un organisme avec ce code existe déjà' });
    }
    console.error('Erreur lors de la création de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'organisme' });
  }
});

// PUT /api/cotisations/organismes/:id - Modifier un organisme
router.put('/organismes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, nom, description } = req.body;

  try {
    const organismeModifie = await prisma.organismeCotisation.update({
      where: { id },
      data: {
        code,
        nom,
        description,
      },
    });
    res.json(organismeModifie);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Organisme non trouvé' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Un organisme avec ce code existe déjà' });
      }
    }
    console.error('Erreur lors de la modification de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'organisme' });
  }
});

// DELETE /api/cotisations/organismes/:id - Supprimer un organisme
router.delete('/organismes/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.organismeCotisation.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Organisme non trouvé' });
      }
      if (error.code === 'P2003') {
        return res.status(409).json({ error: 'Impossible de supprimer : des règles sont associées à cet organisme' });
      }
    }
    console.error('Erreur lors de la suppression de l\'organisme:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisme' });
  }
});

// ========== Endpoints pour les Règles de Cotisation ==========

// GET /api/cotisations/regles - Liste toutes les règles
router.get('/regles', async (req: Request, res: Response) => {
  try {
    const regles = await prisma.regleCotisation.findMany({
      include: {
        categorie: true,
        organisme: true,
        taux: {
          orderBy: {
            dateDebut: 'desc',
          },
        },
        reglesComptables: true,
      },
      orderBy: {
        code: 'asc',
      },
    });
    res.json(regles);
  } catch (error) {
    console.error('Erreur lors de la récupération des règles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des règles' });
  }
});

// GET /api/cotisations/regles/:id - Récupère une règle par ID
router.get('/regles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const regle = await prisma.regleCotisation.findUnique({
      where: { id },
      include: {
        categorie: true,
        organisme: true,
        taux: {
          orderBy: {
            dateDebut: 'desc',
          },
        },
        reglesComptables: true,
      },
    });

    if (!regle) {
      return res.status(404).json({ error: 'Règle non trouvée' });
    }

    res.json(regle);
  } catch (error) {
    console.error('Erreur lors de la récupération de la règle:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la règle' });
  }
});

// POST /api/cotisations/regles - Créer une nouvelle règle
router.post('/regles', async (req: Request, res: Response) => {
  const {
    code,
    nom,
    description,
    categorieId,
    organismeId,
    typeCotisation,
    typeCalcul,
    typeAssiette,
    plancher,
    plafond,
    estActif,
  } = req.body;

  // Validation des champs requis
  if (!code || !nom || !categorieId || !organismeId || !typeCotisation || !typeCalcul || !typeAssiette) {
    return res.status(400).json({
      error: 'Les champs code, nom, categorieId, organismeId, typeCotisation, typeCalcul et typeAssiette sont requis',
    });
  }

  // Validation des types enum
  if (!isTypeCotisationValide(typeCotisation)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_COTISATION_INVALIDE });
  }
  if (!isTypeCalculValide(typeCalcul)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_CALCUL_INVALIDE });
  }
  if (!isTypeAssietteValide(typeAssiette)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_ASSIETTE_INVALIDE });
  }

  // Validation des montants (plancher et plafond optionnels mais doivent être positifs)
  if (plancher !== undefined && plancher !== null && (typeof plancher !== 'number' || plancher < 0)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.PLANCHER_INVALIDE });
  }
  if (plafond !== undefined && plafond !== null && (typeof plafond !== 'number' || plafond < 0)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.PLAFOND_INVALIDE });
  }

  try {
    const nouvelleRegle = await prisma.regleCotisation.create({
      data: {
        code,
        nom,
        description,
        categorieId,
        organismeId,
        typeCotisation,
        typeCalcul,
        typeAssiette,
        plancher,
        plafond,
        estActif: estActif !== undefined ? estActif : true,
      },
      include: {
        categorie: true,
        organisme: true,
      },
    });
    res.status(201).json(nouvelleRegle);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Une règle avec ce code existe déjà' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Catégorie ou organisme invalide' });
      }
    }
    console.error('Erreur lors de la création de la règle:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la règle' });
  }
});

// PUT /api/cotisations/regles/:id - Modifier une règle
router.put('/regles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    code,
    nom,
    description,
    categorieId,
    organismeId,
    typeCotisation,
    typeCalcul,
    typeAssiette,
    plancher,
    plafond,
    estActif,
  } = req.body;

  // Validation des types enum si fournis
  if (typeCotisation && !isTypeCotisationValide(typeCotisation)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_COTISATION_INVALIDE });
  }
  if (typeCalcul && !isTypeCalculValide(typeCalcul)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_CALCUL_INVALIDE });
  }
  if (typeAssiette && !isTypeAssietteValide(typeAssiette)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TYPE_ASSIETTE_INVALIDE });
  }

  // Validation des montants
  if (plancher !== undefined && plancher !== null && (typeof plancher !== 'number' || plancher < 0)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.PLANCHER_INVALIDE });
  }
  if (plafond !== undefined && plafond !== null && (typeof plafond !== 'number' || plafond < 0)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.PLAFOND_INVALIDE });
  }

  try {
    const regleModifiee = await prisma.regleCotisation.update({
      where: { id },
      data: {
        code,
        nom,
        description,
        categorieId,
        organismeId,
        typeCotisation,
        typeCalcul,
        typeAssiette,
        plancher,
        plafond,
        estActif,
      },
      include: {
        categorie: true,
        organisme: true,
      },
    });
    res.json(regleModifiee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Règle non trouvée' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Une règle avec ce code existe déjà' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Catégorie ou organisme invalide' });
      }
    }
    console.error('Erreur lors de la modification de la règle:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de la règle' });
  }
});

// DELETE /api/cotisations/regles/:id - Supprimer une règle
router.delete('/regles/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.regleCotisation.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Règle non trouvée' });
      }
    }
    console.error('Erreur lors de la suppression de la règle:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la règle' });
  }
});

// ========== Endpoints pour les Taux de Cotisation ==========

// GET /api/cotisations/regles/:regleId/taux - Liste tous les taux d'une règle
router.get('/regles/:regleId/taux', async (req: Request, res: Response) => {
  const { regleId } = req.params;

  try {
    const taux = await prisma.tauxCotisation.findMany({
      where: { regleId },
      orderBy: {
        dateDebut: 'desc',
      },
    });
    res.json(taux);
  } catch (error) {
    console.error('Erreur lors de la récupération des taux:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des taux' });
  }
});

// POST /api/cotisations/regles/:regleId/taux - Créer un nouveau taux pour une règle
router.post('/regles/:regleId/taux', async (req: Request, res: Response) => {
  const { regleId } = req.params;
  const { taux, dateDebut, dateFin } = req.body;

  // Validation des champs requis
  if (taux === undefined || taux === null || !dateDebut) {
    return res.status(400).json({ error: 'Les champs taux et dateDebut sont requis' });
  }

  // Validation du taux (doit être entre 0 et 1 pour les pourcentages)
  if (typeof taux !== 'number' || taux < 0 || taux > 1) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TAUX_INVALIDE });
  }

  // Validation des dates
  const dateDebutParsed = new Date(dateDebut);
  if (isNaN(dateDebutParsed.getTime())) {
    return res.status(400).json({ error: 'Date de début invalide' });
  }

  let dateFinParsed = null;
  if (dateFin) {
    dateFinParsed = new Date(dateFin);
    if (isNaN(dateFinParsed.getTime())) {
      return res.status(400).json({ error: 'Date de fin invalide' });
    }
    // Vérifier que dateFin est strictement postérieure à dateDebut
    if (dateFinParsed.getTime() === dateDebutParsed.getTime()) {
      return res.status(400).json({ error: MESSAGES_ERREUR.DATES_EGALES });
    }
    if (dateFinParsed < dateDebutParsed) {
      return res.status(400).json({ error: MESSAGES_ERREUR.DATE_FIN_ANTERIEURE });
    }
  }

  try {
    const nouveauTaux = await prisma.tauxCotisation.create({
      data: {
        regleId,
        taux,
        dateDebut: dateDebutParsed,
        dateFin: dateFinParsed,
      },
    });
    res.status(201).json(nouveauTaux);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Un taux avec cette date de début existe déjà pour cette règle' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Règle invalide' });
      }
    }
    console.error('Erreur lors de la création du taux:', error);
    res.status(500).json({ error: 'Erreur lors de la création du taux' });
  }
});

// PUT /api/cotisations/taux/:id - Modifier un taux
router.put('/taux/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { taux, dateDebut, dateFin } = req.body;

  // Validation du taux si fourni
  if (taux !== undefined && (typeof taux !== 'number' || taux < 0 || taux > 1)) {
    return res.status(400).json({ error: MESSAGES_ERREUR.TAUX_INVALIDE });
  }

  // Validation des dates si fournies
  let dateDebutParsed = undefined;
  if (dateDebut) {
    dateDebutParsed = new Date(dateDebut);
    if (isNaN(dateDebutParsed.getTime())) {
      return res.status(400).json({ error: 'Date de début invalide' });
    }
  }

  let dateFinParsed = undefined;
  if (dateFin) {
    dateFinParsed = new Date(dateFin);
    if (isNaN(dateFinParsed.getTime())) {
      return res.status(400).json({ error: 'Date de fin invalide' });
    }
  }

  // Validation de la relation entre les dates si les deux sont fournies
  if (dateDebutParsed && dateFinParsed) {
    if (dateFinParsed.getTime() === dateDebutParsed.getTime()) {
      return res.status(400).json({ error: MESSAGES_ERREUR.DATES_EGALES });
    }
    if (dateFinParsed < dateDebutParsed) {
      return res.status(400).json({ error: MESSAGES_ERREUR.DATE_FIN_ANTERIEURE });
    }
  }

  try {
    const tauxModifie = await prisma.tauxCotisation.update({
      where: { id },
      data: {
        taux,
        dateDebut: dateDebutParsed,
        dateFin: dateFinParsed,
      },
    });
    res.json(tauxModifie);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Taux non trouvé' });
      }
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Un taux avec cette date de début existe déjà pour cette règle' });
      }
    }
    console.error('Erreur lors de la modification du taux:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du taux' });
  }
});

// DELETE /api/cotisations/taux/:id - Supprimer un taux
router.delete('/taux/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.tauxCotisation.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Taux non trouvé' });
      }
    }
    console.error('Erreur lors de la suppression du taux:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du taux' });
  }
});

// ========== Endpoints d'Import/Export ==========

// POST /api/cotisations/import - Importer des règles depuis YAML ou JSON
router.post('/import', async (req: Request, res: Response) => {
  const { format, data } = req.body;

  if (!format || !data) {
    return res.status(400).json({ error: 'Les champs format et data sont requis' });
  }

  if (format !== 'yaml' && format !== 'json') {
    return res.status(400).json({ error: 'Le format doit être "yaml" ou "json"' });
  }

  try {
    // Parser les données selon le format
    let parsedData: any;
    if (format === 'yaml') {
      parsedData = YAML.parse(data);
    } else {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    }

    // Valider le schéma des données importées avec Zod
    const validationResult = importDataSchema.safeParse(parsedData);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
      return res.status(400).json({
        error: 'Données invalides',
        details: errors,
      });
    }

    const validatedData = validationResult.data;

    const result = {
      categoriesCreated: 0,
      organismesCreated: 0,
      reglesCreated: 0,
      tauxCreated: 0,
      errors: [] as string[],
    };

    // Importer les catégories
    if (validatedData.categories && Array.isArray(validatedData.categories)) {
      for (const cat of validatedData.categories) {
        try {
          await prisma.categorieCotisation.create({
            data: {
              code: cat.code,
              nom: cat.nom,
              description: cat.description,
            },
          });
          result.categoriesCreated++;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            result.errors.push(`Catégorie ${cat.code} existe déjà`);
          } else {
            result.errors.push(`Erreur lors de la création de la catégorie ${cat.code}`);
          }
        }
      }
    }

    // Importer les organismes
    if (validatedData.organismes && Array.isArray(validatedData.organismes)) {
      for (const org of validatedData.organismes) {
        try {
          await prisma.organismeCotisation.create({
            data: {
              code: org.code,
              nom: org.nom,
              description: org.description,
            },
          });
          result.organismesCreated++;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            result.errors.push(`Organisme ${org.code} existe déjà`);
          } else {
            result.errors.push(`Erreur lors de la création de l'organisme ${org.code}`);
          }
        }
      }
    }

    // Importer les règles
    if (validatedData.regles && Array.isArray(validatedData.regles)) {
      for (const regle of validatedData.regles) {
        try {
          // Trouver la catégorie et l'organisme par code
          const categorie = await prisma.categorieCotisation.findUnique({
            where: { code: regle.categorieCode },
          });
          const organisme = await prisma.organismeCotisation.findUnique({
            where: { code: regle.organismeCode },
          });

          if (!categorie || !organisme) {
            result.errors.push(
              `Règle ${regle.code}: catégorie ou organisme non trouvé (${regle.categorieCode}, ${regle.organismeCode})`
            );
            continue;
          }

          const nouvelleRegle = await prisma.regleCotisation.create({
            data: {
              code: regle.code,
              nom: regle.nom,
              description: regle.description,
              categorieId: categorie.id,
              organismeId: organisme.id,
              typeCotisation: regle.typeCotisation,
              typeCalcul: regle.typeCalcul,
              typeAssiette: regle.typeAssiette,
              plancher: regle.plancher,
              plafond: regle.plafond,
              estActif: regle.estActif !== undefined ? regle.estActif : true,
            },
          });
          result.reglesCreated++;

          // Importer les taux associés
          if (regle.taux && Array.isArray(regle.taux)) {
            for (const taux of regle.taux) {
              try {
                await prisma.tauxCotisation.create({
                  data: {
                    regleId: nouvelleRegle.id,
                    taux: taux.taux,
                    dateDebut: new Date(taux.dateDebut),
                    dateFin: taux.dateFin ? new Date(taux.dateFin) : null,
                  },
                });
                result.tauxCreated++;
              } catch (error) {
                result.errors.push(`Erreur lors de la création du taux pour la règle ${regle.code}`);
              }
            }
          }
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            result.errors.push(`Règle ${regle.code} existe déjà`);
          } else {
            result.errors.push(`Erreur lors de la création de la règle ${regle.code}`);
          }
        }
      }
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: `Erreur de parsing ${format.toUpperCase()}: ${error.message}` });
    }
    res.status(500).json({ error: 'Erreur lors de l\'importation des données' });
  }
});

// GET /api/cotisations/export - Exporter toutes les règles en YAML ou JSON
router.get('/export', async (req: Request, res: Response) => {
  const format = req.query.format as string;

  if (!format || (format !== 'yaml' && format !== 'json')) {
    return res.status(400).json({ error: 'Le paramètre format doit être "yaml" ou "json"' });
  }

  try {
    // Récupérer toutes les données
    const categories = await prisma.categorieCotisation.findMany({
      orderBy: { code: 'asc' },
    });

    const organismes = await prisma.organismeCotisation.findMany({
      orderBy: { code: 'asc' },
    });

    const regles = await prisma.regleCotisation.findMany({
      include: {
        categorie: true,
        organisme: true,
        taux: {
          orderBy: { dateDebut: 'desc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Formater les données pour l'export
    const exportData = {
      categories: categories.map((cat: any) => ({
        code: cat.code,
        nom: cat.nom,
        description: cat.description,
      })),
      organismes: organismes.map((org: any) => ({
        code: org.code,
        nom: org.nom,
        description: org.description,
      })),
      regles: regles.map((regle: any) => ({
        code: regle.code,
        nom: regle.nom,
        description: regle.description,
        categorieCode: regle.categorie.code,
        organismeCode: regle.organisme.code,
        typeCotisation: regle.typeCotisation,
        typeCalcul: regle.typeCalcul,
        typeAssiette: regle.typeAssiette,
        plancher: regle.plancher,
        plafond: regle.plafond,
        estActif: regle.estActif,
        taux: regle.taux.map((t: any) => ({
          taux: t.taux,
          dateDebut: t.dateDebut.toISOString().split('T')[0],
          dateFin: t.dateFin ? t.dateFin.toISOString().split('T')[0] : null,
        })),
      })),
    };

    // Retourner les données selon le format demandé
    if (format === 'yaml') {
      const yamlData = YAML.stringify(exportData);
      res.setHeader('Content-Type', 'application/x-yaml');
      res.setHeader('Content-Disposition', 'attachment; filename="cotisations.yaml"');
      res.send(yamlData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="cotisations.json"');
      res.json(exportData);
    }
  } catch (error) {
    console.error('Erreur lors de l\'exportation des données:', error);
    res.status(500).json({ error: 'Erreur lors de l\'exportation des données' });
  }
});

// ========== Endpoint de Simulation ==========

// POST /api/cotisations/simulation - Simuler le calcul de paie
router.post('/simulation', async (req: Request, res: Response) => {
  const { salaireBrut, date, statutEmploye } = req.body;

  // Validation des champs requis
  if (salaireBrut === undefined || salaireBrut === null) {
    return res.status(400).json({ error: 'Le champ salaireBrut est requis' });
  }

  if (typeof salaireBrut !== 'number' || salaireBrut < 0) {
    return res.status(400).json({ error: 'Le salaireBrut doit être un nombre positif' });
  }

  // Valider le statut de l'employé (optionnel, par défaut NON_CADRE)
  const statut = statutEmploye || 'NON_CADRE';
  if (!['NON_CADRE', 'CADRE', 'FORFAIT_JOURS'].includes(statut)) {
    return res.status(400).json({
      error: 'Statut d\'employé invalide. Valeurs acceptées : NON_CADRE, CADRE, FORFAIT_JOURS'
    });
  }

  // Valider la date
  const dateSimulation = date ? new Date(date) : new Date();
  if (isNaN(dateSimulation.getTime())) {
    return res.status(400).json({ error: 'Date invalide' });
  }

  try {
    // Récupérer toutes les règles actives avec filtrage par statut d'employé
    const regles = await prisma.regleCotisation.findMany({
      where: {
        estActif: true,
        // Filtrer selon le statut de l'employé
        OR: [
          // Règles sans restrictions de statut
          {
            applicableACadre: null,
            applicableANonCadre: null,
            applicableAForfaitJours: null,
          },
          // Règles applicables selon le statut
          ...(statut === 'CADRE' ? [{ applicableACadre: true }] : []),
          ...(statut === 'NON_CADRE' ? [{ applicableANonCadre: true }] : []),
          ...(statut === 'FORFAIT_JOURS' ? [{ applicableAForfaitJours: true }] : []),
        ],
      },
      include: {
        categorie: true,
        organisme: true,
        taux: {
          where: {
            dateDebut: { lte: dateSimulation },
            OR: [{ dateFin: null }, { dateFin: { gt: dateSimulation } }],
          },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
        tranches: {
          where: {
            dateDebut: { lte: dateSimulation },
            OR: [{ dateFin: null }, { dateFin: { gt: dateSimulation } }],
          },
          orderBy: { ordre: 'asc' },
        },
      },
    });

    // Calculer les cotisations
    let totalCotisationsSalariales = 0;
    let totalCotisationsPatronales = 0;
    let totalChargesFiscales = 0;

    const detailsCotisations = regles
      .map((regle: any) => {
        // Récupérer le taux applicable
        const tauxApplicable = regle.taux[0];
        if (!tauxApplicable) {
          return null; // Pas de taux applicable pour cette date
        }

        // Calculer l'assiette
        let assiette = salaireBrut;
        if (regle.typeAssiette === 'SALAIRE_PLAFONNE') {
          // Utiliser le PASS configuré (màj annuelle dans cotisations-constants.ts)
          assiette = Math.min(salaireBrut, regle.plafond || getPassMensuel());
        }

        // Appliquer le plancher si défini
        if (regle.plancher && assiette < regle.plancher) {
          assiette = 0; // Pas de cotisation si en dessous du plancher
        }

        // Calculer le montant de la cotisation
        let montant = 0;
        if (regle.typeCalcul === 'POURCENTAGE') {
          montant = assiette * tauxApplicable.taux;
        } else if (regle.typeCalcul === 'MONTANT_FIXE') {
          montant = tauxApplicable.taux;
        } else if (regle.typeCalcul === 'TRANCHES' && regle.tranches && regle.tranches.length > 0) {
          // Calcul par tranches A, B, C
          const passMensuel = getPassMensuel();

          for (const tranche of regle.tranches) {
            // Calculer les limites de la tranche en euros
            const plancherEuros = tranche.plancherPASS * passMensuel;
            const plafondEuros = tranche.plafondPASS * passMensuel;

            // Calcul correct de l'assiette de la tranche
            const assietteTranche = Math.max(0, Math.min(salaireBrut, plafondEuros) - plancherEuros);

            // Si l'assiette de la tranche est positive
            if (assietteTranche > 0) {
              const montantTranche = assietteTranche * tranche.taux;
              montant += montantTranche;
            }
          }
        }

        // Arrondir à 2 décimales
        montant = Math.round(montant * 100) / 100;

        // Ajouter au total correspondant
        if (regle.typeCotisation === 'COTISATION_SALARIALE') {
          totalCotisationsSalariales += montant;
        } else if (regle.typeCotisation === 'COTISATION_PATRONALE') {
          totalCotisationsPatronales += montant;
        } else if (regle.typeCotisation === 'CHARGE_FISCALE') {
          totalChargesFiscales += montant;
        }

        return {
          code: regle.code,
          nom: regle.nom,
          categorie: regle.categorie.nom,
          organisme: regle.organisme.nom,
          typeCotisation: regle.typeCotisation,
          assiette: Math.round(assiette * 100) / 100,
          taux: tauxApplicable.taux,
          montant,
        };
      })
      .filter((c: any) => c !== null);

    // Calculer les totaux
    totalCotisationsSalariales = Math.round(totalCotisationsSalariales * 100) / 100;
    totalCotisationsPatronales = Math.round(totalCotisationsPatronales * 100) / 100;
    totalChargesFiscales = Math.round(totalChargesFiscales * 100) / 100;

    const salaireNet = Math.round((salaireBrut - totalCotisationsSalariales) * 100) / 100;
    const coutTotal = Math.round((salaireBrut + totalCotisationsPatronales + totalChargesFiscales) * 100) / 100;

    res.json({
      salaireBrut,
      dateSimulation: dateSimulation.toISOString().split('T')[0],
      cotisationsSalariales: totalCotisationsSalariales,
      cotisationsPatronales: totalCotisationsPatronales,
      chargesFiscales: totalChargesFiscales,
      salaireNet,
      coutTotal,
      details: detailsCotisations,
    });
  } catch (error) {
    console.error('Erreur lors de la simulation du calcul de paie:', error);
    res.status(500).json({ error: 'Erreur lors de la simulation du calcul de paie' });
  }
});

export default router;
