import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import employeesRouter from './employees';
import analyticsRouter from './analytics';
import expenseReportsRouter from './expense-reports';

const router = Router();

// Apply the authentication middleware to all routes in this file
router.use(authenticateToken);

// GET /api/companies
// Gets all companies for the authenticated user
router.get('/', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { ownerId: req.userId },
    });
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve companies' });
  }
});

// POST /api/companies
// Creates a new company for the authenticated user
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Company name is required' });
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
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Mount the employees router for nested routes
// This will handle all routes starting with /api/companies/:companyId/employees
router.use('/:companyId/employees', employeesRouter);

// Mount the analytics router for nested routes
// This will handle all routes starting with /api/companies/:companyId/analytics
router.use('/:companyId/analytics', analyticsRouter);

// Mount the expense reports router for nested routes
// This will handle all routes starting with /api/companies/:companyId/expense-reports
router.use('/:companyId/expense-reports', expenseReportsRouter);

export default router;
