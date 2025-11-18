// backend/src/tests/organisms.api.test.ts
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

interface Company {
  id: string;
  name: string;
  ownerId: string;
}

interface Organism {
  id: string;
  code: string;
  nom: string;
  typeOrganisme: string;
  estGlobal: boolean;
  companyId?: string | null;
}

describe.skip('Organisms API Endpoints (requires Prisma - skipped in CI)', () => {
  let db: DatabaseType;
  let user1: User, user2: User;
  let company1: Company, company2: Company;
  let token1: string, token2: string;
  let globalOrganism: Organism, specificOrganism: Organism;

  beforeAll(() => {
    db = new Database(dbPath);

    // Nettoyage de la DB de test
    db.exec('DELETE FROM organismes_cotisation');
    db.exec('DELETE FROM Employee');
    db.exec('DELETE FROM Company');
    db.exec('DELETE FROM User');

    // Création de 2 utilisateurs
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    db.prepare(`INSERT INTO User (id, email, motDePasse, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user1Id, 'user1@test.com', 'p1');
    db.prepare(`INSERT INTO User (id, email, motDePasse, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(user2Id, 'user2@test.com', 'p2');

    user1 = { id: user1Id, email: 'user1@test.com' };
    user2 = { id: user2Id, email: 'user2@test.com' };

    // Création de 2 entreprises
    const company1Id = randomUUID();
    const company2Id = randomUUID();
    db.prepare(`INSERT INTO Company (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company1Id, 'Company 1', user1.id);
    db.prepare(`INSERT INTO Company (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(company2Id, 'Company 2', user2.id);

    company1 = { id: company1Id, name: 'Company 1', ownerId: user1.id };
    company2 = { id: company2Id, name: 'Company 2', ownerId: user2.id };

    // Création d'un organisme global (obligatoire)
    const globalOrganismId = randomUUID();
    db.prepare(`INSERT INTO organismes_cotisation (id, code, nom, typeOrganisme, estGlobal, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(globalOrganismId, 'URSSAF', 'URSSAF', 'URSSAF', 1);

    globalOrganism = {
      id: globalOrganismId,
      code: 'URSSAF',
      nom: 'URSSAF',
      typeOrganisme: 'URSSAF',
      estGlobal: true,
      companyId: null,
    };

    // Génération de tokens JWT
    token1 = jwt.sign({ userId: user1.id }, JWT_SECRET);
    token2 = jwt.sign({ userId: user2.id }, JWT_SECRET);

    db.close();
  });

  afterAll(() => {
    // Pas de déconnexion nécessaire pour better-sqlite3
  });

  describe('GET /api/organisms/global', () => {
    it('should return all global organisms without authentication', async () => {
      const res = await request(app).get('/api/organisms/global');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);

      // Vérifier que l'organisme global est présent
      const urssaf = res.body.find((o: Organism) => o.code === 'URSSAF');
      expect(urssaf).toBeDefined();
      expect(urssaf.estGlobal).toBe(true);
    });
  });

  describe('POST /api/organisms', () => {
    it('should create a new organism specific to a company', async () => {
      const res = await request(app)
        .post('/api/organisms')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'AG2R_TEST',
          nom: 'AG2R LA MONDIALE',
          typeOrganisme: 'RETRAITE',
          description: 'Caisse de retraite complémentaire',
          compagnieId: company1.id,
          telephone: '0123456789',
          siteWeb: 'https://www.ag2rlamondiale.fr',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.code).toBe('AG2R_TEST');
      expect(res.body.nom).toBe('AG2R LA MONDIALE');
      expect(res.body.estGlobal).toBe(false);
      expect(res.body.compagnieId).toBe(company1.id);

      specificOrganism = res.body; // Sauvegarder pour les tests suivants
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/organisms')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nom: 'Test Organism',
          // Manque code, typeOrganisme, compagnieId
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('obligatoires');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .post('/api/organisms')
        .set('Authorization', `Bearer ${token2}`) // token de user2
        .send({
          code: 'MALAKOFF_TEST',
          nom: 'Malakoff Humanis',
          typeOrganisme: 'RETRAITE',
          compagnieId: company1.id, // Mais company1 appartient à user1
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 400 if organism code already exists', async () => {
      const res = await request(app)
        .post('/api/organisms')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'AG2R_TEST', // Code déjà utilisé
          nom: 'Duplicate',
          typeOrganisme: 'RETRAITE',
          compagnieId: company1.id,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('existe déjà');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).post('/api/organisms');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/organisms', () => {
    it('should return global organisms + organisms from user companies', async () => {
      const res = await request(app)
        .get('/api/organisms')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2); // Au moins URSSAF + AG2R_TEST

      // Vérifier que l'organisme global est présent
      const urssaf = res.body.find((o: Organism) => o.code === 'URSSAF');
      expect(urssaf).toBeDefined();
      expect(urssaf.estGlobal).toBe(true);

      // Vérifier que l'organisme spécifique est présent
      const ag2r = res.body.find((o: Organism) => o.code === 'AG2R_TEST');
      expect(ag2r).toBeDefined();
      expect(ag2r.estGlobal).toBe(false);
    });

    it('should not return organisms from other users companies', async () => {
      // User2 ne devrait pas voir les organismes de company1
      const res = await request(app)
        .get('/api/organisms')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.statusCode).toEqual(200);

      // User2 devrait voir les organismes globaux
      const urssaf = res.body.find((o: Organism) => o.code === 'URSSAF');
      expect(urssaf).toBeDefined();

      // Mais pas les organismes spécifiques de company1
      const ag2r = res.body.find((o: Organism) => o.code === 'AG2R_TEST');
      expect(ag2r).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app).get('/api/organisms');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/organisms/:id', () => {
    it('should return a global organism', async () => {
      const res = await request(app)
        .get(`/api/organisms/${globalOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.code).toBe('URSSAF');
      expect(res.body.estGlobal).toBe(true);
    });

    it('should return a specific organism for the owner', async () => {
      const res = await request(app)
        .get(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.code).toBe('AG2R_TEST');
    });

    it('should return 403 if user tries to access another company organism', async () => {
      const res = await request(app)
        .get(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token2}`); // User2 essaie d'accéder à l'organisme de User1

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if organism does not exist', async () => {
      const res = await request(app)
        .get(`/api/organisms/${randomUUID()}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/organisms/:id', () => {
    it('should update a specific organism', async () => {
      const res = await request(app)
        .put(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nom: 'AG2R LA MONDIALE - Mis à jour',
          telephone: '0987654321',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.nom).toBe('AG2R LA MONDIALE - Mis à jour');
      expect(res.body.telephone).toBe('0987654321');
    });

    it('should return 403 when trying to update a global organism', async () => {
      const res = await request(app)
        .put(`/api/organisms/${globalOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          nom: 'URSSAF - Modifié',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('globaux');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .put(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token2}`) // User2 essaie de modifier l'organisme de User1
        .send({
          nom: 'Hacked Name',
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if organism does not exist', async () => {
      const res = await request(app)
        .put(`/api/organisms/${randomUUID()}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ nom: 'Test' });

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/organisms/:id', () => {
    it('should return 403 when trying to delete a global organism', async () => {
      const res = await request(app)
        .delete(`/api/organisms/${globalOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toContain('globaux');
    });

    it('should return 403 if user does not own the company', async () => {
      const res = await request(app)
        .delete(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token2}`); // User2 essaie de supprimer l'organisme de User1

      expect(res.statusCode).toEqual(403);
    });

    it('should delete a specific organism', async () => {
      const res = await request(app)
        .delete(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(204);

      // Vérifier que l'organisme a bien été supprimé
      const checkRes = await request(app)
        .get(`/api/organisms/${specificOrganism.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(checkRes.statusCode).toEqual(404);
    });

    it('should return 404 if organism does not exist', async () => {
      const res = await request(app)
        .delete(`/api/organisms/${randomUUID()}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
