/**
 * Tests pour les intégrations comptables (Sage, QuickBooks)
 */

import request from 'supertest';
import app from '../index';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const dbPath = path.join(__dirname, '../../prisma/test.db');

/**
 * Utilitaires pour les tests
 */
function createTestUser(db: DatabaseType, email: string, name: string): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO User (id, email, name, password, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, email, name, 'hashed-password-123');
  return id;
}

function createTestCompany(db: DatabaseType, name: string, ownerId: string): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO Company (id, name, ownerId, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, name, ownerId);
  return id;
}

function createTestAccountingIntegration(
  db: DatabaseType,
  companyId: string,
  type: string,
  configuration: string,
  status: string = 'ACTIVE'
): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO accounting_integrations (id, companyId, type, status, configuration, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(id, companyId, type, status, configuration);
  return id;
}

function createTestAccountingExportLog(
  db: DatabaseType,
  integrationId: string,
  status: string,
  payPeriod: string,
  recordCount: number
): string {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO accounting_export_logs (id, integrationId, status, payPeriod, recordCount, retryCount, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
  `).run(id, integrationId, status, payPeriod, recordCount);
  return id;
}

describe('Accounting Integrations API', () => {
  let db: DatabaseType;
  let userId: string;
  let companyId: string;
  let token: string;
  let otherUserId: string;
  let otherToken: string;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyer les données de test existantes
    db.exec(`DELETE FROM accounting_export_logs`);
    db.exec(`DELETE FROM accounting_integrations`);
    db.exec(`DELETE FROM Employee WHERE email LIKE '%accounting-test%'`);
    db.exec(`DELETE FROM Company WHERE name LIKE '%Accounting Test%'`);
    db.exec(`DELETE FROM User WHERE email LIKE '%accounting-test%'`);

    // Créer un utilisateur de test
    const timestamp = Date.now();
    userId = createTestUser(db, `accounting-test-${timestamp}@example.com`, 'Test User');
    companyId = createTestCompany(db, `Accounting Test Company ${timestamp}`, userId);

    // Créer un autre utilisateur pour tester les permissions
    otherUserId = createTestUser(db, `accounting-other-${timestamp}@example.com`, 'Other User');

    db.close();

    // Générer des tokens JWT
    token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
    otherToken = jwt.sign({ userId: otherUserId }, JWT_SECRET, { expiresIn: '24h' });
  });

  afterAll(() => {
    // Nettoyer les données de test
    const cleanupDb = new Database(dbPath);
    cleanupDb.exec(`DELETE FROM accounting_export_logs`);
    cleanupDb.exec(`DELETE FROM accounting_integrations WHERE companyId = '${companyId}'`);
    cleanupDb.exec(`DELETE FROM Company WHERE id = '${companyId}'`);
    cleanupDb.exec(`DELETE FROM User WHERE id = '${userId}' OR id = '${otherUserId}'`);
    cleanupDb.close();
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
        .post(`/api/companies/${companyId}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SAGE',
          configuration: sageConfig
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.type).toBe('SAGE');
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.companyId).toBe(companyId);
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
        .post(`/api/companies/${companyId}/integrations`)
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
        .post(`/api/companies/${companyId}/integrations`)
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
        .post(`/api/companies/${companyId}/integrations`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SAGE',
          configuration: invalidConfig
        });

      expect(res.statusCode).toBe(400);
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app)
        .post(`/api/companies/${companyId}/integrations`)
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
        .get(`/api/companies/${companyId}/integrations`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Vérifier que les credentials sont masqués
      expect(res.body[0].configuration).toBe('***');
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app)
        .get(`/api/companies/${companyId}/integrations`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/companies/:companyId/integrations/:integrationId', () => {
    it('should update integration status', async () => {
      // Récupérer une intégration existante via la base de données
      const testDb = new Database(dbPath);
      const integration = testDb.prepare(`
        SELECT * FROM accounting_integrations
        WHERE companyId = ?
        LIMIT 1
      `).get(companyId) as any;
      testDb.close();

      expect(integration).toBeDefined();

      const res = await request(app)
        .put(`/api/companies/${companyId}/integrations/${integration.id}`)
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
      // Récupérer une intégration existante (SAGE) pour la supprimer
      const testDb = new Database(dbPath);
      const integration = testDb.prepare(`
        SELECT * FROM accounting_integrations
        WHERE companyId = ? AND type = 'SAGE'
        LIMIT 1
      `).get(companyId) as any;
      testDb.close();

      expect(integration).toBeDefined();

      const res = await request(app)
        .delete(`/api/companies/${companyId}/integrations/${integration.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(204);

      // Vérifier que l'intégration a été supprimée
      const verifyDb = new Database(dbPath);
      const deleted = verifyDb.prepare(`
        SELECT * FROM accounting_integrations WHERE id = ?
      `).get(integration.id);
      verifyDb.close();
      expect(deleted).toBeUndefined();
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
      // Récupérer une intégration existante
      const testDb = new Database(dbPath);
      const integration = testDb.prepare(`
        SELECT * FROM accounting_integrations
        WHERE companyId = ?
        LIMIT 1
      `).get(companyId) as any;

      if (integration) {
        // Créer un log de test
        createTestAccountingExportLog(
          testDb,
          integration.id,
          'SUCCESS',
          '2025-11',
          10
        );
        testDb.close();

        const res = await request(app)
          .get(`/api/companies/${companyId}/integrations/${integration.id}/logs`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      } else {
        testDb.close();
      }
    });
  });
});
