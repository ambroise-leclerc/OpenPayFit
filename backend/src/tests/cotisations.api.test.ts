// backend/src/tests/cotisations.api.test.ts
import request from 'supertest';
import app from '../index';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET as string;
const dbPath = path.join(__dirname, '../../prisma/test.db');

interface User {
  id: string;
  email: string;
}

interface CategorieCotisation {
  id: string;
  code: string;
  nom: string;
  description: string | null;
}

interface OrganismeCotisation {
  id: string;
  code: string;
  nom: string;
  description: string | null;
}

interface RegleCotisation {
  id: string;
  code: string;
  nom: string;
  categorieId: string;
  organismeId: string;
  typeCotisation: string;
  typeCalcul: string;
  typeAssiette: string;
  plancher: number | null;
  plafond: number | null;
  estActif: boolean;
}

describe.skip('Cotisations API Endpoints (requires Prisma - skipped in CI)', () => {
  let db: DatabaseType;
  let user1: User;
  let token1: string;
  let categorie1: CategorieCotisation;
  let organisme1: OrganismeCotisation;
  let regle1: RegleCotisation;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyage de la DB de test
    db.exec('DELETE FROM TauxCotisation');
    db.exec('DELETE FROM RegleComptable');
    db.exec('DELETE FROM RegleCotisation');
    db.exec('DELETE FROM CategorieCotisation');
    db.exec('DELETE FROM OrganismeCotisation');
    db.exec('DELETE FROM Employee');
    db.exec('DELETE FROM Company');
    db.exec('DELETE FROM User');

    // Création d'un utilisateur
    const user1Id = randomUUID();
    db.prepare(`INSERT INTO User (id, email, password, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user1Id, 'user1@test.com', 'password123');

    user1 = { id: user1Id, email: 'user1@test.com' };

    // Génération de token JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);

    db.close();
  });

  afterAll(() => {
    // Pas de déconnexion nécessaire pour better-sqlite3
  });

  // ========== Tests pour les Catégories ==========

  describe('POST /api/cotisations/categories', () => {
    it('should create a new category', async () => {
      const res = await request(app)
        .post('/api/cotisations/categories')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'SS',
          nom: 'Sécurité sociale',
          description: 'Cotisations de sécurité sociale',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.code).toBe('SS');
      expect(res.body.nom).toBe('Sécurité sociale');
      categorie1 = res.body;
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/cotisations/categories')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'RETRAITE',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 409 if category code already exists', async () => {
      const res = await request(app)
        .post('/api/cotisations/categories')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'SS',
          nom: 'Duplicate',
        });
      expect(res.statusCode).toEqual(409);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/cotisations/categories')
        .send({
          code: 'CHOMAGE',
          nom: 'Assurance chômage',
        });
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/cotisations/categories', () => {
    it('should list all categories', async () => {
      const res = await request(app)
        .get('/api/cotisations/categories')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/cotisations/categories/:id', () => {
    it('should get a category by ID', async () => {
      const res = await request(app)
        .get(`/api/cotisations/categories/${categorie1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.code).toBe('SS');
    });

    it('should return 404 if category not found', async () => {
      const res = await request(app)
        .get(`/api/cotisations/categories/${randomUUID()}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/cotisations/categories/:id', () => {
    it('should update a category', async () => {
      const res = await request(app)
        .put(`/api/cotisations/categories/${categorie1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'SS',
          nom: 'Sécurité sociale (modifié)',
          description: 'Description modifiée',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.nom).toBe('Sécurité sociale (modifié)');
    });
  });

  describe('DELETE /api/cotisations/categories/:id', () => {
    it('should return 404 if category not found', async () => {
      const res = await request(app)
        .delete(`/api/cotisations/categories/${randomUUID()}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(404);
    });
  });

  // ========== Tests pour les Organismes ==========

  describe('POST /api/cotisations/organismes', () => {
    it('should create a new organisme', async () => {
      const res = await request(app)
        .post('/api/cotisations/organismes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'URSSAF',
          nom: 'Union de recouvrement des cotisations',
          description: 'Organisme de collecte',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.code).toBe('URSSAF');
      organisme1 = res.body;
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/cotisations/organismes')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'AGIRC',
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/cotisations/organismes', () => {
    it('should list all organismes', async () => {
      const res = await request(app)
        .get('/api/cotisations/organismes')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ========== Tests pour les Règles de Cotisation ==========

  describe('POST /api/cotisations/regles', () => {
    it('should create a new regle', async () => {
      const res = await request(app)
        .post('/api/cotisations/regles')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'SS_MALADIE_SAL',
          nom: 'Cotisation maladie salariale',
          description: 'Cotisation salariale pour l\'assurance maladie',
          categorieId: categorie1.id,
          organismeId: organisme1.id,
          typeCotisation: 'COTISATION_SALARIALE',
          typeCalcul: 'POURCENTAGE',
          typeAssiette: 'SALAIRE_BRUT',
          plancher: null,
          plafond: null,
          estActif: true,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.code).toBe('SS_MALADIE_SAL');
      regle1 = res.body;
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/cotisations/regles')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'INCOMPLETE',
          nom: 'Règle incomplète',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if typeCotisation is invalid', async () => {
      const res = await request(app)
        .post('/api/cotisations/regles')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'INVALID_TYPE',
          nom: 'Type invalide',
          categorieId: categorie1.id,
          organismeId: organisme1.id,
          typeCotisation: 'INVALID',
          typeCalcul: 'POURCENTAGE',
          typeAssiette: 'SALAIRE_BRUT',
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/cotisations/regles', () => {
    it('should list all regles', async () => {
      const res = await request(app)
        .get('/api/cotisations/regles')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/cotisations/regles/:id', () => {
    it('should get a regle by ID', async () => {
      const res = await request(app)
        .get(`/api/cotisations/regles/${regle1.id}`)
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.code).toBe('SS_MALADIE_SAL');
    });
  });

  // ========== Tests pour les Taux de Cotisation ==========

  describe('POST /api/cotisations/regles/:regleId/taux', () => {
    it('should create a new taux for a regle', async () => {
      const res = await request(app)
        .post(`/api/cotisations/regles/${regle1.id}/taux`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          taux: 0.0755,
          dateDebut: '2025-01-01',
          dateFin: null,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body.taux).toBe(0.0755);
    });

    it('should return 400 if taux is invalid (> 1)', async () => {
      const res = await request(app)
        .post(`/api/cotisations/regles/${regle1.id}/taux`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          taux: 1.5,
          dateDebut: '2025-01-01',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if taux is invalid (< 0)', async () => {
      const res = await request(app)
        .post(`/api/cotisations/regles/${regle1.id}/taux`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          taux: -0.1,
          dateDebut: '2025-01-01',
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  // ========== Tests pour Import/Export ==========

  describe('POST /api/cotisations/import', () => {
    it('should import data from JSON format', async () => {
      const importData = {
        format: 'json',
        data: {
          categories: [
            {
              code: 'RETRAITE',
              nom: 'Retraite',
              description: 'Cotisations retraite',
            },
          ],
          organismes: [
            {
              code: 'AGIRC_ARRCO',
              nom: 'AGIRC-ARRCO',
              description: 'Retraite complémentaire',
            },
          ],
          regles: [],
        },
      };

      const res = await request(app)
        .post('/api/cotisations/import')
        .set('Authorization', `Bearer ${token1}`)
        .send(importData);
      expect(res.statusCode).toEqual(201);
      expect(res.body.categoriesCreated).toBeGreaterThan(0);
      expect(res.body.organismesCreated).toBeGreaterThan(0);
    });

    it('should return 400 if format is missing', async () => {
      const res = await request(app)
        .post('/api/cotisations/import')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          data: {},
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/cotisations/export', () => {
    it('should export data in JSON format', async () => {
      const res = await request(app)
        .get('/api/cotisations/export?format=json')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.categories).toBeDefined();
      expect(res.body.organismes).toBeDefined();
      expect(res.body.regles).toBeDefined();
    });

    it('should export data in YAML format', async () => {
      const res = await request(app)
        .get('/api/cotisations/export?format=yaml')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toContain('yaml');
    });

    it('should return 400 if format is invalid', async () => {
      const res = await request(app)
        .get('/api/cotisations/export?format=xml')
        .set('Authorization', `Bearer ${token1}`);
      expect(res.statusCode).toEqual(400);
    });
  });

  // ========== Tests pour la Simulation ==========

  describe('POST /api/cotisations/simulation', () => {
    it('should simulate payroll calculation', async () => {
      const res = await request(app)
        .post('/api/cotisations/simulation')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          salaireBrut: 3000,
          date: '2025-01-15',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.salaireBrut).toBe(3000);
      expect(res.body.salaireNet).toBeDefined();
      expect(res.body.cotisationsSalariales).toBeDefined();
      expect(res.body.cotisationsPatronales).toBeDefined();
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });

    it('should return 400 if salaireBrut is missing', async () => {
      const res = await request(app)
        .post('/api/cotisations/simulation')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          date: '2025-01-15',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if salaireBrut is negative', async () => {
      const res = await request(app)
        .post('/api/cotisations/simulation')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          salaireBrut: -1000,
          date: '2025-01-15',
        });
      expect(res.statusCode).toEqual(400);
    });

    it('should use current date if date is not provided', async () => {
      const res = await request(app)
        .post('/api/cotisations/simulation')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          salaireBrut: 3000,
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body.dateSimulation).toBeDefined();
    });
  });
});
