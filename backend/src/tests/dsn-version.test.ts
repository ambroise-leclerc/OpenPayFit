/**
 * Tests pour l'historique des versions DSN
 */

import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// Vérifier si le modèle DSNVersion existe dans le client Prisma
const hasDSNVersionModel = 'dSNVersion' in prisma;

describe('Tests de l\'historique des versions DSN', () => {
  let userId: string;
  let companyId: string;
  let dsnId: string;
  let token: string;

  // Skip tous les tests si le modèle DSNVersion n'est pas disponible
  if (!hasDSNVersionModel) {
    it.skip('Le client Prisma doit être régénéré avec le modèle DSNVersion', () => {
      // Ce test sera skippé jusqu'à ce que `prisma generate` soit exécuté
    });
    return;
  }

  beforeAll(async () => {
    // Nettoyer la base de données
    if (hasDSNVersionModel) {
      await (prisma as any).dSNVersion.deleteMany({});
    }
    await prisma.dSNDeclaration.deleteMany({});
    await prisma.compagnie.deleteMany({});
    await prisma.utilisateur.deleteMany({});

    // Créer un utilisateur de test
    const user = await prisma.utilisateur.create({
      data: {
        email: 'test-dsn-version@test.com',
        nom: 'Test DSN Version',
        motDePasse: 'hashedpassword',
        role: 'USER'
      }
    });
    userId = user.id;
    token = jwt.sign({ userId: user.id }, JWT_SECRET);

    // Créer une entreprise de test
    const company = await prisma.compagnie.create({
      data: {
        nom: 'Test Company DSN',
        proprietaireId: userId,
        siret: '12345678901234'
      }
    });
    companyId = company.id;

    // Créer une déclaration DSN de test
    const dsn = await prisma.dSNDeclaration.create({
      data: {
        compagnieId: companyId,
        periodeDeclaration: '2025-01',
        typeDeclaration: 'MENSUELLE',
        statut: 'BROUILLON',
        contenuXml: '<DSN>Test XML v1</DSN>',
        messagesValidation: '[]',
        numeroDeclaration: 'DSN-TEST-001'
      }
    });
    dsnId = dsn.id;
  });

  afterAll(async () => {
    // Nettoyer après tous les tests
    if (hasDSNVersionModel) {
      await (prisma as any).dSNVersion.deleteMany({});
    }
    await prisma.dSNDeclaration.deleteMany({});
    await prisma.compagnie.deleteMany({});
    await prisma.utilisateur.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions', () => {
    it('devrait retourner un historique vide si aucune version', async () => {
      const res = await request(app)
        .get(`/api/companies/${companyId}/dsn/${dsnId}/versions`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('versions');
      expect(res.body.versions).toBeInstanceOf(Array);
      expect(res.body.nombreVersions).toEqual(0);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const res = await request(app)
        .get(`/api/companies/${companyId}/dsn/${dsnId}/versions`);

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('POST /api/companies/:companyId/dsn/:dsnId/versions/compare', () => {
    beforeAll(async () => {
      if (!hasDSNVersionModel) return;

      // Créer deux versions pour les tests de comparaison
      await (prisma as any).dSNVersion.create({
        data: {
          declarationId: dsnId,
          numeroVersion: 1,
          contenuXml: '<DSN>Version 1</DSN>',
          messagesValidation: '[]',
          statut: 'BROUILLON',
          modifiePar: userId,
          raisonModification: 'Création initiale',
          champsModifies: JSON.stringify(['contenuXml'])
        }
      });

      await (prisma as any).dSNVersion.create({
        data: {
          declarationId: dsnId,
          numeroVersion: 2,
          contenuXml: '<DSN>Version 2</DSN>',
          messagesValidation: '[]',
          statut: 'VALIDEE',
          modifiePar: userId,
          raisonModification: 'Mise à jour',
          champsModifies: JSON.stringify(['contenuXml', 'statut'])
        }
      });
    });

    it('devrait comparer deux versions avec succès', async () => {
      const res = await request(app)
        .post(`/api/companies/${companyId}/dsn/${dsnId}/versions/compare`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          version1: 1,
          version2: 2
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('differences');
      expect(res.body).toHaveProperty('nombreChangements');
      expect(res.body.version1).toEqual(1);
      expect(res.body.version2).toEqual(2);
    });

    it('devrait retourner une erreur si les versions sont manquantes', async () => {
      const res = await request(app)
        .post(`/api/companies/${companyId}/dsn/${dsnId}/versions/compare`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/companies/:companyId/dsn/:dsnId/versions/:numeroVersion/restore', () => {
    it('devrait restaurer une version précédente', async () => {
      const res = await request(app)
        .post(`/api/companies/${companyId}/dsn/${dsnId}/versions/1/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('nouvelleVersion');
      expect(res.body.message).toContain('restaurée avec succès');
    });

    it('devrait retourner une erreur pour une version inexistante', async () => {
      const res = await request(app)
        .post(`/api/companies/${companyId}/dsn/${dsnId}/versions/999/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions/export', () => {
    it('devrait exporter l\'historique au format JSON', async () => {
      const res = await request(app)
        .get(`/api/companies/${companyId}/dsn/${dsnId}/versions/export?format=json`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['content-disposition']).toContain('attachment');
    });

    it('devrait exporter l\'historique au format CSV', async () => {
      const res = await request(app)
        .get(`/api/companies/${companyId}/dsn/${dsnId}/versions/export?format=csv`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });
});
