import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import { createTestUser, createTestCompany, cleanDatabase } from './test-utils';

/**
 * Tests des API Entreprises - Guide de la gestion multi-tenant
 * 
 * Ce fichier de tests vous explique comment fonctionne le système d'entreprises :
 * 1. Modèle multi-tenant : chaque utilisateur peut gérer plusieurs entreprises
 * 2. Sécurité : seul le propriétaire peut accéder à ses entreprises
 * 3. Authentification requise : toutes les routes sont protégées
 * 4. Isolation des données : les entreprises sont isolées entre utilisateurs
 */

describe('🏢 Companies API - Guide du système multi-tenant', () => {
  let testUser1: any;
  let testUser2: any;
  let authToken1: string;
  let authToken2: string;

  beforeEach(async () => {
    // Nettoyage de la base de données
    await cleanDatabase();

    // Création de deux utilisateurs test pour tester l'isolation des données
    testUser1 = await createTestUser({
      email: 'owner1@company.com',
      name: 'Owner One',
      password: 'password123'
    });
    authToken1 = testUser1.token;

    testUser2 = await createTestUser({
      email: 'owner2@company.com',
      name: 'Owner Two',
      password: 'password456'
    });
    authToken2 = testUser2.token;
  });

  describe('📋 GET /api/companies - Récupération des entreprises', () => {
    /**
     * FONCTIONNEMENT DE LA RÉCUPÉRATION :
     * 1. L'utilisateur doit être authentifié (token JWT requis)
     * 2. Le serveur extrait l'ID utilisateur du token
     * 3. Seules les entreprises appartenant à cet utilisateur sont retournées
     * 4. Isolation complète : impossible de voir les entreprises des autres
     */

    it('✅ Devrait récupérer les entreprises du propriétaire authentifié', async () => {
      // Création de plusieurs entreprises pour l'utilisateur 1
      const company1 = await createTestCompany(testUser1.id, { name: 'Tech Solutions SARL' });
      const company2 = await createTestCompany(testUser1.id, { name: 'Marketing Pro SAS' });
      
      // Création d'une entreprise pour l'utilisateur 2 (ne doit pas apparaître)
      await createTestCompany(testUser2.id, { name: 'Concurrent Enterprise' });

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`) // Token du user1
        .expect(200);

      // L'utilisateur 1 ne voit que ses propres entreprises
      expect(response.body).toHaveLength(2);
      
      const companyNames = response.body.map((c: any) => c.name).sort();
      expect(companyNames).toEqual(['Marketing Pro SAS', 'Tech Solutions SARL']);

      // Vérification que toutes les entreprises appartiennent au bon utilisateur
      response.body.forEach((company: any) => {
        expect(company.ownerId).toBe(testUser1.id);
      });
    });

    it('📊 Devrait retourner une liste vide pour un utilisateur sans entreprises', async () => {
      // Création d'entreprises pour l'utilisateur 2 seulement
      await createTestCompany(testUser2.id, { name: 'Autres Entreprise' });

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`) // User1 n'a aucune entreprise
        .expect(200);

      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('🚫 Devrait rejeter les requêtes sans authentification', async () => {
      // Tentative d'accès sans token
      const response = await request(app)
        .get('/api/companies')
        .expect(401);

      // Le middleware auth renvoie seulement un status 401 sans message
      expect(response.status).toBe(401);
    });

    it('🚫 Devrait rejeter les requêtes avec token invalide', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', 'Bearer invalidtoken123')
        .expect(401);

      // Le middleware auth renvoie 403 pour token invalide
      expect(response.status).toBe(403);
    });
  });

  describe('➕ POST /api/companies - Création d\'entreprises', () => {
    /**
     * FONCTIONNEMENT DE LA CRÉATION :
     * 1. L'utilisateur authentifié envoie le nom de l'entreprise
     * 2. Le serveur crée l'entreprise avec l'ID du propriétaire extrait du token
     * 3. L'entreprise est automatiquement liée au bon utilisateur
     * 4. Validation des données d'entrée (nom requis)
     */

    it('✅ Devrait créer une nouvelle entreprise pour l\'utilisateur authentifié', async () => {
      const companyData = {
        name: 'Innovation Software Ltd'
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(companyData)
        .expect(201);

      // Vérification de la structure de la réponse
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(companyData.name);
      expect(response.body.ownerId).toBe(testUser1.id);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Vérification en base de données
      const createdCompany = await prisma.company.findUnique({
        where: { id: response.body.id }
      });

      expect(createdCompany).toBeTruthy();
      expect(createdCompany!.name).toBe(companyData.name);
      expect(createdCompany!.ownerId).toBe(testUser1.id);
    });

    it('🚫 Devrait valider que le nom est requis', async () => {
      // Test sans nom
      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Company name is required');

      // Test avec nom vide
      await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: '' })
        .expect(400);

      // Test avec nom null
      await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: null })
        .expect(400);
    });

    it('✅ Devrait permettre à différents utilisateurs de créer des entreprises avec le même nom', async () => {
      const companyName = 'Consulting Services';

      // User1 crée une entreprise
      const response1 = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: companyName })
        .expect(201);

      // User2 crée une entreprise avec le même nom (autorisé)
      const response2 = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ name: companyName })
        .expect(201);

      // Les deux entreprises existent avec le même nom mais des propriétaires différents
      expect(response1.body.name).toBe(companyName);
      expect(response2.body.name).toBe(companyName);
      expect(response1.body.ownerId).toBe(testUser1.id);
      expect(response2.body.ownerId).toBe(testUser2.id);
      expect(response1.body.id).not.toBe(response2.body.id);
    });

    it('🚫 Devrait rejeter la création sans authentification', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({ name: 'Unauthorized Company' })
        .expect(401);

      // Le middleware auth renvoie seulement un status 401 sans message
      expect(response.status).toBe(401);
    });
  });

  describe('🔒 Sécurité et isolation des données', () => {
    /**
     * PRINCIPES DE SÉCURITÉ IMPLÉMENTÉS :
     * 1. Isolation par utilisateur : chaque user ne voit que ses données
     * 2. Authentification obligatoire : aucune route publique
     * 3. Validation des tokens : vérification JWT à chaque requête
     * 4. Propriété automatique : les ressources sont liées au propriétaire du token
     */

    it('🛡️ Devrait isoler complètement les entreprises entre utilisateurs', async () => {
      // User1 crée des entreprises
      await createTestCompany(testUser1.id, { name: 'User1 Company A' });
      await createTestCompany(testUser1.id, { name: 'User1 Company B' });

      // User2 crée des entreprises
      await createTestCompany(testUser2.id, { name: 'User2 Company A' });
      await createTestCompany(testUser2.id, { name: 'User2 Company B' });

      // Récupération des entreprises de User1
      const user1Response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      // Récupération des entreprises de User2
      const user2Response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      // Chaque utilisateur ne voit que ses entreprises
      expect(user1Response.body).toHaveLength(2);
      expect(user2Response.body).toHaveLength(2);

      // Vérification des noms (isolation des données)
      const user1Names = user1Response.body.map((c: any) => c.name).sort();
      const user2Names = user2Response.body.map((c: any) => c.name).sort();

      expect(user1Names).toEqual(['User1 Company A', 'User1 Company B']);
      expect(user2Names).toEqual(['User2 Company A', 'User2 Company B']);

      // Aucune intersection entre les données des deux utilisateurs
      const user1Ids = user1Response.body.map((c: any) => c.id);
      const user2Ids = user2Response.body.map((c: any) => c.id);
      const intersection = user1Ids.filter((id: string) => user2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('⚡ Devrait traiter les erreurs serveur gracieusement', async () => {
      // Simulation d'une erreur de base de données en utilisant un nom très long
      const veryLongName = 'A'.repeat(10000); // Dépasse potentiellement les limites

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ name: veryLongName });

      // Le serveur devrait gérer l'erreur gracieusement
      if (response.status === 500) {
        expect(response.body.error).toBe('Failed to create company');
      } else {
        // Si l'insertion réussit, c'est aussi valide
        expect(response.status).toBe(201);
      }
    });

    it('🔄 Devrait maintenir la cohérence des données lors de créations multiples', async () => {
      const companyNames = [
        'Startup Alpha',
        'Startup Beta', 
        'Startup Gamma',
        'Startup Delta'
      ];

      // Création de plusieurs entreprises en parallèle
      const creationPromises = companyNames.map(name =>
        request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ name })
      );

      const responses = await Promise.all(creationPromises);

      // Toutes les créations devraient réussir
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.ownerId).toBe(testUser1.id);
      });

      // Vérification de la cohérence en base
      const companies = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(companies.body).toHaveLength(4);
      
      const retrievedNames = companies.body.map((c: any) => c.name).sort();
      expect(retrievedNames).toEqual(companyNames.sort());
    });
  });
});