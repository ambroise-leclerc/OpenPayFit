/**
 * Tests pour les routes API de l'historique des versions DSN
 */

import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

describe('DSN Versions API Endpoints', () => {
  let user1: any, company1: any, token1: string;
  let dsn1: any;
  let version1: any, version2: any;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.dSNVersion.deleteMany();
    await prisma.dSNDeclaration.deleteMany();
    await prisma.employe.deleteMany();
    await prisma.compagnie.deleteMany();
    await prisma.utilisateur.deleteMany();

    // Créer un utilisateur de test
    user1 = await prisma.utilisateur.create({
      data: {
        email: 'user1@test.com',
        nom: 'User One',
        motDePasse: 'hashedpassword123'
      }
    });

    // Créer une entreprise de test
    company1 = await prisma.compagnie.create({
      data: {
        nom: 'Test Company 1',
        siret: '12345678901234',
        codeNaf: '6201Z',
        adresse: '1 rue Test',
        codePostal: '75001',
        ville: 'Paris',
        proprietaireId: user1.id
      }
    });

    // Créer un token JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);

    // Créer une DSN de test
    dsn1 = await prisma.dSNDeclaration.create({
      data: {
        compagnieId: company1.id,
        periodeDeclaration: '2025-03',
        typeDeclaration: 'MENSUELLE',
        statut: 'BROUILLON',
        contenuXml: '<dsn>Version initiale</dsn>',
        messagesValidation: '[]',
        numeroDeclaration: 'DSN-TEST-001'
      }
    });

    // Créer des versions de test
    version1 = await prisma.dSNVersion.create({
      data: {
        declarationId: dsn1.id,
        numeroVersion: 1,
        typeModification: 'CREATION',
        contenuXml: '<dsn>Version initiale</dsn>',
        messagesValidation: '[]',
        statut: 'BROUILLON',
        auteurId: user1.id,
        commentaire: 'Création initiale'
      }
    });

    version2 = await prisma.dSNVersion.create({
      data: {
        declarationId: dsn1.id,
        numeroVersion: 2,
        typeModification: 'MODIFICATION',
        contenuXml: '<dsn>Version modifiée</dsn>',
        messagesValidation: '[]',
        statut: 'VALIDEE',
        auteurId: user1.id,
        commentaire: 'Modification du contenu'
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions', () => {
    it('devrait récupérer toutes les versions d\'une DSN', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Vérifier que les versions sont triées par ordre décroissant
      expect(res.body[0].numeroVersion).toBeGreaterThanOrEqual(res.body[1].numeroVersion);

      // Vérifier la structure des données
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('numeroVersion');
      expect(res.body[0]).toHaveProperty('typeModification');
      expect(res.body[0]).toHaveProperty('statut');
      expect(res.body[0]).toHaveProperty('auteur');
      expect(res.body[0].auteur).toHaveProperty('nom');
      expect(res.body[0].auteur).toHaveProperty('email');
    });

    it('devrait retourner 404 si la DSN n\'existe pas', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/invalid-id/versions`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 401 sans token', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions`);

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions/:versionId', () => {
    it('devrait récupérer une version spécifique', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/${version1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', version1.id);
      expect(res.body).toHaveProperty('numeroVersion', 1);
      expect(res.body).toHaveProperty('typeModification', 'CREATION');
      expect(res.body).toHaveProperty('commentaire', 'Création initiale');
      expect(res.body).toHaveProperty('auteur');
      expect(res.body).toHaveProperty('declaration');
    });

    it('devrait retourner 404 si la version n\'existe pas', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/invalid-id`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions/compare', () => {
    it('devrait comparer deux versions', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/compare?version1=1&version2=2`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('version1');
      expect(res.body).toHaveProperty('version2');
      expect(res.body).toHaveProperty('differences');

      // Vérifier que les différences sont détectées
      expect(res.body.differences).toHaveProperty('statut');
      expect(res.body.differences).toHaveProperty('contenuXml');
      expect(res.body.differences.statut).toBe(true); // Les statuts sont différents
      expect(res.body.differences.contenuXml).toBe(true); // Le contenu XML est différent
    });

    it('devrait retourner 400 sans paramètres de version', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/compare`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 400 avec des numéros de version invalides', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/compare?version1=abc&version2=2`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('devrait retourner 404 si une version n\'existe pas', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/compare?version1=1&version2=999`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/companies/:companyId/dsn/:dsnId/versions/:versionId/restore', () => {
    it('devrait restaurer une version antérieure', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/${version1.id}/restore`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('declaration');
      expect(res.body).toHaveProperty('nouvelleVersion');

      // Vérifier que le contenu a été restauré
      expect(res.body.declaration.contenuXml).toBe('<dsn>Version initiale</dsn>');
      expect(res.body.nouvelleVersion.typeModification).toBe('RESTAURATION');
    });

    it('devrait retourner 400 pour une DSN déjà transmise', async () => {
      // Créer une DSN transmise
      const dsnTransmise = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company1.id,
          periodeDeclaration: '2025-04',
          typeDeclaration: 'MENSUELLE',
          statut: 'TRANSMISE',
          contenuXml: '<dsn>Test</dsn>',
          messagesValidation: '[]',
          numeroDeclaration: 'DSN-TEST-002'
        }
      });

      const versionTransmise = await prisma.dSNVersion.create({
        data: {
          declarationId: dsnTransmise.id,
          numeroVersion: 1,
          typeModification: 'CREATION',
          contenuXml: '<dsn>Test</dsn>',
          messagesValidation: '[]',
          statut: 'TRANSMISE',
          auteurId: user1.id,
          commentaire: 'Test'
        }
      });

      const res = await request(app)
        .post(`/api/companies/${company1.id}/dsn/${dsnTransmise.id}/versions/${versionTransmise.id}/restore`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('transmise');
    });

    it('devrait retourner 404 si la version n\'existe pas', async () => {
      const res = await request(app)
        .post(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/invalid-id/restore`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/versions/export', () => {
    it('devrait exporter l\'historique au format JSON', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/${dsn1.id}/versions/export`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['content-disposition']).toContain('attachment');

      // Vérifier la structure de l'export
      expect(res.body).toHaveProperty('dsn');
      expect(res.body).toHaveProperty('historique');
      expect(res.body).toHaveProperty('dateExport');
      expect(res.body).toHaveProperty('nombreVersions');

      expect(res.body.dsn).toHaveProperty('periodeDeclaration', '2025-03');
      expect(res.body.dsn).toHaveProperty('entreprise');
      expect(Array.isArray(res.body.historique)).toBe(true);
      expect(res.body.nombreVersions).toBeGreaterThanOrEqual(2);
    });

    it('devrait retourner 404 si la DSN n\'existe pas', async () => {
      const res = await request(app)
        .get(`/api/companies/${company1.id}/dsn/invalid-id/versions/export`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });
  });
});
