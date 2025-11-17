import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';

// Constantes
const DEFAULT_ANNUAL_LEAVE_DAYS = 25; // Jours de congés payés annuels par défaut (France)

// Définition des types pour les paramètres d'URL
interface EmployeeParams {
  companyId: string;
  employeeId: string;
}

interface LeaveParams extends EmployeeParams {
  leaveId: string;
}

// Types de statut valides pour les transitions
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Fonction utilitaire pour restaurer le solde de congés
async function restoreLeaveBalance(
  employeeId: string,
  leaveDays: number,
  year: number
): Promise<void> {
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_type_year: {
        employeeId,
        type: 'PAID_LEAVE',
        year,
      },
    },
  });

  if (balance) {
    // Utiliser Math.max pour éviter les soldes négatifs en cas de données incohérentes
    const newUsedDays = Math.max(0, balance.usedDays - leaveDays);
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

// Fonction utilitaire pour consommer le solde de congés
async function consumeLeaveBalance(
  employeeId: string,
  leaveDays: number,
  year: number
): Promise<void> {
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_type_year: {
        employeeId,
        type: 'PAID_LEAVE',
        year,
      },
    },
  });

  if (balance) {
    const newUsedDays = balance.usedDays + leaveDays;
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

// Validation des transitions d'état
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, LeaveStatus[]> = {
    PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['CANCELLED'], // Une demande approuvée peut seulement être annulée
    REJECTED: [], // Une demande rejetée ne peut plus changer d'état
    CANCELLED: [], // Une demande annulée ne peut plus changer d'état
  };

  return validTransitions[currentStatus]?.includes(newStatus as LeaveStatus) ?? false;
}

const router = Router({ mergeParams: true });

