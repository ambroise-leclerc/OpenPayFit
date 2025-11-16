/**
 * Routes API pour le module de paie
 */

import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  runPayroll,
  getPayslipsByPeriod,
  getAllPayslips,
  getPayslipById,
  isPayslipOwner,
  validatePayPeriod
} from '../lib/payroll';
import { generatePayslipPDF, PayslipWithEmployee } from '../lib/pdfGenerator';
import Database from 'better-sqlite3';
import path from 'path';

const router = express.Router();

// Utiliser la base de données appropriée selon l'environnement
const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
const dbPath = path.join(__dirname, '../../prisma', dbFileName);

// Singleton pour la connexion à la base de données
let dbInstance: Database.Database | null = null;

function getDatabase(readonly: boolean = false): Database.Database {
  if (!dbInstance || !dbInstance.open) {
    dbInstance = new Database(dbPath, { readonly });
  }
  return dbInstance;
}

/**
 * Vérifie si l'utilisateur est propriétaire de l'entreprise
 */
function isCompanyOwner(companyId: string, userId: string): boolean {
  const db = getDatabase(true);

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM Company
    WHERE id = ? AND ownerId = ?
  `).get(companyId, userId) as { count: number };

  return result.count > 0;
}

/**
 * POST /api/payroll/run
 * Lance le calcul de paie pour une entreprise et une période donnée
 */
router.post('/run', authenticateToken, (req: Request, res: Response) => {
  const { companyId, period } = req.body;
  const userId = req.userId;

  // Validation des paramètres
  if (!companyId || !period) {
    return res.status(400).json({
      error: 'Les paramètres companyId et period sont requis'
    });
  }

  // S'assurer que userId est défini (devrait l'être après authenticateToken)
  if (!userId) {
    return res.status(401).json({
      error: 'Non autorisé'
    });
  }

  // Validation du format de la période
  if (!validatePayPeriod(period)) {
    return res.status(400).json({
      error: 'Format de période invalide. Attendu: YYYY-MM (ex: 2025-11)'
    });
  }

  // Vérifier que l'utilisateur est propriétaire de l'entreprise
  if (!isCompanyOwner(companyId, userId)) {
    return res.status(403).json({
      error: 'Accès interdit : vous n\'êtes pas propriétaire de cette entreprise'
    });
  }

  try {
    const result = runPayroll(companyId, period);

    if (result.status === 'error' && result.errors) {
      return res.status(400).json({
        status: result.status,
        payslipsGenerated: result.payslipsGenerated,
        errors: result.errors
      });
    }

    return res.status(200).json({
      status: result.status,
      payslipsGenerated: result.payslipsGenerated
    });
  } catch (error) {
    console.error('Erreur lors du calcul de paie:', error);
    return res.status(500).json({
      error: 'Erreur lors du calcul de paie'
    });
  }
});

/**
 * GET /api/payslips
 * Récupère les fiches de paie d'une entreprise (avec filtre optionnel par période)
 */
router.get('/', authenticateToken, (req: Request, res: Response) => {
  const { companyId, period } = req.query;
  const userId = req.userId;

  // Validation du paramètre companyId
  if (!companyId || typeof companyId !== 'string') {
    return res.status(400).json({
      error: 'Le paramètre companyId est requis'
    });
  }

  // S'assurer que userId est défini
  if (!userId) {
    return res.status(401).json({
      error: 'Non autorisé'
    });
  }

  // Vérifier que l'utilisateur est propriétaire de l'entreprise
  if (!isCompanyOwner(companyId, userId)) {
    return res.status(403).json({
      error: 'Accès interdit : vous n\'êtes pas propriétaire de cette entreprise'
    });
  }

  try {
    let payslips;

    if (period && typeof period === 'string') {
      // Validation du format de la période si fournie
      if (!validatePayPeriod(period)) {
        return res.status(400).json({
          error: 'Format de période invalide. Attendu: YYYY-MM (ex: 2025-11)'
        });
      }

      payslips = getPayslipsByPeriod(companyId, period);
    } else {
      payslips = getAllPayslips(companyId);
    }

    return res.status(200).json(payslips);
  } catch (error) {
    console.error('Erreur lors de la récupération des fiches de paie:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération des fiches de paie'
    });
  }
});

/**
 * GET /api/payslips/:id
 * Récupère une fiche de paie par son ID
 */
router.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  // S'assurer que userId est défini
  if (!userId) {
    return res.status(401).json({
      error: 'Non autorisé'
    });
  }

  try {
    const payslip = getPayslipById(id);

    if (!payslip) {
      return res.status(404).json({
        error: 'Fiche de paie non trouvée'
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise associée
    if (!isPayslipOwner(id, userId)) {
      return res.status(403).json({
        error: 'Accès interdit : vous n\'êtes pas autorisé à consulter cette fiche de paie'
      });
    }

    return res.status(200).json(payslip);
  } catch (error) {
    console.error('Erreur lors de la récupération de la fiche de paie:', error);
    return res.status(500).json({
      error: 'Erreur lors de la récupération de la fiche de paie'
    });
  }
});

/**
 * GET /api/payslips/:id/pdf
 * Génère et télécharge un PDF pour une fiche de paie
 */
router.get('/:id/pdf', authenticateToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  // S'assurer que userId est défini
  if (!userId) {
    return res.status(401).json({
      error: 'Non autorisé'
    });
  }

  try {
    // Récupérer la fiche de paie avec les informations complètes
    const db = getDatabase(true);

    const payslip = db.prepare(`
      SELECT
        p.id, p.payPeriod, p.grossSalary, p.deductions, p.netSalary, p.employeeId, p.createdAt,
        e.firstName as employeeFirstName,
        e.lastName as employeeLastName,
        e.email as employeeEmail,
        c.name as companyName
      FROM Payslip p
      INNER JOIN Employee e ON p.employeeId = e.id
      INNER JOIN Company c ON e.companyId = c.id
      WHERE p.id = ?
    `).get(id) as PayslipWithEmployee | undefined;

    if (!payslip) {
      return res.status(404).json({
        error: 'Fiche de paie non trouvée'
      });
    }

    // Vérifier que l'utilisateur est propriétaire de l'entreprise associée
    if (!isPayslipOwner(id, userId)) {
      return res.status(403).json({
        error: 'Accès interdit : vous n\'êtes pas autorisé à consulter cette fiche de paie'
      });
    }

    // Générer le PDF
    const pdfDoc = generatePayslipPDF(payslip);

    // Configurer les en-têtes de la réponse
    const filename = `fiche-paie-${payslip.employeeFirstName}-${payslip.employeeLastName}-${payslip.payPeriod}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe le PDF vers la réponse
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return res.status(500).json({
      error: 'Erreur lors de la génération du PDF'
    });
  }
});

export default router;
