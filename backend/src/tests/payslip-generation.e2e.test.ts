import request from 'supertest';
import app from '../index';
import { cleanDatabase } from './test-utils';
import fs from 'fs';
import path from 'path';

describe('📄 End-to-End Test: PDF Payslip Generation', () => {
  let userToken: string;
  let companyId: string;
  let employeeId: string;
  let payslipId: string;

  beforeAll(async () => {
    await cleanDatabase();

    // 1. Register a new user
    const userData = {
      email: `test-payslip-${Date.now()}@example.com`,
      name: 'Payslip Tester',
      password: 'Password123!',
    };
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
    userToken = userResponse.body.token;

    // 2. Create a company
    const companyData = { name: 'PDF Test Corp' };
    const companyResponse = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${userToken}`)
      .send(companyData)
      .expect(201);
    companyId = companyResponse.body.id;

    // 3. Create an employee
    const employeeData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@pdftest.com',
      baseHourlyRate: 30,
    };
    const employeeResponse = await request(app)
      .post(`/api/companies/${companyId}/employees`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(employeeData)
      .expect(201);
    employeeId = employeeResponse.body.id;

    // 4. Run payroll to generate a payslip
    const payrollData = {
      companyId,
      month: 8,
      year: 2025,
      hours: {
        [employeeId]: {
          normalHours: 160,
          overtimeHours: 10,
        },
      },
    };
    const payrollResponse = await request(app)
      .post('/api/payroll/run')
      .set('Authorization', `Bearer ${userToken}`)
      .send(payrollData)
      .expect(201);
    payslipId = payrollResponse.body.payslips[0].id;
  });

  it('should generate and download a non-empty PDF payslip', async () => {
    const response = await request(app)
      .get(`/api/payroll/payslips/${payslipId}/pdf`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect('Content-Type', 'application/pdf');

    // Check that the PDF content is not empty
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);

    // Optional: Check for PDF magic number (%PDF)
    const pdfMagicNumber = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(response.body.slice(0, 4)).toEqual(pdfMagicNumber);

    // Save the PDF if the environment variable is set
    if (process.env.SAVE_PDF_OUTPUT === 'true') {
      const pdfPath = path.join(__dirname, '../../../../test-output');
      if (!fs.existsSync(pdfPath)) {
        fs.mkdirSync(pdfPath, { recursive: true });
      }
      fs.writeFileSync(path.join(pdfPath, 'payslip.pdf'), response.body);
      console.log(`\n✅ PDF saved to: ${path.join(pdfPath, 'payslip.pdf')}`);
    }
  });

  it('should return 404 for a non-existent payslip PDF', async () => {
    await request(app)
      .get('/api/payroll/payslips/non-existent-id/pdf')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
