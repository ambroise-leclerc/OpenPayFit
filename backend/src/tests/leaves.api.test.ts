// backend/src/tests/leaves.api.test.ts
import request from 'supertest';
import app from '../index';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET as string;
const dbPath = path.join(__dirname, '../../prisma/test.db');

interface User {
  id: string;
  email: string;
}

interface Company {
  id: string;
  nom: string;
  proprietaireId: string;
}

interface Employee {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  salaireBrut: number;
  compagnieId: string;
}

interface Leave {
  id: string;
  employeeId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}

describe.skip('Leave API Endpoints (requires Prisma - skipped in CI)', () => {
  let db: DatabaseType;
  let user1: User, user2: User;
  let company1: Company, company2: Company;
  let employee1: Employee, employee2: Employee;
  let token1: string, token2: string;
  let leave1: Leave;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyage de la DB de test
    db.exec('DELETE FROM leave_balances');
    db.exec('DELETE FROM leaves');
    db.exec('DELETE FROM Employee');
    db.exec('DELETE FROM Company');
    db.exec('DELETE FROM User');

    // Création de 2 utilisateurs
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    db.prepare(`INSERT INTO User (id, email, motDePasse, createdAt, updatedAt, role) VALUES (?, ?, ?, datetime('now'), datetime('now'), 'USER')`)
      .run(user1Id, 'user1@test.com', 'p1');
    db.prepare(`INSERT INTO User (id, email, motDePasse, createdAt, updatedAt, role) VALUES (?, ?, ?, datetime('now'), datetime('now'), 'USER')`)
      .run(user2Id, 'user2@test.com', 'p2');

    user1 = { id: user1Id, email: 'user1@test.com' };
    user2 = { id: user2Id, email: 'user2@test.com' };

    // Création de 2 entreprises
    const company1Id = randomUUID();
    const company2Id = randomUUID();
    db.prepare(`INSERT INTO Company (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company1Id, 'Company 1', user1.id);
    db.prepare(`INSERT INTO Company (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company2Id, 'Company 2', user2.id);

    company1 = { id: company1Id, nom: 'Company 1', proprietaireId: user1.id };
    company2 = { id: company2Id, nom: 'Company 2', proprietaireId: user2.id };

    // Création de 2 employés
    const employee1Id = randomUUID();
    const employee2Id = randomUUID();
    db.prepare(`INSERT INTO Employee (id, prenom, nom, email, salaireBrut, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(employee1Id, 'John', 'Doe', 'john.doe@company1.com', 50000, company1.id);
    db.prepare(`INSERT INTO Employee (id, prenom, nom, email, salaireBrut, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(employee2Id, 'Jane', 'Smith', 'jane.smith@company2.com', 55000, company2.id);

    employee1 = { id: employee1Id, prenom: 'John', nom: 'Doe', email: 'john.doe@company1.com', salaireBrut: 50000, compagnieId: company1.id };
    employee2 = { id: employee2Id, prenom: 'Jane', nom: 'Smith', email: 'jane.smith@company2.com', salaireBrut: 55000, compagnieId: company2.id };

    // Génération de tokens JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET);

    db.close();
  });

  afterAll(() => {
    // Pas de déconnexion nécessaire pour better-sqlite3
  });

  describe('POST /api/companies/:companyId/employees/:employeeId/leaves', () => {
    it('should create a new leave request for an employee', async () => {
      const startDate = new Date('2025-12-01').toISOString();
      const endDate = new Date('2025-12-05').toISOString();

      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'PAID_LEAVE',
          startDate,
          endDate,
          days: 5,
          reason: 'Vacances de Noël',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.type).toBe('PAID_LEAVE');
      expect(res.body.days).toBe(5);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.reason).toBe('Vacances de Noël');
      leave1 = res.body; // Sauvegarde pour les tests suivants
    });

    it('should return 403 if user does not own the company', async () => {
      const startDate = new Date('2025-12-01').toISOString();
      const endDate = new Date('2025-12-05').toISOString();

      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token2}`) // token de user2
        .send({
          type: 'PAID_LEAVE',
          startDate,
          endDate,
          days: 5,
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'PAID_LEAVE',
          // Manque startDate, endDate, days
        });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if start date is after end date', async () => {
      const startDate = new Date('2025-12-10').toISOString();
      const endDate = new Date('2025-12-05').toISOString();

      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'PAID_LEAVE',
          startDate,
          endDate,
          days: 5,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Start date must be before end date');
    });

    it('should return 400 if insufficient leave balance', async () => {
      // Créer une demande de congé qui dépasse le solde disponible
      const startDate = new Date('2026-01-01').toISOString();
      const endDate = new Date('2026-02-01').toISOString();

      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'PAID_LEAVE',
          startDate,
          endDate,
          days: 30, // Plus que les 25 jours par défaut
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Insufficient leave balance');
    });
  });

  describe('GET /api/companies/:companyId/employees/:employeeId/leaves', () => {
    it('should get all leaves for an employee', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('PUT /api/companies/:companyId/employees/:employeeId/leaves/:leaveId', () => {
    it('should update a leave request status to APPROVED', async () => {
      const res = await request(app)
        .put(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${leave1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('APPROVED');
    });

    it('should update a leave request status to REJECTED', async () => {
      // Créer une nouvelle demande pour la rejeter
      const startDate = new Date('2025-12-15').toISOString();
      const endDate = new Date('2025-12-20').toISOString();

      const createRes = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'PAID_LEAVE',
          startDate,
          endDate,
          days: 5,
        });

      const leaveId = createRes.body.id;

      const res = await request(app)
        .put(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          status: 'REJECTED',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('REJECTED');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .put(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${leave1.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if leave request not found', async () => {
      const fakeLeaveId = randomUUID();
      const res = await request(app)
        .put(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${fakeLeaveId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/companies/:companyId/employees/:employeeId/leaves/:leaveId', () => {
    it('should delete a leave request', async () => {
      // Créer une nouvelle demande pour la supprimer
      const startDate = new Date('2025-12-25').toISOString();
      const endDate = new Date('2025-12-30').toISOString();

      const createRes = await request(app)
        .post(`/api/companies/${company1.id}/employees/${employee1.id}/leaves`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          type: 'SICK_LEAVE',
          startDate,
          endDate,
          days: 5,
        });

      const leaveId = createRes.body.id;

      const res = await request(app)
        .delete(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(204);
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .delete(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${leave1.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if leave request not found', async () => {
      const fakeLeaveId = randomUUID();
      const res = await request(app)
        .delete(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/${fakeLeaveId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/companies/:companyId/employees/:employeeId/leaves/balances', () => {
    it('should get leave balances for an employee', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/balances`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Vérifier qu'un solde de congés payés existe
      const paidLeaveBalance = res.body.find((b: any) => b.type === 'PAID_LEAVE');
      expect(paidLeaveBalance).toBeDefined();
      expect(paidLeaveBalance.totalDays).toBe(25);
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees/${employee1.id}/leaves/balances`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should create default leave balance if none exists', async () => {
      const res = await request(app)
        .get(`/api/companies/${company2.id}/employees/${employee2.id}/leaves/balances`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('PAID_LEAVE');
      expect(res.body[0].totalDays).toBe(25);
      expect(res.body[0].usedDays).toBe(0);
      expect(res.body[0].remainingDays).toBe(25);
    });
  });
});
