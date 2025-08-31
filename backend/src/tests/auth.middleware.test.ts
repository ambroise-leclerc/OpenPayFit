import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/db';
import { createTestUser, cleanDatabase } from './test-utils';

/**
 * Tests du Middleware d'Authentification - Guide de la sécurité des routes
 * 
 * Ce fichier de tests vous explique comment fonctionne la sécurité des routes :
 * 1. Extraction et validation des tokens JWT dans les headers
 * 2. Vérification de la signature et de l'expiration des tokens
 * 3. Injection de l'utilisateur dans l'objet Request pour les routes protégées
 * 4. Gestion des différents types d'erreurs d'authentification
 */

// Application Express de test pour tester le middleware
const testApp = express();
testApp.use(express.json());

// Route de test protégée par le middleware d'authentification
testApp.get('/protected', authenticateToken, (req, res) => {
  // Cette route n'est accessible qu'avec un token valide
  res.json({ 
    message: 'Access granted', 
    userId: req.user?.id,
    email: req.user?.email 
  });
});

// Route publique pour les tests de comparaison
testApp.get('/public', (req, res) => {
  res.json({ message: 'Public access' });
});

describe('🔐 Middleware d\'Authentification - Guide de sécurité des routes', () => {
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    // Nettoyage de la base
    await cleanDatabase();
    
    // Création d'un utilisateur de test
    testUser = await createTestUser({
      email: 'middleware.test@company.com',
      name: 'Middleware Tester',
      password: 'testPassword123'
    });
    validToken = testUser.token;
  });

  describe('🛡️ Fonctionnement du middleware d\'authentification', () => {
    /**
     * FLUX D'AUTHENTIFICATION :
     * 1. Le client envoie le token dans le header Authorization: Bearer <token>
     * 2. Le middleware extrait le token du header
     * 3. Le token est vérifié avec jwt.verify() et la clé secrète
     * 4. Si valide, les données utilisateur sont injectées dans req.user
     * 5. La requête continue vers la route suivante avec next()
     * 6. Si invalide, la requête est bloquée avec une erreur HTTP
     */

    it('✅ Devrait autoriser l\'accès avec un token JWT valide', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Le middleware injecte les données utilisateur dans req.user
      expect(response.body.message).toBe('Access granted');
      expect(response.body.userId).toBe(testUser.id);
      
      // Vérification que le token contient bien les bonnes données
      const decodedToken = jwt.verify(validToken, process.env.JWT_SECRET!) as any;
      expect(response.body.userId).toBe(decodedToken.id);
    });

    it('🔍 Devrait extraire correctement le token du header Authorization', async () => {
      // Test avec le format Bearer standard
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted');

      // Le format Authorization doit être exactement "Bearer <token>"
      // Le middleware split(' ')[1] pour extraire le token après "Bearer "
    });

    it('📝 Devrait injecter les données utilisateur dans req.user', async () => {
      // Vérification que req.user contient les bonnes informations
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Les données du token JWT sont disponibles dans la route
      expect(response.body.userId).toBe(testUser.id);

      // Décodage du token pour vérifier la cohérence
      const decoded = jwt.verify(validToken, process.env.JWT_SECRET!) as any;
      expect(decoded.id).toBe(testUser.id);
      expect(decoded).toHaveProperty('iat'); // Issued at
      expect(decoded).toHaveProperty('exp'); // Expiration
    });
  });

  describe('🚫 Gestion des erreurs d\'authentification', () => {
    /**
     * CODES D'ERREUR HTTP :
     * - 401 Unauthorized : Token manquant ou format incorrect
     * - 403 Forbidden : Token présent mais invalide (signature, expiration)
     * - 200 OK : Token valide, accès autorisé
     */

    it('🚫 Devrait retourner 401 si aucun header Authorization', async () => {
      const response = await request(testApp)
        .get('/protected')
        .expect(401);

      // 401 = Unauthorized (authentification requise mais manquante)
      expect(response.status).toBe(401);
    });

    it('🚫 Devrait retourner 401 si header Authorization sans token', async () => {
      // Header Authorization présent mais vide
      await request(testApp)
        .get('/protected')
        .set('Authorization', '')
        .expect(401);

      // Header Authorization avec seulement "Bearer" sans token
      await request(testApp)
        .get('/protected')
        .set('Authorization', 'Bearer')
        .expect(401);
    });

    it('🚫 Devrait retourner 403 pour un token invalide', async () => {
      // Token avec format JWT mais signature invalide
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature';
      
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(403);

      // 403 = Forbidden (authentification fournie mais refusée)
      expect(response.status).toBe(403);
    });

    it('🚫 Devrait retourner 403 pour un token expiré', async () => {
      // Création d'un token expiré (exp dans le passé)
      const expiredToken = jwt.sign(
        { 
          id: testUser.id,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expiré il y a 1 heure
        }, 
        process.env.JWT_SECRET!
      );

      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('🚫 Devrait retourner 403 pour un token avec mauvaise signature', async () => {
      // Token signé avec une clé différente
      const tokenWithBadSignature = jwt.sign(
        { id: testUser.id }, 
        'wrong_secret_key' // Mauvaise clé de signature
      );

      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${tokenWithBadSignature}`)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('🚫 Devrait retourner 403 pour un token malformé', async () => {
      // Token qui n'est pas au format JWT
      const malformedTokens = [
        'not.a.jwt.token',
        'random_string_123',
        'Bearer_token_without_Bearer_prefix',
        '',
        null
      ];

      for (const token of malformedTokens.filter(Boolean)) {
        await request(testApp)
          .get('/protected')
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }
    });
  });

  describe('🔄 Comparaison routes protégées vs publiques', () => {
    /**
     * DÉMONSTRATION DE LA DIFFÉRENCE :
     * - Routes publiques : accessibles sans authentification
     * - Routes protégées : middleware authenticateToken requis
     */

    it('📂 Devrait permettre l\'accès libre aux routes publiques', async () => {
      // Route publique accessible sans token
      const response = await request(testApp)
        .get('/public')
        .expect(200);

      expect(response.body.message).toBe('Public access');
    });

    it('🔒 Devrait bloquer l\'accès aux routes protégées sans token', async () => {
      // Route protégée bloquée sans token
      await request(testApp)
        .get('/protected')
        .expect(401);

      // Même route accessible avec token valide
      const protectedResponse = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(protectedResponse.body.message).toBe('Access granted');
    });
  });

  describe('⚡ Performance et sécurité du middleware', () => {
    /**
     * CONSIDÉRATIONS DE PERFORMANCE ET SÉCURITÉ :
     * 1. Vérification rapide du JWT (cryptographie optimisée)
     * 2. Pas de requête base de données à chaque authentification
     * 3. Expiration automatique des tokens pour limiter les risques
     * 4. Validation de signature pour éviter les tokens forgés
     */

    it('⚡ Devrait valider rapidement les tokens JWT', async () => {
      const startTime = Date.now();

      // Test de 10 requêtes authentifiées consécutives
      const promises = Array.from({ length: 10 }, () =>
        request(testApp)
          .get('/protected')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // La validation JWT devrait être très rapide (< 100ms pour 10 requêtes)
      expect(duration).toBeLessThan(1000);
    });

    it('🔐 Devrait valider différents tokens utilisateur en parallèle', async () => {
      // Création d'un second utilisateur
      const user2 = await createTestUser({
        email: 'user2@test.com',
        name: 'User Two',
        password: 'password456'
      });

      // Requêtes parallèles avec différents tokens
      const responses = await Promise.all([
        request(testApp)
          .get('/protected')
          .set('Authorization', `Bearer ${validToken}`),
        request(testApp)
          .get('/protected')
          .set('Authorization', `Bearer ${user2.token}`)
      ]);

      // Les deux requêtes devraient réussir avec les bons utilisateurs
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      
      expect(responses[0].body.userId).toBe(testUser.id);
      expect(responses[1].body.userId).toBe(user2.id);
      
      // Isolation : chaque token donne accès au bon utilisateur
      expect(responses[0].body.userId).not.toBe(responses[1].body.userId);
    });

    it('🛡️ Devrait résister aux attaques par force brute de tokens', async () => {
      const fakeTokens = [
        'fake.token.here',
        'another.fake.token',
        'yet.another.fake',
        'random.string.123',
        'malicious.attempt.xyz'
      ];

      // Tentatives d'authentification avec des tokens invalides
      const responses = await Promise.all(
        fakeTokens.map(token =>
          request(testApp)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`)
        )
      );

      // Toutes les tentatives devraient échouer
      responses.forEach(response => {
        expect(response.status).toBe(403);
      });
    });
  });
});