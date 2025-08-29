import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Prisma DB Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should create a user, company and an employee', async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: `testuser-${Date.now()}@test.com`,
        name: 'Test User',
        password: hashedPassword,
      },
    });

    // Create a company
    const company = await prisma.company.create({
      data: {
        name: 'Test Corp',
        ownerId: user.id,
      },
    });

    // Create an employee linked to the company
    const employee = await prisma.employee.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: `jane.doe-${Date.now()}@testcorp.com`,
        baseHourlyRate: 40,
        companyId: company.id,
      },
    });

    expect(employee.firstName).toBe('Jane');
    expect(employee.companyId).toBe(company.id);

    // Clean up
    await prisma.employee.delete({ where: { id: employee.id } });
    await prisma.company.delete({ where: { id: company.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});