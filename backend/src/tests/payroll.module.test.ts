// backend/src/tests/payroll.module.test.ts
import {
  calculateDeductions,
  calculateNetSalary,
  validatePayPeriod,
  createPayslip,
  payslipExists,
  runPayroll,
  getPayslipsByPeriod,
  getAllPayslips,
  getPayslipById,
  getCompanyEmployees
} from '../lib/payroll';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

const dbPath = path.join(__dirname, '../../prisma/test.db');

/**
 * Utilitaires pour les tests
 */
function setupTestDatabase() {
  const db = new Database(dbPath);

  // Nettoyer les tables
  db.exec(`DELETE FROM Payslip`);
  db.exec(`DELETE FROM Employee`);
  db.exec(`DELETE FROM Company`);
  db.exec(`DELETE FROM User`);

  return db;
}

function createTestUser(db: DatabaseType, email: string, password: string = 'password123'): string {
  const id = createId();
  db.prepare(`
    INSERT INTO User (id, email, password, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, email, password);
  return id;
}

function createTestCompany(db: DatabaseType, name: string, ownerId: string): string {
  const id = createId();
  db.prepare(`
    INSERT INTO Company (id, name, ownerId, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, name, ownerId);
  return id;
}

function createTestEmployee(
  db: DatabaseType,
  firstName: string,
  lastName: string,
  email: string,
  grossSalary: number,
  companyId: string
): string {
  const id = createId();
  db.prepare(`
    INSERT INTO Employee (id, firstName, lastName, email, grossSalary, companyId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, firstName, lastName, email, grossSalary, companyId);
  return id;
}

describe('Payroll Module Tests', () => {
  let db: DatabaseType;
  let userId: string;
  let companyId: string;
  let employeeId1: string;
  let employeeId2: string;

  beforeAll(() => {
    db = setupTestDatabase();

    // Créer des données de test
    userId = createTestUser(db, 'test@example.com');
    companyId = createTestCompany(db, 'Test Company', userId);
    employeeId1 = createTestEmployee(db, 'John', 'Doe', 'john@test.com', 4000, companyId);
    employeeId2 = createTestEmployee(db, 'Jane', 'Smith', 'jane@test.com', 5000, companyId);

    db.close();
  });

  afterAll(() => {
    // Nettoyage final
    const cleanupDb = new Database(dbPath);
    cleanupDb.exec(`DELETE FROM Payslip`);
    cleanupDb.exec(`DELETE FROM Employee`);
    cleanupDb.exec(`DELETE FROM Company`);
    cleanupDb.exec(`DELETE FROM User`);
    cleanupDb.close();
  });

  describe('calculateDeductions', () => {
    it('should calculate 25% deductions correctly', () => {
      expect(calculateDeductions(4000)).toBe(1000);
      expect(calculateDeductions(5000)).toBe(1250);
      expect(calculateDeductions(3000)).toBe(750);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateDeductions(3333.33)).toBe(833.33);
    });
  });

  describe('calculateNetSalary', () => {
    it('should calculate net salary correctly', () => {
      expect(calculateNetSalary(4000)).toBe(3000);
      expect(calculateNetSalary(5000)).toBe(3750);
    });

    it('should round to 2 decimal places', () => {
      const net = calculateNetSalary(3333.33);
      expect(net).toBe(2500); // 3333.33 - 833.33 = 2500
    });
  });

  describe('validatePayPeriod', () => {
    it('should validate correct period formats', () => {
      expect(validatePayPeriod('2025-11')).toBe(true);
      expect(validatePayPeriod('2024-01')).toBe(true);
      expect(validatePayPeriod('2025-12')).toBe(true);
    });

    it('should reject invalid period formats', () => {
      expect(validatePayPeriod('2025-13')).toBe(false); // Mois invalide
      expect(validatePayPeriod('2025-00')).toBe(false); // Mois invalide
      expect(validatePayPeriod('25-11')).toBe(false); // Année courte
      expect(validatePayPeriod('2025/11')).toBe(false); // Mauvais séparateur
      expect(validatePayPeriod('2025-1')).toBe(false); // Mois sans zéro
      expect(validatePayPeriod('invalid')).toBe(false);
    });
  });

  describe('createPayslip', () => {
    it('should create a payslip with correct calculations', () => {
      const payslip = createPayslip(employeeId1, '2025-11', 4000);

      expect(payslip.employeeId).toBe(employeeId1);
      expect(payslip.payPeriod).toBe('2025-11');
      expect(payslip.grossSalary).toBe(4000);
      expect(payslip.deductions).toBe(1000);
      expect(payslip.netSalary).toBe(3000);
      expect(payslip.id).toBeTruthy();
      expect(payslip.createdAt).toBeTruthy();
    });
  });

  describe('payslipExists', () => {
    it('should return true if payslip exists', () => {
      createPayslip(employeeId1, '2025-10', 4000);
      expect(payslipExists(employeeId1, '2025-10')).toBe(true);
    });

    it('should return false if payslip does not exist', () => {
      expect(payslipExists(employeeId2, '2025-10')).toBe(false);
    });
  });

  describe('getCompanyEmployees', () => {
    it('should return all employees of a company', () => {
      const employees = getCompanyEmployees(companyId);

      expect(employees.length).toBe(2);
      expect(employees[0].companyId).toBe(companyId);
      expect(employees[1].companyId).toBe(companyId);
    });

    it('should return empty array for non-existent company', () => {
      const employees = getCompanyEmployees('non-existent-id');
      expect(employees.length).toBe(0);
    });
  });

  describe('runPayroll', () => {
    it('should generate payslips for all employees', () => {
      const result = runPayroll(companyId, '2025-09');

      expect(result.status).toBe('success');
      expect(result.payslipsGenerated).toBe(2);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid period format', () => {
      const result = runPayroll(companyId, 'invalid-period');

      expect(result.status).toBe('error');
      expect(result.payslipsGenerated).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Format de période invalide');
    });

    it('should not create duplicate payslips', () => {
      // Première génération
      const result1 = runPayroll(companyId, '2025-08');
      expect(result1.payslipsGenerated).toBe(2);

      // Tentative de régénération pour la même période
      const result2 = runPayroll(companyId, '2025-08');
      expect(result2.status).toBe('error');
      expect(result2.payslipsGenerated).toBe(0);
      expect(result2.errors).toBeDefined();
      expect(result2.errors!.length).toBeGreaterThan(0);
    });

    it('should handle company with no employees', () => {
      const emptyCompanyId = createTestCompany(
        new Database(dbPath),
        'Empty Company',
        userId
      );

      const result = runPayroll(emptyCompanyId, '2025-11');

      expect(result.status).toBe('success');
      expect(result.payslipsGenerated).toBe(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Aucun employé trouvé');

      // Nettoyage
      const cleanupDb = new Database(dbPath);
      cleanupDb.prepare('DELETE FROM Company WHERE id = ?').run(emptyCompanyId);
      cleanupDb.close();
    });
  });

  describe('getPayslipsByPeriod', () => {
    beforeAll(() => {
      // Créer quelques fiches de paie pour les tests
      createPayslip(employeeId1, '2025-07', 4000);
      createPayslip(employeeId2, '2025-07', 5000);
    });

    it('should return payslips for a specific period', () => {
      const payslips = getPayslipsByPeriod(companyId, '2025-07');

      expect(payslips.length).toBe(2);
      expect(payslips[0].payPeriod).toBe('2025-07');
      expect(payslips[1].payPeriod).toBe('2025-07');
    });

    it('should return empty array for period with no payslips', () => {
      const payslips = getPayslipsByPeriod(companyId, '2025-06');
      expect(payslips.length).toBe(0);
    });
  });

  describe('getAllPayslips', () => {
    it('should return all payslips for a company', () => {
      const payslips = getAllPayslips(companyId);

      expect(payslips.length).toBeGreaterThan(0);
      // Vérifier que tous les payslips appartiennent à des employés de l'entreprise
      const employeeIds = [employeeId1, employeeId2];
      payslips.forEach(payslip => {
        expect(employeeIds).toContain(payslip.employeeId);
      });
    });

    it('should return payslips ordered by period and creation date', () => {
      const payslips = getAllPayslips(companyId);

      // Vérifier l'ordre décroissant des périodes
      for (let i = 1; i < payslips.length; i++) {
        expect(payslips[i - 1].payPeriod >= payslips[i].payPeriod).toBe(true);
      }
    });
  });

  describe('getPayslipById', () => {
    it('should return a payslip by its ID', () => {
      const created = createPayslip(employeeId1, '2025-06', 4000);
      const fetched = getPayslipById(created.id);

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.employeeId).toBe(employeeId1);
      expect(fetched!.grossSalary).toBe(4000);
    });

    it('should return null for non-existent ID', () => {
      const payslip = getPayslipById('non-existent-id');
      expect(payslip).toBeNull();
    });
  });
});
