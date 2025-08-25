// backend/src/tests/employees.api.test.ts
import request from 'supertest';
import app from '../index'; // On importe l'app Express
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';
import { User, Company, Employee } from '../generated/prisma';

// Le secret JWT doit être le même que dans le middleware
const JWT_SECRET = process.env.JWT_SECRET as string;

describe('Employee API Endpoints', () => {
  let user1: User, user2: User, company1: Company, company2: Company, token1: string, token2: string, employee1: Employee;

  beforeAll(async () => {
    // Nettoyage de la DB de test
    await prisma.employee.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();

    // Création de 2 utilisateurs et 2 entreprises
    user1 = await prisma.user.create({ data: { email: 'user1@test.com', password: 'p1' } });
    user2 = await prisma.user.create({ data: { email: 'user2@test.com', password: 'p2' } });
    company1 = await prisma.company.create({ data: { name: 'Company 1', ownerId: user1.id } });
    company2 = await prisma.company.create({ data: { name: 'Company 2', ownerId: user2.id } });

    // Génération de tokens JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
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

    it('should return 403 if user tries to delete an employee from another user\'s company', async () => {
        // Re-create an employee for the test
        const tempEmployee = await prisma.employee.create({data: {firstName: 'Temp', lastName: 'Emp', email: 'temp@del.com', grossSalary: 1, companyId: company2.id}});
        const res = await request(app)
            .delete(`/api/companies/${company2.id}/employees/${tempEmployee.id}`)
            .set('Authorization', `Bearer ${token1}`); // User 1 token
        expect(res.statusCode).toEqual(403);
    });
  });
});