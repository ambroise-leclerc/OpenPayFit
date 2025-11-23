// backend/src/tests/payroll.module.test.ts
import {
  validatePayPeriod,
  payslipExists,
  getPayslipsByPeriod,
  getAllPayslips,
  getPayslipById,
  getCompanyEmployees
} from '../lib/payroll';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

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

function createTestUser(db: DatabaseType, email: string, motDePasse: string = 'password123'): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO User (id, email, password, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, email, motDePasse);
  return id;
}

function createTestCompany(db: DatabaseType, nom: string, proprietaireId: string): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO Company (id, name, ownerId, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, nom, proprietaireId);
  return id;
}

function createTestEmployee(
  db: DatabaseType,
  prenom: string,
  nom: string,
  email: string,
  salaireBrut: number,
  compagnieId: string
): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO Employee (id, firstName, lastName, email, grossSalary, companyId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, prenom, nom, email, salaireBrut, compagnieId);
  return id;
}

function createTestPayslip(
  db: DatabaseType,
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): string {
  const id = randomUUID();
  const deductions = Math.round(grossSalary * 0.25 * 100) / 100;
  const netSalary = Math.round((grossSalary - deductions) * 100) / 100;
  db.prepare(`
    INSERT INTO Payslip (id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, payPeriod, grossSalary, deductions, netSalary, employeeId);
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

  describe('payslipExists', () => {
    it('should return true if payslip exists', () => {
      const testDb = new Database(dbPath);
      createTestPayslip(testDb, employeeId1, '2025-10', 4000);
      testDb.close();
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

  describe('getPayslipsByPeriod', () => {
    beforeAll(() => {
      // Créer quelques fiches de paie pour les tests
      const testDb = new Database(dbPath);
      createTestPayslip(testDb, employeeId1, '2025-07', 4000);
      createTestPayslip(testDb, employeeId2, '2025-07', 5000);
      testDb.close();
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
      const testDb = new Database(dbPath);
      const createdId = createTestPayslip(testDb, employeeId1, '2025-06', 4000);
      testDb.close();

      const fetched = getPayslipById(createdId);

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(createdId);
      expect(fetched!.employeeId).toBe(employeeId1);
      expect(fetched!.grossSalary).toBe(4000);
    });

    it('should return null for non-existent ID', () => {
      const payslip = getPayslipById('non-existent-id');
      expect(payslip).toBeNull();
    });
  });
});
