import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import { createTestUser, createTestCompany, createTestEmployee } from './test-utils';

describe('Employee API Endpoints', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/companies/:companyId/employees', () => {
    it('should create a new employee for the owner of the company', async () => {
      const user = await createTestUser({ email: `user-post-ok-${Date.now()}@test.com` });
      const company = await createTestCompany(user.id);

      const res = await request(app)
        .post(`/api/companies/${company.id}/employees`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe.new@company1.com',
          baseHourlyRate: 20,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.firstName).toBe('John');

      // Cleanup
      await prisma.employee.delete({ where: { id: res.body.id } });
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return 403 if user does not own the company', async () => {
      const user1 = await createTestUser({ email: `user1-post-403-${Date.now()}@test.com` });
      const company1 = await createTestCompany(user1.id);
      const user2 = await createTestUser({ email: `user2-post-403-${Date.now()}@test.com` });

      const res = await request(app)
        .post(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${user2.token}`) // token de user2
        .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@company1.com', baseHourlyRate: 22 });

      expect(res.statusCode).toEqual(403);

      // Cleanup
      await prisma.company.delete({ where: { id: company1.id } });
      await prisma.user.delete({ where: { id: user1.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  describe('GET /api/companies/:companyId/employees', () => {
    it('should return the list of employees for the company owner', async () => {
      const user = await createTestUser({ email: `user-get-ok-${Date.now()}@test.com` });
      const company = await createTestCompany(user.id);
      const employee = await createTestEmployee(company.id, { email: `get-test-${Date.now()}@test.com` });

      const res = await request(app)
        .get(`/api/companies/${company.id}/employees`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Cleanup
      await prisma.employee.delete({ where: { id: employee.id } });
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return 403 if user does not own the company', async () => {
      const user1 = await createTestUser({ email: `user1-get-403-${Date.now()}@test.com` });
      const company1 = await createTestCompany(user1.id);
      const user2 = await createTestUser({ email: `user2-get-403-${Date.now()}@test.com` });

      const res = await request(app)
        .get(`/api/companies/${company1.id}/employees`)
        .set('Authorization', `Bearer ${user2.token}`);

      expect(res.statusCode).toEqual(403);

      // Cleanup
      await prisma.company.delete({ where: { id: company1.id } });
      await prisma.user.delete({ where: { id: user1.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  describe('PUT /api/companies/:companyId/employees/:employeeId', () => {
    it('should update an employee', async () => {
      const user = await createTestUser({ email: `user-put-ok-${Date.now()}@test.com` });
      const company = await createTestCompany(user.id);
      const employee = await createTestEmployee(company.id, { email: `put-test-${Date.now()}@test.com` });

      const res = await request(app)
        .put(`/api/companies/${company.id}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ baseHourlyRate: 25 });

      expect(res.statusCode).toEqual(200);
      expect(res.body.baseHourlyRate).toBe(25);

      // Cleanup
      await prisma.employee.delete({ where: { id: employee.id } });
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('DELETE /api/companies/:companyId/employees/:employeeId', () => {
    it('should delete an employee', async () => {
      const user = await createTestUser({ email: `user-delete-ok-${Date.now()}@test.com` });
      const company = await createTestCompany(user.id);
      const employee = await createTestEmployee(company.id, { email: `delete-test-${Date.now()}@test.com` });

      const res = await request(app)
        .delete(`/api/companies/${company.id}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.statusCode).toEqual(204);

      // Cleanup
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    it("should return 403 if user tries to delete an employee from another user's company", async () => {
      const user1 = await createTestUser({ email: `user1-delete-403-${Date.now()}@test.com` });
      const company1 = await createTestCompany(user1.id);
      const employee1 = await createTestEmployee(company1.id, { email: `delete-forbidden-${Date.now()}@test.com`});
      const user2 = await createTestUser({ email: `user2-delete-403-${Date.now()}@test.com` });

      const res = await request(app)
        .delete(`/api/companies/${company1.id}/employees/${employee1.id}`)
        .set('Authorization', `Bearer ${user2.token}`); // User 2 token

      expect(res.statusCode).toEqual(403);

      // Cleanup
      await prisma.employee.delete({ where: { id: employee1.id } });
      await prisma.company.delete({ where: { id: company1.id } });
      await prisma.user.delete({ where: { id: user1.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });
});