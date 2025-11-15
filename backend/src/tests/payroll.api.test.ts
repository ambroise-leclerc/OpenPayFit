// backend/src/tests/payroll.api.test.ts
import request from 'supertest';
import app from '../index';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET as string;
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
  const id = randomUUID();
  db.prepare(`
    INSERT INTO User (id, email, password, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, email, password);
  return id;
}

function createTestCompany(db: DatabaseType, name: string, ownerId: string): string {
  const id = randomUUID();
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
  const id = randomUUID();
  db.prepare(`
    INSERT INTO Employee (id, firstName, lastName, email, grossSalary, companyId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, firstName, lastName, email, grossSalary, companyId);
  return id;
}

describe('Payroll API Endpoints', () => {
  let db: DatabaseType;
  let user1Id: string;
  let user2Id: string;
  let company1Id: string;
  let company2Id: string;
  let employee1Id: string;
  let employee2Id: string;
  let token1: string;
  let token2: string;

  beforeAll(() => {
    db = setupTestDatabase();

    // Créer des utilisateurs de test
    user1Id = createTestUser(db, 'payroll-user1@test.com');
    user2Id = createTestUser(db, 'payroll-user2@test.com');

    // Créer des entreprises de test
    company1Id = createTestCompany(db, 'Payroll Company 1', user1Id);
    company2Id = createTestCompany(db, 'Payroll Company 2', user2Id);

    // Créer des employés pour company1
    employee1Id = createTestEmployee(db, 'Alice', 'Martin', 'alice@company1.com', 4000, company1Id);
    employee2Id = createTestEmployee(db, 'Bob', 'Durant', 'bob@company1.com', 5000, company1Id);

    // Créer un employé pour company2
    createTestEmployee(db, 'Charlie', 'Brown', 'charlie@company2.com', 3000, company2Id);

    db.close();

    // Générer des tokens JWT
    token1 = jwt.sign({ userId: user1Id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2Id }, JWT_SECRET);
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

  describe('POST /api/payslips/run', () => {
    it('should successfully run payroll for a company', async () => {
      const res = await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-11'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.payslipsGenerated).toBe(2);
      expect(res.body.errors).toBeUndefined();
    });

    it('should reject payroll run without authentication', async () => {
      const res = await request(app)
        .post('/api/payslips/run')
        .send({
          companyId: company1Id,
          period: '2025-10'
        });

      expect(res.statusCode).toEqual(401);
    });

    it('should reject payroll run for company not owned by user', async () => {
      const res = await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          companyId: company1Id,
          period: '2025-10'
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('interdit');
    });

    it('should reject payroll run with missing parameters', async () => {
      const res = await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id
          // period manquant
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('requis');
    });

    it('should reject payroll run with invalid period format', async () => {
      const res = await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: 'invalid-period'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Format de période invalide');
    });

    it('should return error when trying to generate duplicate payslips', async () => {
      // Générer les fiches de paie une première fois
      await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-10'
        });

      // Essayer de générer à nouveau pour la même période
      const res = await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-10'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.payslipsGenerated).toBe(0);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/payslips', () => {
    beforeAll(async () => {
      // Générer quelques fiches de paie pour les tests
      await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-09'
        });
    });

    it('should return all payslips for a company', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return payslips filtered by period', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id, period: '2025-09' })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // Vérifier que toutes les fiches sont pour la bonne période
      res.body.forEach((payslip: any) => {
        expect(payslip.payPeriod).toBe('2025-09');
      });
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id });

      expect(res.statusCode).toEqual(401);
    });

    it('should reject request for company not owned by user', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id })
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('interdit');
    });

    it('should reject request without companyId', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('requis');
    });

    it('should reject request with invalid period format', async () => {
      const res = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id, period: 'invalid' })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Format de période invalide');
    });
  });

  describe('GET /api/payslips/:id', () => {
    let payslipId: string;

    beforeAll(async () => {
      // Créer une fiche de paie pour les tests
      await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-08'
        });

      // Récupérer l'ID d'une fiche de paie
      const payslipsRes = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id, period: '2025-08' })
        .set('Authorization', `Bearer ${token1}`);

      payslipId = payslipsRes.body[0].id;
    });

    it('should return a payslip by its ID', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(payslipId);
      expect(res.body.payPeriod).toBe('2025-08');
      expect(res.body.grossSalary).toBeDefined();
      expect(res.body.netSalary).toBeDefined();
      expect(res.body.deductions).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}`);

      expect(res.statusCode).toEqual(401);
    });

    it('should reject request for payslip not owned by user', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('interdit');
    });

    it('should return 404 for non-existent payslip', async () => {
      const res = await request(app)
        .get(`/api/payslips/non-existent-id`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('non trouvée');
    });
  });

  describe('GET /api/payslips/:id/pdf', () => {
    let payslipId: string;

    beforeAll(async () => {
      // Créer une fiche de paie pour les tests
      await request(app)
        .post('/api/payslips/run')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          companyId: company1Id,
          period: '2025-10'
        });

      // Récupérer l'ID d'une fiche de paie
      const payslipsRes = await request(app)
        .get(`/api/payslips`)
        .query({ companyId: company1Id, period: '2025-10' })
        .set('Authorization', `Bearer ${token1}`);

      payslipId = payslipsRes.body[0].id;
    });

    it('should generate and return a PDF for a payslip', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.pdf');

      // Vérifier que le body contient des données (PDF)
      expect(res.body).toBeDefined();
      expect(Buffer.byteLength(res.body)).toBeGreaterThan(0);
    });

    it('should include employee name in PDF filename', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      // Vérifier que le filename contient les éléments de base d'une fiche de paie
      expect(res.headers['content-disposition']).toContain('fiche-paie');
      expect(res.headers['content-disposition']).toContain('2025-10');
      expect(res.headers['content-disposition']).toContain('.pdf');
      // Le fichier devrait contenir un nom d'employé (Alice ou Bob selon l'ordre)
      const hasEmployeeName =
        res.headers['content-disposition'].includes('Alice') ||
        res.headers['content-disposition'].includes('Bob');
      expect(hasEmployeeName).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}/pdf`);

      expect(res.statusCode).toEqual(401);
    });

    it('should reject request for payslip not owned by user', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('interdit');
    });

    it('should return 404 for non-existent payslip', async () => {
      const res = await request(app)
        .get(`/api/payslips/non-existent-id/pdf`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toContain('non trouvée');
    });

    it('[MANUEL] should generate a real PDF file for manual inspection', async () => {
      const res = await request(app)
        .get(`/api/payslips/${payslipId}/pdf`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toBe('application/pdf');

      // Créer le dossier de sortie s'il n'existe pas
      const outputDir = path.join(__dirname, '../../test-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Sauvegarder le PDF dans un fichier
      const outputPath = path.join(outputDir, 'fiche-paie-test-manuel.pdf');
      fs.writeFileSync(outputPath, res.body);

      // Afficher le chemin pour l'utilisateur
      console.log('\n📄 PDF généré pour inspection manuelle :');
      console.log(`   ${outputPath}`);
      console.log('   Ouvrez ce fichier pour vérifier la mise en forme\n');

      // Vérifier que le fichier existe et a une taille raisonnable
      const stats = fs.statSync(outputPath);
      expect(stats.size).toBeGreaterThan(1000); // Au moins 1KB
      expect(stats.size).toBeLessThan(1000000); // Moins de 1MB
    });
  });
});
