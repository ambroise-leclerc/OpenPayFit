import prisma from '../lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Function to clean database in correct order (respecting foreign keys)
export async function cleanDatabase() {
  await prisma.payslip.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
}

// Function to create a test user
export async function createTestUser(userData: Partial<{ email: string; name: string; password: string; }> = {}) {
  const defaultData = { email: 'test@test.com', name: 'Test User', password: 'password123' };
  const finalUserData = { ...defaultData, ...userData };

  const hashedPassword = await bcrypt.hash(finalUserData.password, 10);
  const user = await prisma.user.create({
    data: {
      email: finalUserData.email,
      name: finalUserData.name,
      password: hashedPassword,
    },
  });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return { ...user, token };
}

// Function to create a test company
export async function createTestCompany(ownerId: string, companyData = { name: 'Test Company' }) {
  return prisma.company.create({
    data: {
      name: companyData.name,
      ownerId,
    },
  });
}

// Function to create a test employee
export async function createTestEmployee(companyId: string, employeeData = {}) {
  const defaultData = {
    firstName: 'Test',
    lastName: 'Employee',
    email: `test.employee.${Date.now()}@test.com`,
    baseHourlyRate: 15,
    ...employeeData,
  };
  return prisma.employee.create({
    data: {
      ...defaultData,
      companyId,
    },
  });
}
