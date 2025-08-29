import { Router } from 'express';
import prisma from '../lib/db';
import { authenticateToken } from '../middleware/auth';
import { calculatePayroll } from '../services/payrollService';

const router = Router();

// POST /api/payroll/run
// Body: { companyId: string, month: number, year: number, hours: { [employeeId: string]: { normalHours: number, overtimeHours: number } } }
router.post('/run', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { companyId, month, year, hours } = req.body;
  const userId = req.user.id;

  if (!companyId || !month || !year || !hours) {
    return res.status(400).json({ error: 'Les paramètres companyId, month, year, et hours sont requis.' });
  }

  try {
    // 1. Verify user owns the company
    const company = await prisma.company.findFirst({
      where: { id: companyId, ownerId: userId },
      include: { employees: true },
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée ou non autorisée.' });
    }

    // 2. Calculate and save payslips for each employee
    const payslips = [];
    for (const employee of company.employees) {
      const employeeHours = hours[employee.id];
      if (!employeeHours) {
        // Skip employee if no hours are provided for them
        continue;
      }

      const { normalHours, overtimeHours } = employeeHours;

      const payrollResult = calculatePayroll({
        employee,
        normalHoursWorked: normalHours,
        overtimeHoursWorked: overtimeHours,
      });

      const periodStartDate = new Date(year, month - 1, 1);
      const periodEndDate = new Date(year, month, 0);

      const newPayslip = await prisma.payslip.create({
        data: {
          employeeId: employee.id,
          periodStartDate,
          periodEndDate,
          normalHoursWorked: normalHours,
          overtimeHoursWorked: overtimeHours,
          grossSalary: payrollResult.grossSalary,
          netSalary: payrollResult.netSalary,
          totalContributions: payrollResult.totalContributions,
        },
      });
      payslips.push(newPayslip);
    }

    res.status(201).json({ message: `${payslips.length} fiches de paie créées avec succès.`, payslips });

  } catch (error) {
    console.error('Erreur lors du calcul de la paie:', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
