/**
 * Module de calcul de paie MVP
 *
 * Ce module implémente une logique de calcul de paie simplifiée pour le MVP.
 * Calcul : net = brut - 25% (approximation des cotisations sociales)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

// Utiliser la base de données appropriée selon l'environnement
const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
const dbPath = path.join(__dirname, '../../prisma', dbFileName);

// Connections à la base de données (une pour lecture, une pour écriture)
let dbReadInstance: Database.Database | null = null;
let dbWriteInstance: Database.Database | null = null;

/**
 * Récupère ou crée une connexion à la base de données
 */
function getDatabase(readonly: boolean = false): Database.Database {
  if (readonly) {
    if (!dbReadInstance || !dbReadInstance.open) {
      dbReadInstance = new Database(dbPath, { readonly: true });
    }
    return dbReadInstance;
  } else {
    if (!dbWriteInstance || !dbWriteInstance.open) {
      dbWriteInstance = new Database(dbPath, { readonly: false });
    }
    return dbWriteInstance;
  }
}

/**
 * Ferme les connexions à la base de données (utile pour les tests)
 */
export function closeDatabaseConnection(): void {
  if (dbReadInstance && dbReadInstance.open) {
    dbReadInstance.close();
    dbReadInstance = null;
  }
  if (dbWriteInstance && dbWriteInstance.open) {
    dbWriteInstance.close();
    dbWriteInstance = null;
  }
}

// Types TypeScript pour les fiches de paie
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grossSalary: number;
  companyId: string;
}

export interface Payslip {
  id: string;
  payPeriod: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  employeeId: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollRunResult {
  status: 'success' | 'error';
  payslipsGenerated: number;
  errors?: string[];
}

/**
 * Taux de cotisations sociales pour le MVP (25% du salaire brut)
 */
const DEDUCTION_RATE = 0.25;

/**
 * Calcule les cotisations sociales à partir du salaire brut
 */
export function calculateDeductions(grossSalary: number): number {
  return Math.round(grossSalary * DEDUCTION_RATE * 100) / 100;
}

/**
 * Calcule le salaire net à partir du salaire brut
 */
export function calculateNetSalary(grossSalary: number): number {
  const deductions = calculateDeductions(grossSalary);
  return Math.round((grossSalary - deductions) * 100) / 100;
}

/**
 * Valide le format de la période de paie (YYYY-MM)
 */
export function validatePayPeriod(period: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(period);
}

/**
 * Récupère tous les employés d'une entreprise
 */
export function getCompanyEmployees(companyId: string): Employee[] {
  const db = getDatabase(true);

  const employees = db.prepare(`
    SELECT id, firstName, lastName, email, grossSalary, companyId
    FROM Employee
    WHERE companyId = ?
  `).all(companyId) as Employee[];

  return employees;
}

/**
 * Crée une fiche de paie pour un employé
 * @throws Error si une fiche de paie existe déjà pour cette période
 */
export function createPayslip(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Payslip {
  const db = getDatabase();

  const id = randomUUID();
  const deductions = calculateDeductions(grossSalary);
  const netSalary = calculateNetSalary(grossSalary);
  const createdAt = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO Payslip (id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt, createdAt);

    return {
      id,
      payPeriod,
      grossSalary,
      deductions,
      netSalary,
      employeeId,
      createdAt
    };
  } catch (error: any) {
    // Gérer les violations de contrainte unique
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Une fiche de paie existe déjà pour l'employé ${employeeId} pour la période ${payPeriod}`);
    }
    throw error;
  }
}

/**
 * Vérifie si une fiche de paie existe déjà pour un employé et une période donnée
 */
export function payslipExists(employeeId: string, payPeriod: string): boolean {
  const db = getDatabase(true);

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM Payslip
    WHERE employeeId = ? AND payPeriod = ?
  `).get(employeeId, payPeriod) as { count: number };

  return result.count > 0;
}

/**
 * Lance le calcul de paie pour tous les employés d'une entreprise
 */
export function runPayroll(companyId: string, payPeriod: string): PayrollRunResult {
  // Validation de la période
  if (!validatePayPeriod(payPeriod)) {
    return {
      status: 'error',
      payslipsGenerated: 0,
      errors: [`Format de période invalide: ${payPeriod}. Attendu: YYYY-MM`]
    };
  }

  const employees = getCompanyEmployees(companyId);

  if (employees.length === 0) {
    return {
      status: 'success',
      payslipsGenerated: 0,
      errors: ['Aucun employé trouvé pour cette entreprise']
    };
  }

  const errors: string[] = [];
  let generated = 0;

  for (const employee of employees) {
    try {
      // Créer la fiche de paie (gère automatiquement les doublons via contrainte unique)
      createPayslip(employee.id, payPeriod, employee.grossSalary);
      generated++;
    } catch (error) {
      errors.push(
        `${employee.firstName} ${employee.lastName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  return {
    status: errors.length === 0 ? 'success' : 'error',
    payslipsGenerated: generated,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Récupère toutes les fiches de paie d'une entreprise pour une période donnée
 */
export function getPayslipsByPeriod(companyId: string, payPeriod: string): Payslip[] {
  const db = getDatabase(true);

  const payslips = db.prepare(`
    SELECT p.id, p.payPeriod, p.grossSalary, p.deductions, p.netSalary, p.employeeId, e.firstName as employeeFirstName, e.lastName as employeeLastName, p.createdAt, p.updatedAt
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    WHERE e.companyId = ? AND p.payPeriod = ?
    ORDER BY p.createdAt DESC
  `).all(companyId, payPeriod) as Payslip[];

  return payslips;
}

/**
 * Récupère toutes les fiches de paie d'une entreprise
 */
export function getAllPayslips(companyId: string): Payslip[] {
  const db = getDatabase(true);

  const payslips = db.prepare(`
    SELECT p.id, p.payPeriod, p.grossSalary, p.deductions, p.netSalary, p.employeeId, e.firstName as employeeFirstName, e.lastName as employeeLastName, p.createdAt, p.updatedAt
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    WHERE e.companyId = ?
    ORDER BY p.payPeriod DESC, p.createdAt DESC
  `).all(companyId) as Payslip[];

  return payslips;
}

/**
 * Récupère une fiche de paie par son ID
 */
export function getPayslipById(id: string): Payslip | null {
  const db = getDatabase(true);

  const payslip = db.prepare(`
    SELECT id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt
    FROM Payslip
    WHERE id = ?
  `).get(id) as Payslip | undefined;

  return payslip || null;
}

/**
 * Vérifie si un utilisateur est propriétaire de l'entreprise associée à une fiche de paie
 */
export function isPayslipOwner(payslipId: string, userId: string): boolean {
  const db = getDatabase(true);

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    INNER JOIN Company c ON e.companyId = c.id
    WHERE p.id = ? AND c.ownerId = ?
  `).get(payslipId, userId) as { count: number };

  return result.count > 0;
}
