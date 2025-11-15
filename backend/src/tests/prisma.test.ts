import { PrismaClient } from '@prisma/client';
import type { User, Company, Employee } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe.skip('Company and Employee CRUD operations (Prisma Client - skipped)', () => {
  let user: User;
  let company: Company;

  beforeAll(async () => {
    // Create a user to associate with the company
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    user = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        password: hashedPassword,
      },
    });
  });

  afterAll(async () => {
    // Clean up the database in reverse order of creation to avoid foreign key violations
    // This is a safe cleanup strategy for the test data we created.
    const testEmployeeEmails = await prisma.employee.findMany({ where: { email: { contains: '@testcorp.com' } } });
    if (testEmployeeEmails.length > 0) {
        await prisma.employee.deleteMany({ where: { email: { in: testEmployeeEmails.map((e: Employee) => e.email) } } });
    }
    
    const testCompany = await prisma.company.findFirst({ where: { ownerId: user.id } });
    if (testCompany) {
        await prisma.company.delete({ where: { id: testCompany.id } });
    }

    const testUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (testUser) {
        await prisma.user.delete({ where: { id: user.id } });
    }
    
    await prisma.$disconnect();
  });

  test('should create a new company', async () => {
    company = await prisma.company.create({
      data: {
        name: 'Test Corp',
        ownerId: user.id,
      },
    });
    expect(company).toHaveProperty('id');
    expect(company.name).toBe('Test Corp');
  });

  test('should create a new employee linked to the company', async () => {
    // This test depends on the company created in the previous test
    expect(company).toBeDefined();

    const employee = await prisma.employee.create({
      data: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: `jane.doe-${Date.now()}@testcorp.com`,
        grossSalary: 80000,
        companyId: company.id,
      },
    });

    expect(employee).toHaveProperty('id');
    expect(employee.companyId).toBe(company.id);
  });

  test('should fetch a company and include its employees', async () => {
    const companyWithEmployees = await prisma.company.findUnique({
      where: {
        id: company.id,
      },
      include: {
        employees: true,
      },
    });

    expect(companyWithEmployees).toBeDefined();
    expect(companyWithEmployees?.employees).toHaveLength(1);
    expect(companyWithEmployees?.employees[0].lastName).toEqual('Doe');
  });
});
