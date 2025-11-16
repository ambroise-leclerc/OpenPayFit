import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';

// Définition des types pour les paramètres d'URL
interface EmployeeParams {
  companyId: string;
  employeeId: string;
}

interface LeaveParams extends EmployeeParams {
  leaveId: string;
}

const router = Router({ mergeParams: true });

// Middleware de sécurité : vérifier que l'employé appartient à une entreprise de l'utilisateur
router.use(async (req: Request<EmployeeParams>, res: Response, next: NextFunction) => {
  const { companyId, employeeId } = req.params;

  if (!companyId || !employeeId) {
    return res.status(400).json({ error: 'Company ID and Employee ID are required' });
  }

  try {
    // Vérifier que l'entreprise existe et appartient à l'utilisateur
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Vérifier que l'employé existe et appartient à cette entreprise
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (employee.companyId !== companyId) {
      return res.status(403).json({ error: 'Employee does not belong to this company' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:companyId/employees/:employeeId/leaves
// Récupérer toutes les demandes de congés d'un employé
router.get('/', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;

  try {
    const leaves = await prisma.leave.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// POST /api/companies/:companyId/employees/:employeeId/leaves
// Créer une nouvelle demande de congé
router.post('/', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;
  const { type, startDate, endDate, days, reason } = req.body;

  if (!type || !startDate || !endDate || days == null) {
    return res.status(400).json({ error: 'type, startDate, endDate, and days are required' });
  }

  // Valider le nombre de jours
  const parsedDays = typeof days === 'number' ? days : parseFloat(days);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return res.status(400).json({ error: 'days must be a positive number' });
  }

  // Valider les dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  if (start > end) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }

  try {
    // Vérifier le solde de congés disponible pour les congés payés
    if (type === 'PAID_LEAVE') {
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_type_year: {
            employeeId,
            type: 'PAID_LEAVE',
            year: currentYear,
          },
        },
      });

      if (!balance) {
        // Créer un solde par défaut de 25 jours si inexistant
        await prisma.leaveBalance.create({
          data: {
            employeeId,
            type: 'PAID_LEAVE',
            year: currentYear,
            totalDays: 25,
            usedDays: 0,
            remainingDays: 25,
          },
        });
      } else if (balance.remainingDays < parsedDays) {
        return res.status(400).json({
          error: 'Insufficient leave balance',
          remainingDays: balance.remainingDays,
          requestedDays: parsedDays,
        });
      }
    }

    const newLeave = await prisma.leave.create({
      data: {
        employeeId,
        type,
        startDate: start,
        endDate: end,
        days: parsedDays,
        reason: reason || null,
        status: 'PENDING',
      },
    });

    res.status(201).json(newLeave);
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PUT /api/companies/:companyId/employees/:employeeId/leaves/:leaveId
// Mettre à jour une demande de congé (principalement pour changer le statut)
router.put('/:leaveId', async (req: Request<LeaveParams>, res: Response) => {
  const { employeeId, leaveId } = req.params;
  const { status, type, startDate, endDate, days, reason } = req.body;

  try {
    // Récupérer la demande de congé actuelle
    const currentLeave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!currentLeave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (currentLeave.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Leave request does not belong to this employee' });
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;

      // Si on approuve un congé payé, mettre à jour le solde
      if (status === 'APPROVED' && currentLeave.type === 'PAID_LEAVE' && currentLeave.status !== 'APPROVED') {
        const currentYear = new Date().getFullYear();
        const balance = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_type_year: {
              employeeId,
              type: 'PAID_LEAVE',
              year: currentYear,
            },
          },
        });

        if (balance) {
          const newUsedDays = balance.usedDays + currentLeave.days;
          const newRemainingDays = balance.totalDays - newUsedDays;

          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsedDays,
              remainingDays: newRemainingDays,
            },
          });
        }
      }

      // Si on rejette ou annule un congé payé précédemment approuvé, restaurer le solde
      if ((status === 'REJECTED' || status === 'CANCELLED') && currentLeave.type === 'PAID_LEAVE' && currentLeave.status === 'APPROVED') {
        const currentYear = new Date().getFullYear();
        const balance = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_type_year: {
              employeeId,
              type: 'PAID_LEAVE',
              year: currentYear,
            },
          },
        });

        if (balance) {
          const newUsedDays = balance.usedDays - currentLeave.days;
          const newRemainingDays = balance.totalDays - newUsedDays;

          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsedDays,
              remainingDays: newRemainingDays,
            },
          });
        }
      }
    }

    if (type !== undefined) updateData.type = type;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (days !== undefined) {
      const parsedDays = typeof days === 'number' ? days : parseFloat(days);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({ error: 'days must be a positive number' });
      }
      updateData.days = parsedDays;
    }
    if (reason !== undefined) updateData.reason = reason;

    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: updateData,
    });

    res.json(updatedLeave);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    console.error('Error updating leave:', error);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

// DELETE /api/companies/:companyId/employees/:employeeId/leaves/:leaveId
// Supprimer une demande de congé
router.delete('/:leaveId', async (req: Request<LeaveParams>, res: Response) => {
  const { employeeId, leaveId } = req.params;

  try {
    // Récupérer la demande avant de la supprimer pour restaurer le solde si nécessaire
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.employeeId !== employeeId) {
      return res.status(403).json({ error: 'Leave request does not belong to this employee' });
    }

    // Si le congé était approuvé, restaurer le solde
    if (leave.status === 'APPROVED' && leave.type === 'PAID_LEAVE') {
      const currentYear = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_type_year: {
            employeeId,
            type: 'PAID_LEAVE',
            year: currentYear,
          },
        },
      });

      if (balance) {
        const newUsedDays = balance.usedDays - leave.days;
        const newRemainingDays = balance.totalDays - newUsedDays;

        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            usedDays: newUsedDays,
            remainingDays: newRemainingDays,
          },
        });
      }
    }

    await prisma.leave.delete({ where: { id: leaveId } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    console.error('Error deleting leave:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});

// GET /api/companies/:companyId/employees/:employeeId/leave-balances
// Récupérer les soldes de congés d'un employé
router.get('/balances', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;
  const currentYear = new Date().getFullYear();

  try {
    let balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year: currentYear,
      },
    });

    // Si aucun solde n'existe, créer un solde par défaut pour les congés payés
    if (balances.length === 0) {
      const defaultBalance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          type: 'PAID_LEAVE',
          year: currentYear,
          totalDays: 25,
          usedDays: 0,
          remainingDays: 25,
        },
      });
      balances = [defaultBalance];
    }

    res.json(balances);
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
});

export default router;
