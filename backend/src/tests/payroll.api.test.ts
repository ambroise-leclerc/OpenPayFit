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

describe('GET /api/payroll/payslips/employee/:employeeId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return all payslips for a specific employee', async () => {
    const user = await createTestUser({ email: 'user-payslips-ok@test.com' });
    const company = await createTestCompany(user.id);
    const employee = await createTestEmployee(company.id);

    // Create a payslip for the employee
    await prisma.payslip.create({
      data: {
        employeeId: employee.id,
        periodStartDate: new Date('2025-08-01'),
        periodEndDate: new Date('2025-08-31'),
        grossSalary: 3000,
        netSalary: 2250,
        totalContributions: 750,
        normalHoursWorked: 151.67,
        overtimeHoursWorked: 0,
      },
    });

    const res = await request(app)
      .get(`/api/payroll/payslips/employee/${employee.id}`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].employeeId).toEqual(employee.id);

    // Cleanup
    await prisma.payslip.deleteMany({ where: { employeeId: employee.id } });
    await prisma.employee.delete({ where: { id: employee.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should return 404 for an employee not owned by the user', async () => {
    const user1 = await createTestUser({ email: 'user1-payslips-404@test.com' });
    const user2 = await createTestUser({ email: 'user2-payslips-404@test.com' });
    const company2 = await createTestCompany(user2.id);
    const employee2 = await createTestEmployee(company2.id);

    const res = await request(app)
      .get(`/api/payroll/payslips/employee/${employee2.id}`)
      .set('Authorization', `Bearer ${user1.token}`);

    expect(res.statusCode).toEqual(404);

    // Cleanup
    await prisma.employee.delete({ where: { id: employee2.id } });
    await prisma.company.delete({ where: { id: company2.id } });
    await prisma.user.delete({ where: { id: user1.id } });
    await prisma.user.delete({ where: { id: user2.id } });
  });
});

describe('GET /api/payroll/payslips/:payslipId/pdf', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return a PDF for a valid payslip', async () => {
    const user = await createTestUser({ email: 'user-pdf-ok@test.com' });
    const company = await createTestCompany(user.id);
    const employee = await createTestEmployee(company.id);
    const payslip = await prisma.payslip.create({
      data: {
        employeeId: employee.id,
        periodStartDate: new Date('2025-08-01'),
        periodEndDate: new Date('2025-08-31'),
        grossSalary: 3000,
        netSalary: 2250,
        totalContributions: 750,
        normalHoursWorked: 151.67,
        overtimeHoursWorked: 0,
      },
    });

    const res = await request(app)
      .get(`/api/payroll/payslips/${payslip.id}/pdf`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toEqual('application/pdf');
    expect(res.headers['content-disposition']).toContain(`attachment; filename=payslip-${payslip.id}.pdf`);

    // Cleanup
    await prisma.payslip.delete({ where: { id: payslip.id } });
    await prisma.employee.delete({ where: { id: employee.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should return 404 for a payslip not owned by the user', async () => {
    const user1 = await createTestUser({ email: 'user1-pdf-404@test.com' });
    const user2 = await createTestUser({ email: 'user2-pdf-404@test.com' });
    const company2 = await createTestCompany(user2.id);
    const employee2 = await createTestEmployee(company2.id);
    const payslip2 = await prisma.payslip.create({
      data: {
        employeeId: employee2.id,
        periodStartDate: new Date('2025-08-01'),
        periodEndDate: new Date('2025-08-31'),
        grossSalary: 3000,
        netSalary: 2250,
        totalContributions: 750,
        normalHoursWorked: 151.67,
        overtimeHoursWorked: 0,
      },
    });

    const res = await request(app)
      .get(`/api/payroll/payslips/${payslip2.id}/pdf`)
      .set('Authorization', `Bearer ${user1.token}`);

    expect(res.statusCode).toEqual(404);

    // Cleanup
    await prisma.payslip.delete({ where: { id: payslip2.id } });
    await prisma.employee.delete({ where: { id: employee2.id } });
    await prisma.company.delete({ where: { id: company2.id } });
    await prisma.user.delete({ where: { id: user1.id } });
    await prisma.user.delete({ where: { id: user2.id } });
  });
});
