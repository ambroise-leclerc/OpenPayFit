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
    const companies = await prisma.company.findMany({
      where: { ownerId: req.userId },
    });
    res.json(companies);
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
    const newCompany = await prisma.company.create({
      data: {
        name,
        ownerId: req.userId!,
      },
    });
    res.status(201).json(newCompany);
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
