// backend/src/tests/expense-reports.api.test.ts
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
  compagnieId: string;
}

interface ExpenseReport {
  id: string;
  employeeId: string;
  title: string;
  status: string;
  totalAmount: number;
}

interface ExpenseItem {
  id: string;
  reportId: string;
  category: string;
  amount: number;
  date: string;
  description: string;
}

describe.skip('Expense Reports API Endpoints (requires Prisma - skipped in CI)', () => {
  let db: DatabaseType;
  let user1: User, user2: User, company1: Company, company2: Company, token1: string, token2: string;
  let employee1: Employee, employee2: Employee;
  let report1: ExpenseReport;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyage de la DB de test
    db.exec('DELETE FROM expense_items');
    db.exec('DELETE FROM expense_reports');
    db.exec('DELETE FROM Employe');
    db.exec('DELETE FROM Compagnie');
    db.exec('DELETE FROM Utilisateur');

    // Création de 2 utilisateurs
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    db.prepare(`INSERT INTO Utilisateur (id, email, motDePasse, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user1Id, 'user1@test.com', 'p1');
    db.prepare(`INSERT INTO Utilisateur (id, email, motDePasse, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user2Id, 'user2@test.com', 'p2');

    user1 = { id: user1Id, email: 'user1@test.com' };
    user2 = { id: user2Id, email: 'user2@test.com' };

    // Création de 2 entreprises
    const company1Id = randomUUID();
    const company2Id = randomUUID();
    db.prepare(`INSERT INTO Compagnie (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company1Id, 'Company 1', user1.id);
    db.prepare(`INSERT INTO Compagnie (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company2Id, 'Company 2', user2.id);

    company1 = { id: company1Id, nom: 'Company 1', proprietaireId: user1.id };
    company2 = { id: company2Id, nom: 'Company 2', proprietaireId: user2.id };

    // Création d'employés
    const employee1Id = randomUUID();
    const employee2Id = randomUUID();
    db.prepare(`INSERT INTO Employe (id, prenom, nom, email, salaireBrut, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(employee1Id, 'John', 'Doe', 'john.doe@company1.com', 50000, company1.id);
    db.prepare(`INSERT INTO Employe (id, prenom, nom, email, salaireBrut, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(employee2Id, 'Jane', 'Smith', 'jane.smith@company2.com', 60000, company2.id);

    employee1 = { id: employee1Id, prenom: 'John', nom: 'Doe', email: 'john.doe@company1.com', compagnieId: company1.id };
    employee2 = { id: employee2Id, prenom: 'Jane', nom: 'Smith', email: 'jane.smith@company2.com', compagnieId: company2.id };

    // Génération de tokens JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET);

    db.close();
  });

  afterAll(() => {
    // Pas de déconnexion nécessaire pour better-sqlite3
  });

  describe('POST /api/companies/:companyId/expense-reports', () => {
    it('should create a new expense report without items', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: employee1.id,
          title: 'Déplacement Paris - Novembre 2025',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toBe('Déplacement Paris - Novembre 2025');
      expect(res.body.totalAmount).toBe(0);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.employee).toBeDefined();
      report1 = res.body;
    });

    it('should create a new expense report with items', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: employee1.id,
          title: 'Déplacement Lyon - Novembre 2025',
          items: [
            {
              category: 'TRANSPORT',
              amount: 85.50,
              date: '2025-11-10',
              description: 'Train Paris-Lyon',
            },
            {
              category: 'MEAL',
              amount: 25.00,
              date: '2025-11-10',
              description: 'Déjeuner client',
            },
          ],
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.totalAmount).toBe(110.50);
      expect(res.body.items).toHaveLength(2);
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          employeeId: employee1.id,
          title: 'Déplacement Test',
        });
      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if employee does not belong to the company', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: employee2.id,
          title: 'Déplacement Test',
        });
      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          employeeId: employee1.id,
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/companies/:companyId/expense-reports', () => {
    it('should return all expense reports for a company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should filter expense reports by status', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/expense-reports?status=PENDING`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((report: ExpenseReport) => {
        expect(report.status).toBe('PENDING');
      });
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/expense-reports`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/companies/:companyId/expense-reports/:reportId', () => {
    it('should return a specific expense report', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/expense-reports/${report1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(report1.id);
      expect(res.body.title).toBe(report1.title);
    });

    it('should return 404 if report does not exist', async () => {
      const fakeId = randomUUID();
      const res = await request(app)
        .get(`/api/companies/${company1.id}/expense-reports/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/companies/:companyId/expense-reports/:reportId', () => {
    it('should update an expense report', async () => {
      const res = await request(app)
        .put(`/api/companies/${company1.id}/expense-reports/${report1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Déplacement Paris - Mise à jour',
          status: 'APPROVED',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe('Déplacement Paris - Mise à jour');
      expect(res.body.status).toBe('APPROVED');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .put(`/api/companies/${company1.id}/expense-reports/${report1.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'Nouvelle titre' });
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('POST /api/companies/:companyId/expense-reports/:reportId/items', () => {
    it('should add an item to an expense report', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports/${report1.id}/items`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          category: 'ACCOMMODATION',
          amount: 120.00,
          date: '2025-11-15',
          description: 'Hôtel Paris',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.amount).toBe(120.00);
      expect(res.body.category).toBe('ACCOMMODATION');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/expense-reports/${report1.id}/items`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          category: 'TRANSPORT',
          amount: 50,
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('DELETE /api/companies/:companyId/expense-reports/:reportId', () => {
    it('should delete an expense report', async () => {
      const res = await request(app)
        .delete(`/api/companies/${company1.id}/expense-reports/${report1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(204);
    });

    it('should return 404 if trying to delete a non-existent report', async () => {
      const fakeId = randomUUID();
      const res = await request(app)
        .delete(`/api/companies/${company1.id}/expense-reports/${fakeId}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(404);
    });
  });
});
