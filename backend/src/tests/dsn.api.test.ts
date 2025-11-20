/**
 * Tests d'intégration pour l'API DSN
 */

import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

/**
 * Vérifier si le modèle DSNDeclaration est disponible dans le client Prisma
 * Si le client n'a pas été régénéré après l'ajout du modèle, les tests seront skippés
 */
const isDSNModelAvailable = typeof (prisma as any).dSNDeclaration !== 'undefined';

if (!isDSNModelAvailable) {
  console.warn('\n⚠️  Tests DSN API skippés : le modèle DSNDeclaration n\'est pas disponible dans le client Prisma');
  console.warn('   Cela se produit en CI avec des restrictions réseau empêchant "npx prisma generate"');
  console.warn('   En développement local, exécutez "npx prisma generate" pour régénérer le client\n');
}

(isDSNModelAvailable ? describe : describe.skip)('API DSN - Tests d\'intégration', () => {
  let user: any;
  let company: any;
  let employee: any;
  let fichePaie: any;
  let token: string;

  beforeAll(async () => {
    // Nettoyer la base
    await prisma.dSNDeclaration.deleteMany();
    await prisma.fichePaie.deleteMany();
    await prisma.employe.deleteMany();
    await prisma.compagnie.deleteMany();
    await prisma.utilisateur.deleteMany();

    // Créer un utilisateur de test
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.utilisateur.create({
      data: {
        email: 'test-dsn@example.com',
        nom: 'Test DSN User',
        motDePasse: hashedPassword,
      },
    });

    // Créer un token
    token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    // Créer une entreprise avec informations DSN
    company = await prisma.compagnie.create({
      data: {
        nom: 'Entreprise DSN Test',
        proprietaireId: user.id,
        siret: '12345678901234',
        codeNaf: '6201Z',
        adresse: '123 Rue Test',
        codePostal: '75001',
        ville: 'Paris',
        numeroUrssaf: '123456789',
      },
    });

    // Créer un employé avec informations DSN
    employee = await prisma.employe.create({
      data: {
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean.dupont@test.fr',
        salaireBrut: 3000,
        compagnieId: company.id,
        numeroSecuriteSociale: '123456789012345',
        dateNaissance: new Date('1985-05-15'),
        lieuNaissance: 'Paris, France',
        nationalite: 'FR',
        typeContrat: 'CDI',
        dateEmbauche: new Date('2020-01-01'),
        numeroMatricule: 'EMP001',
      },
    });

    // Créer une fiche de paie pour les tests
    fichePaie = await prisma.fichePaie.create({
      data: {
        employeId: employee.id,
        periodeVersement: '2025-03',
        salaireBrut: 3000,
        salaireNet: 2340,
        totalCotisationsSalariales: 660,
        totalCotisationsPatronales: 1200,
        coutTotal: 4200,
      },
    });

    // Ajouter des lignes de cotisations
    await prisma.ligneCotisationFichePaie.create({
      data: {
        fichePaieId: fichePaie.id,
        code: 'SS_MALADIE_SAL',
        nom: 'Assurance maladie',
        categorie: 'Sécurité sociale',
        organisme: 'URSSAF',
        typeCotisation: 'COTISATION_SALARIALE',
        assiette: 3000,
        taux: 0.0755,
        montantSalarial: 226.5,
        montantPatronal: 0,
        montantTotal: 226.5,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/companies/:companyId/dsn', () => {
    it('devrait retourner une liste vide si aucune DSN n\'existe', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('devrait retourner 401 sans authentification', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn`);

      expect(res.statusCode).toEqual(401);
    });

    it('devrait retourner 404 pour une entreprise inexistante', async () => {
      const res = await request(app)
        .get('/api/companies/inexistant/dsn')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/companies/:companyId/dsn/generate', () => {
    it('devrait générer une DSN avec succès', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/dsn/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ periode: '2025-03' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('declaration');
      expect(res.body).toHaveProperty('validation');
      expect(res.body.declaration.periodeDeclaration).toBe('2025-03');
      expect(res.body.declaration.statut).toBeDefined();
    });

    it('devrait retourner 400 sans période', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/dsn/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(400);
    });

    it('devrait retourner 400 avec une période invalide', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/dsn/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ periode: '2025-13' }); // Mois invalide

      expect(res.statusCode).toEqual(400);
    });

    it('devrait retourner 400 s\'il n\'y a pas de fiches de paie', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/dsn/generate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ periode: '2025-01' }); // Aucune fiche de paie pour cette période

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Aucune fiche de paie trouvée');
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId', () => {
    let dsnId: string;

    beforeAll(async () => {
      // Créer une DSN pour les tests
      const dsn = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-03',
          typeDeclaration: 'MENSUELLE',
          statut: 'VALIDEE',
          numeroDeclaration: 'DSN-TEST-001',
        },
      });
      dsnId = dsn.id;
    });

    it('devrait récupérer une DSN par son ID', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn/${dsnId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toBe(dsnId);
      expect(res.body.periodeDeclaration).toBe('2025-03');
    });

    it('devrait retourner 404 pour une DSN inexistante', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn/inexistant`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/companies/:companyId/dsn/:dsnId/download', () => {
    let dsnId: string;

    beforeAll(async () => {
      // Créer une DSN avec contenu XML pour les tests
      const dsn = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-04',
          typeDeclaration: 'MENSUELLE',
          statut: 'VALIDEE',
          contenuXml: '<?xml version="1.0"?><DSN><test>Test XML</test></DSN>',
        },
      });
      dsnId = dsn.id;
    });

    it('devrait télécharger le XML d\'une DSN', async () => {
      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn/${dsnId}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toBe('application/xml');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.text).toContain('<?xml version="1.0"?>');
    });

    it('devrait retourner 400 si la DSN n\'a pas de contenu XML', async () => {
      // Créer une DSN sans contenu XML
      const dsnSansXml = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-05',
          typeDeclaration: 'MENSUELLE',
          statut: 'BROUILLON',
        },
      });

      const res = await request(app)
        .get(`/api/companies/${company.id}/dsn/${dsnSansXml.id}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/companies/:companyId/dsn/:dsnId/validate', () => {
    let dsnId: string;

    beforeAll(async () => {
      // Créer une DSN pour les tests de validation
      const dsn = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-06',
          typeDeclaration: 'MENSUELLE',
          statut: 'VALIDEE',
          messagesValidation: JSON.stringify([
            { type: 'INFORMATION', code: 'INFO001', message: 'Test info' }
          ]),
        },
      });
      dsnId = dsn.id;
    });

    it('devrait valider une DSN et retourner les messages', async () => {
      const res = await request(app)
        .post(`/api/companies/${company.id}/dsn/${dsnId}/validate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('valide');
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });
  });

  describe('DELETE /api/companies/:companyId/dsn/:dsnId', () => {
    it('devrait supprimer une DSN en brouillon', async () => {
      // Créer une DSN en brouillon
      const dsn = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-07',
          typeDeclaration: 'MENSUELLE',
          statut: 'BROUILLON',
        },
      });

      const res = await request(app)
        .delete(`/api/companies/${company.id}/dsn/${dsn.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('supprimée avec succès');

      // Vérifier que la DSN a bien été supprimée
      const deleted = await prisma.dSNDeclaration.findUnique({
        where: { id: dsn.id },
      });
      expect(deleted).toBeNull();
    });

    it('ne devrait pas supprimer une DSN transmise', async () => {
      // Créer une DSN transmise
      const dsn = await prisma.dSNDeclaration.create({
        data: {
          compagnieId: company.id,
          periodeDeclaration: '2025-08',
          typeDeclaration: 'MENSUELLE',
          statut: 'TRANSMISE',
        },
      });

      const res = await request(app)
        .delete(`/api/companies/${company.id}/dsn/${dsn.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('déjà transmise');
    });
  });
});
