import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';
import leavesRouter from './leaves';

// Définition des types pour les paramètres d'URL pour plus de sécurité
interface CompanyParams {
  companyId: string;
}

interface EmployeeParams extends CompanyParams {
  employeeId: string;
}

const router = Router({ mergeParams: true });

// Middleware de sécurité pour ce routeur.
router.use(async (req: Request<CompanyParams>, res: Response, next: NextFunction) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:companyId/employees
router.post('/', async (req: Request<CompanyParams>, res: Response) => {
  const { firstName, lastName, email, grossSalary } = req.body;
  const { companyId } = req.params;

  if (!firstName || !lastName || !email || grossSalary == null) {
    return res.status(400).json({ error: 'All employee fields are required' });
  }

  // Validate grossSalary
  const parsedGrossSalary = typeof grossSalary === 'number' ? grossSalary : parseFloat(grossSalary);
  if (!Number.isFinite(parsedGrossSalary) || parsedGrossSalary < 0) {
    return res.status(400).json({ error: 'grossSalary must be a valid non-negative number' });
  }

  try {
    const newEmployee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        email,
        grossSalary: parsedGrossSalary,
        companyId: companyId,
      },
    });
    res.status(201).json(newEmployee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// GET /api/companies/:companyId/employees
router.get('/', async (req: Request<CompanyParams>, res: Response) => {
  const { companyId } = req.params;
  const employees = await prisma.employee.findMany({ where: { companyId } });
  res.json(employees);
});

// PUT /api/companies/:companyId/employees/:employeeId
router.put('/:employeeId', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;
  const { firstName, lastName, email, grossSalary } = req.body;

  // Validate grossSalary if it is provided
  let updateData: any = { firstName, lastName, email };
  if (grossSalary !== undefined) {
    const parsedGrossSalary = typeof grossSalary === 'number' ? grossSalary : parseFloat(grossSalary);
    if (!Number.isFinite(parsedGrossSalary) || parsedGrossSalary < 0) {
      return res.status(400).json({ error: 'grossSalary must be a valid non-negative number' });
    }
    updateData.grossSalary = parsedGrossSalary;
  }

  try {
    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
    });
    res.json(updatedEmployee);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/companies/:companyId/employees/:employeeId
router.delete('/:employeeId', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;
  try {
    await prisma.employee.delete({ where: { id: employeeId } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// Mount the leaves router for nested routes
// This will handle all routes starting with /api/companies/:companyId/employees/:employeeId/leaves
router.use('/:employeeId/leaves', leavesRouter);

export default router;