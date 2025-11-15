// backend/src/tests/employees.api.test.ts
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
  name: string;
  ownerId: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grossSalary: number;
  companyId: string;
}

describe.skip('Employee API Endpoints (requires Prisma - skipped in CI)', () => {
  let db: DatabaseType;
  let user1: User, user2: User, company1: Company, company2: Company, token1: string, token2: string, employee1: Employee;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyage de la DB de test
    db.exec('DELETE FROM Employee');
    db.exec('DELETE FROM Company');
    db.exec('DELETE FROM User');

    // Création de 2 utilisateurs
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    db.prepare(`INSERT INTO User (id, email, password, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user1Id, 'user1@test.com', 'p1');
    db.prepare(`INSERT INTO User (id, email, password, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user2Id, 'user2@test.com', 'p2');

    user1 = { id: user1Id, email: 'user1@test.com' };
    user2 = { id: user2Id, email: 'user2@test.com' };

    // Création de 2 entreprises
    const company1Id = randomUUID();
    const company2Id = randomUUID();
    db.prepare(`INSERT INTO Company (id, name, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company1Id, 'Company 1', user1.id);
    db.prepare(`INSERT INTO Company (id, name, ownerId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company2Id, 'Company 2', user2.id);

    company1 = { id: company1Id, name: 'Company 1', ownerId: user1.id };
    company2 = { id: company2Id, name: 'Company 2', ownerId: user2.id };

    // Génération de tokens JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET);

    db.close();
  });

  afterAll(() => {
    // Pas de déconnexion nécessaire pour better-sqlite3
  });

  describe('POST /api/companies/:companyId/employees', () => {
    it('should create a new employee for the owner of the company', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@company1.com',
          grossSalary: 50000,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.firstName).toBe('John');
      employee1 = res.body; // Sauvegarde pour les tests suivants
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${token2}`) // token de user2
        .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@company1.com', grossSalary: 60000 });
      expect(res.statusCode).toEqual(403);
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).post(`/api/companies/${company1.id}/employees`);
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/companies/:companyId/employees', () => {
    it('should return the list of employees for the company owner', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].email).toBe('john.doe@company1.com');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.statusCode).toEqual(403);
    });
  });
  
  describe('PUT /api/companies/:companyId/employees/:employeeId', () => {
    it('should update an employee', async () => {
      const res = await request(app)
        .put(`/api/companies/${company1.id}/employees/${employee1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ grossSalary: 55000 });
      expect(res.statusCode).toEqual(200);
      expect(res.body.grossSalary).toBe(55000);
    });
  });

  describe('DELETE /api/companies/:companyId/employees/:employeeId', () => {
    it('should delete an employee', async () => {
      const res = await request(app)
        .delete(`/api/companies/${company1.id}/employees/${employee1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(204);
    });

    it("should return 403 if user tries to delete an employee from another user's company", async () => {
        // Re-create an employee for the test
        const tempDb = new Database(dbPath);
        const tempEmployeeId = randomUUID();
        tempDb.prepare(`INSERT INTO Employee (id, firstName, lastName, email, grossSalary, companyId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
          .run(tempEmployeeId, 'Temp', 'Emp', 'temp@del.com', 1, company2.id);
        tempDb.close();

        const res = await request(app)
            .delete(`/api/companies/${company2.id}/employees/${tempEmployeeId}`)
            .set('Authorization', `Bearer ${token1}`); // User 1 token
        expect(res.statusCode).toEqual(403);
    });
  });
});