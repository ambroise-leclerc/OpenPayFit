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
import Database from 'better-sqlite3';
import path from 'path';

const router = express.Router();
const dbPath = path.join(__dirname, '../../prisma/dev.db');

/**
 * Vérifie si l'utilisateur est propriétaire de l'entreprise
 */
function isCompanyOwner(companyId: string, userId: string): boolean {
  const db = new Database(dbPath, { readonly: true });

  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM Company
      WHERE id = ? AND ownerId = ?
    `).get(companyId, userId) as { count: number };

    return result.count > 0;
  } finally {
    db.close();
  }
}

/**
 * POST /api/payroll/run
 * Lance le calcul de paie pour une entreprise et une période donnée
 */
router.post('/run', authenticateToken, (req: Request, res: Response) => {
  const { companyId, period } = req.body;
  const userId = (req as any).userId;

  // Validation des paramètres
  if (!companyId || !period) {
    return res.status(400).json({
      error: 'Les paramètres companyId et period sont requis'
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
  const userId = (req as any).userId;

  // Validation du paramètre companyId
  if (!companyId || typeof companyId !== 'string') {
    return res.status(400).json({
      error: 'Le paramètre companyId est requis'
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
  const userId = (req as any).userId;

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

export default router;