// Middleware de sécurité : vérifier que l'employé appartient à une entreprise de l'utilisateur
router.use(async (req: Request<EmployeeParams>, res: Response, next: NextFunction) => {
  const { companyId, employeeId } = req.params;

  if (!companyId || !employeeId) {
    return res.status(400).json({ error: 'L\'ID de l\'entreprise et l\'ID de l\'employé sont requis' });
  }

  try {
    // Vérifier que l'entreprise existe et appartient à l'utilisateur
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Interdit' });
    }

    // Vérifier que l'employé existe et appartient à cette entreprise
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    if (employee.companyId !== companyId) {
      return res.status(403).json({ error: 'L\'employé n\'appartient pas à cette entreprise' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur interne' });
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
    res.status(500).json({ error: 'Échec de la récupération des congés' });
  }
});

// POST /api/companies/:companyId/employees/:employeeId/leaves
// Créer une nouvelle demande de congé
router.post('/', async (req: Request<EmployeeParams>, res: Response) => {
  const { employeeId } = req.params;
  const { type, startDate, endDate, days, reason } = req.body;

  if (!type || !startDate || !endDate || days == null) {
    return res.status(400).json({ error: 'type, startDate, endDate et days sont requis' });
  }

  // Valider le nombre de jours
  const parsedDays = typeof days === 'number' ? days : parseFloat(days);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    return res.status(400).json({ error: 'days doit être un nombre positif' });
  }

  // Valider les dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Format de date invalide' });
  }

  if (start > end) {
    return res.status(400).json({ error: 'La date de début doit être avant la date de fin' });
  }

  try {
    // Utiliser une transaction pour éviter les race conditions lors de la vérification et création
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newLeave = await prisma.$transaction(async (tx: any) => {
      // Vérifier le solde de congés disponible pour les congés payés
      if (type === 'PAID_LEAVE') {
        const currentYear = new Date().getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_type_year: {
              employeeId,
              type: 'PAID_LEAVE',
              year: currentYear,
            },
          },
        });

        if (!balance) {
          // Créer un solde par défaut si inexistant
          await tx.leaveBalance.create({
            data: {
              employeeId,
              type: 'PAID_LEAVE',
              year: currentYear,
              totalDays: DEFAULT_ANNUAL_LEAVE_DAYS,
              usedDays: 0,
              remainingDays: DEFAULT_ANNUAL_LEAVE_DAYS,
            },
          });
        } else if (balance.remainingDays < parsedDays) {
          throw new Error(
            JSON.stringify({
              code: 'INSUFFICIENT_BALANCE',
              remainingDays: balance.remainingDays,
              requestedDays: parsedDays,
            })
          );
        }
      }

      // Créer la demande de congé
      return await tx.leave.create({
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
    });

    res.status(201).json(newLeave);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('{')) {
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === 'INSUFFICIENT_BALANCE') {
          return res.status(400).json({
            error: 'Solde de congés insuffisant',
            remainingDays: errorData.remainingDays,
            requestedDays: errorData.requestedDays,
          });
        }
      } catch {
        // Continue avec la gestion d'erreur générique
      }
    }
    console.error('Erreur lors de la création du congé:', error);
    res.status(500).json({ error: 'Échec de la création de la demande de congé' });
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
      return res.status(404).json({ error: 'Demande de congé non trouvée' });
    }

    if (currentLeave.employeeId !== employeeId) {
      return res.status(403).json({ error: 'La demande de congé n\'appartient pas à cet employé' });
    }

    // Préparer les données de mise à jour
    const updateData: any = {};

    if (status !== undefined) {
      // Valider la transition d'état
      if (!isValidStatusTransition(currentLeave.status, status)) {
        return res.status(400).json({
          error: 'Transition de statut invalide',
          currentStatus: currentLeave.status,
          requestedStatus: status,
        });
      }

      updateData.status = status;

      const currentYear = new Date().getFullYear();

      // Si on approuve un congé payé, mettre à jour le solde
      if (status === 'APPROVED' && currentLeave.type === 'PAID_LEAVE' && currentLeave.status !== 'APPROVED') {
        await consumeLeaveBalance(employeeId, currentLeave.days, currentYear);
      }

      // Si on rejette ou annule un congé payé précédemment approuvé, restaurer le solde
      if ((status === 'REJECTED' || status === 'CANCELLED') && currentLeave.type === 'PAID_LEAVE' && currentLeave.status === 'APPROVED') {
        await restoreLeaveBalance(employeeId, currentLeave.days, currentYear);
      }
    }

    if (type !== undefined) updateData.type = type;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (days !== undefined) {
      const parsedDays = typeof days === 'number' ? days : parseFloat(days);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        return res.status(400).json({ error: 'days doit être un nombre positif' });
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
      return res.status(404).json({ error: 'Demande de congé non trouvée' });
    }
    console.error('Erreur lors de la mise à jour du congé:', error);
    res.status(500).json({ error: 'Échec de la mise à jour de la demande de congé' });
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
      return res.status(404).json({ error: 'Demande de congé non trouvée' });
    }

    if (leave.employeeId !== employeeId) {
      return res.status(403).json({ error: 'La demande de congé n\'appartient pas à cet employé' });
    }

    // Si le congé était approuvé, restaurer le solde
    if (leave.status === 'APPROVED' && leave.type === 'PAID_LEAVE') {
      const currentYear = new Date().getFullYear();
      await restoreLeaveBalance(employeeId, leave.days, currentYear);
    }

    await prisma.leave.delete({ where: { id: leaveId } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Demande de congé non trouvée' });
    }
    console.error('Erreur lors de la suppression du congé:', error);
    res.status(500).json({ error: 'Échec de la suppression de la demande de congé' });
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
          totalDays: DEFAULT_ANNUAL_LEAVE_DAYS,
          usedDays: 0,
          remainingDays: DEFAULT_ANNUAL_LEAVE_DAYS,
        },
      });
      balances = [defaultBalance];
    }

    res.json(balances);
  } catch (error) {
    console.error('Erreur lors de la récupération des soldes de congés:', error);
    res.status(500).json({ error: 'Échec de la récupération des soldes de congés' });
  }
});

export default router;
