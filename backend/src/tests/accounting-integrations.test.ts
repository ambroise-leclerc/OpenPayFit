/**
 * Tests pour les intégrations comptables (Sage, QuickBooks)
 */

import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Accounting Integrations API', () => {
  let user: any;
  let company: any;
  let token: string;
  let otherUser: any;
  let otherToken: string;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.accountingExportLog.deleteMany();
    await prisma.accountingIntegration.deleteMany();
    await prisma.fichePaie.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword
      }
    });

    // Créer une entreprise
    company = await prisma.company.create({
      data: {
        name: 'Test Company',
        ownerId: user.id
      }
    });

    // Générer un token JWT
    token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    // Créer un autre utilisateur pour tester les permissions
    otherUser = await prisma.user.create({
      data: {
        email: 'other@example.com',
        name: 'Other User',
        password: hashedPassword
      }
    });
    otherToken = jwt.sign({ userId: otherUser.id }, JWT_SECRET, { expiresIn: '24h' });
  });

  afterAll(async () => {
    // Nettoyer
    await prisma.accountingExportLog.deleteMany();
    await prisma.accountingIntegration.deleteMany();
    await prisma.fichePaie.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/companies/:companyId/integrations', () => {
    it('should create a Sage integration', async () => {
      const sageConfig = {
        formatType: 'TRA',
        accountMapping: {
          salaryExpense: '6411',
          socialCharges: '6451',
          socialDebt: '431',
          employeeDebt: '421',
          taxCharges: '6311'
        },
        journalCode: 'PAI'
      };

      const res = await request(app)
        .post(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SAGE',
          configuration: sageConfig
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.type).toBe('SAGE');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.companyId).toBe(company.id);
    });

    it('should create a QuickBooks integration', async () => {
      const qbConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        realmId: 'test-realm-id',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenExpiry: Date.now() / 1000 + 3600,
        accountMapping: {
          salaryExpense: '5000',
          socialCharges: '5100',
          socialDebt: '2000',
          employeeDebt: '2010'
        }
      };

      const res = await request(app)
        .post(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'QUICKBOOKS',
          configuration: qbConfig
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.type).toBe('QUICKBOOKS');
      expect(res.body.status).toBe('ACTIVE');
    });

    it('should reject duplicate integration type', async () => {
      const sageConfig = {
        formatType: 'TRA',
        accountMapping: {
          salaryExpense: '6411',
          socialCharges: '6451',
          socialDebt: '431',
          employeeDebt: '421',
          taxCharges: '6311'
        }
      };

      // Essayer de créer une deuxième intégration Sage
      const res = await request(app)
        .post(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SAGE',
          configuration: sageConfig
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('existe déjà');
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        formatType: 'INVALID',
        accountMapping: {}
      };

      const res = await request(app)
        .post(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SAGE',
          configuration: invalidConfig
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          type: 'SAGE',
          configuration: {}
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/companies/:companyId/integrations', () => {
    it('should list all integrations for a company', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Vérifier que les credentials sont masqués
      expect(res.body[0].configuration).toBe('***');
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/integrations`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/companies/:companyId/integrations/:integrationId', () => {
    it('should update integration status', async () => {
      // Récupérer une intégration existante
      const integrations = await prisma.accountingIntegration.findMany({
        where: { companyId: company.id }
      });
      const integration = integrations[0];

      const res = await request(app)
        .put(`/api/companies/${company.id}/integrations/${integration.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'INACTIVE'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('INACTIVE');
    });
  });

  describe('DELETE /api/companies/:companyId/integrations/:integrationId', () => {
    it('should delete an integration', async () => {
      // Créer une nouvelle intégration pour la supprimer
      const integration = await prisma.accountingIntegration.create({
        data: {
          companyId: company.id,
          type: 'SAGE',
          configuration: JSON.stringify({
            formatType: 'PNM',
            accountMapping: {
              salaryExpense: '6411',
              socialCharges: '6451',
              socialDebt: '431',
              employeeDebt: '421',
              taxCharges: '6311'
            }
          }),
          status: 'ACTIVE'
        }
      });

      // Supprimer cette intégration temporaire (ne pas affecter l'autre)
      // D'abord, supprimer l'une des intégrations SAGE pour éviter la contrainte unique
      await prisma.accountingIntegration.deleteMany({
        where: {
          companyId: company.id,
          type: 'SAGE',
          id: { not: integration.id }
        }
      });

      const res = await request(app)
        .delete(`/api/companies/${company.id}/integrations/${integration.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(204);

      // Vérifier que l'intégration a été supprimée
      const deleted = await prisma.accountingIntegration.findUnique({
        where: { id: integration.id }
      });
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/integrations/quickbooks/auth-url', () => {
    it('should generate QuickBooks authorization URL', async () => {
      const res = await request(app)
        .get('/api/integrations/quickbooks/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .query({
          clientId: 'test-client-id',
          redirectUri: 'http://localhost:3000/callback',
          sandbox: 'true'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.url).toContain('appcenter.intuit.com');
      expect(res.body.state).toBeDefined();
    });

    it('should reject missing parameters', async () => {
      const res = await request(app)
        .get('/api/integrations/quickbooks/auth-url')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/companies/:companyId/integrations/:integrationId/logs', () => {
    it('should list export logs for an integration', async () => {
      // Créer une intégration et un log
      const integration = await prisma.accountingIntegration.findFirst({
        where: { companyId: company.id }
      });

      if (integration) {
        await prisma.accountingExportLog.create({
          data: {
            integrationId: integration.id,
            status: 'SUCCESS',
            payPeriod: '2025-11',
            recordCount: 10
          }
        });

        const res = await request(app)
          .get(`/api/companies/${company.id}/integrations/${integration.id}/logs`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });
});
