import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import employeesRouter from './employees';
import analyticsRouter from './analytics';
import expenseReportsRouter from './expense-reports';

const router = Router();

// Appliquer le middleware d'authentification à toutes les routes de ce fichier
router.use(authenticateToken);

// GET /api/companies
// Récupère toutes les entreprises de l'utilisateur authentifié
router.get('/', async (req, res) => {
  try {
    const companies = await prisma.compagnie.findMany({
      where: { proprietaireId: req.userId },
    });
    // Transformer les objets avant de les renvoyer
    const transformedCompanies = companies.map((c: any) => ({
      id: c.id,
      name: c.nom,
      ownerId: c.proprietaireId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    res.json(transformedCompanies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Échec de la récupération des entreprises' });
  }
});

// POST /api/companies
// Crée une nouvelle entreprise pour l'utilisateur authentifié
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom de l\'entreprise est requis' });
  }

  try {
    const newCompany = await prisma.compagnie.create({
      data: {
        nom: name,
        proprietaireId: req.userId!,
      },
    });
    res.status(201).json({
      id: newCompany.id,
      name: newCompany.nom,
      ownerId: newCompany.proprietaireId,
      createdAt: newCompany.createdAt,
      updatedAt: newCompany.updatedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Échec de la création de l\'entreprise' });
  }
});

// Monter le routeur des employés pour les routes imbriquées
// Ceci gérera toutes les routes commençant par /api/companies/:companyId/employees
router.use('/:companyId/employees', employeesRouter);

// Monter le routeur des analytics pour les routes imbriquées
// Ceci gérera toutes les routes commençant par /api/companies/:companyId/analytics
router.use('/:companyId/analytics', analyticsRouter);

// Monter le routeur des notes de frais pour les routes imbriquées
// Ceci gérera toutes les routes commençant par /api/companies/:companyId/expense-reports
router.use('/:companyId/expense-reports', expenseReportsRouter);

export default router;
