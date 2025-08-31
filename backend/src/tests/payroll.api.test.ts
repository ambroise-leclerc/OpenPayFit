import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import { createTestUser, createTestCompany, createTestEmployee, cleanDatabase } from './test-utils';

describe('POST /api/payroll/run', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should calculate payroll and create payslips for a company', async () => {
    const user = await createTestUser({ email: `user-payroll-ok@test.com` });
    const company = await createTestCompany(user.id);
    const employee = await createTestEmployee(company.id, { baseHourlyRate: 20 });

    const payrollData = {
      companyId: company.id,
      month: 8, // August
      year: 2025,
      hours: {
        [employee.id]: {
          normalHours: 151.67,
          overtimeHours: 10,
        },
      },
    };

    const res = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${user.token}`)
      .send(payrollData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toContain('1 fiches de paie créées avec succès');
    expect(res.body.payslips).toHaveLength(1);

    // Cleanup
    await prisma.payslip.deleteMany({ where: { employeeId: employee.id } });
    await prisma.employee.delete({ where: { id: employee.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should return 400 if parameters are missing', async () => {
    const user = await createTestUser({ email: `user-payroll-400@test.com` });
    const company = await createTestCompany(user.id);

    const res = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ companyId: company.id });

    expect(res.statusCode).toEqual(400);

    // Cleanup
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should return 404 for a company not owned by the user', async () => {
    const user1 = await createTestUser({ email: `user1-payroll-404@test.com` });
    const user2 = await createTestUser({ email: `user2-payroll-404@test.com` });
    const otherCompany = await createTestCompany(user2.id);

    const payrollData = {
      companyId: otherCompany.id,
      month: 8,
      year: 2025,
      hours: {},
    };

    const res = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${user1.token}`)
      .send(payrollData);

    expect(res.statusCode).toEqual(404);

    // Cleanup
    await prisma.company.delete({ where: { id: otherCompany.id } });
    await prisma.user.delete({ where: { id: user1.id } });
    await prisma.user.delete({ where: { id: user2.id } });
  });
});
