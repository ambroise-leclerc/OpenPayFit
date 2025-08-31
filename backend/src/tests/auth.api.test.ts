import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cleanDatabase } from './test-utils';

/**
 * Tests d'authentification - Guide du système d'authentification OpenPayFit
 * 
 * Ce fichier de tests vous explique comment fonctionne le système d'authentification :
 * 1. Inscription des utilisateurs avec hashage des mots de passe
 * 2. Connexion avec validation des credentials
 * 3. Génération et validation des tokens JWT
 * 4. Gestion des erreurs et sécurité
 */

describe('🔐 Authentification API - Guide du système de sécurité', () => {
  // Nettoyage de la base de données avant chaque test pour isoler les tests
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('📝 POST /api/auth/register - Inscription des utilisateurs', () => {
    /**
     * FONCTIONNEMENT DE L'INSCRIPTION :
     * 1. L'utilisateur envoie email, nom et mot de passe
     * 2. Le serveur hashe le mot de passe avec bcrypt (salt rounds = 10)
     * 3. Les données sont stockées en base avec le mot de passe hashé
     * 4. Un token JWT est généré avec l'ID utilisateur
     * 5. Le token est renvoyé au client pour les requêtes futures
     */

    it('✅ Devrait créer un nouvel utilisateur avec hashage du mot de passe', async () => {
      // Données d'inscription d'un nouvel utilisateur
      const userData = {
        email: 'john.doe@company.com',
        name: 'John Doe',
        password: 'motDePasseSecret123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Le serveur renvoie un token JWT pour authentifier les futures requêtes
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Vérification que l'utilisateur a été créé en base
      const createdUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser!.email).toBe(userData.email);
      expect(createdUser!.name).toBe(userData.name);
      
      // SÉCURITÉ : Le mot de passe est hashé, jamais stocké en clair
      expect(createdUser!.password).not.toBe(userData.password);
      expect(createdUser!.password).toMatch(/^\$2[aby]\$/); // Format bcrypt

      // Vérification que le token JWT contient les bonnes informations
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET!) as any;
      expect(decodedToken.id).toBe(createdUser!.id);
    });

    it('🚫 Devrait rejeter l\'inscription si l\'email existe déjà', async () => {
      // Création d'un utilisateur existant
      const existingUserData = {
        email: 'existing@company.com',
        name: 'Existing User',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(existingUserData)
        .expect(201);

      // Tentative d'inscription avec le même email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@company.com', // Email déjà utilisé
          name: 'Another User',
          password: 'differentPassword'
        })
        .expect(409); // 409 = Conflit (email déjà existant)

      expect(response.body.error).toBe('Email already exists');
    });

    it('🚫 Devrait valider les champs requis', async () => {
      // Test sans email
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', password: 'password123' })
        .expect(400);

      // Test sans mot de passe
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'john@company.com', name: 'John' })
        .expect(400);

      // Test avec données vides
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: '', password: '' })
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('🔑 POST /api/auth/login - Connexion des utilisateurs', () => {
    /**
     * FONCTIONNEMENT DE LA CONNEXION :
     * 1. L'utilisateur envoie email et mot de passe
     * 2. Le serveur cherche l'utilisateur par email
     * 3. Le mot de passe est comparé avec le hash stocké (bcrypt.compare)
     * 4. Si valide, un nouveau token JWT est généré
     * 5. Le token permet l'accès aux ressources protégées
     */

    let testUser: any;

    beforeEach(async () => {
      // Création d'un utilisateur test pour les tests de connexion
      const hashedPassword = await bcrypt.hash('mySecretPassword', 10);
      testUser = await prisma.user.create({
        data: {
          email: 'test@company.com',
          name: 'Test User',
          password: hashedPassword
        }
      });
    });

    it('✅ Devrait connecter un utilisateur avec des credentials valides', async () => {
      const loginData = {
        email: 'test@company.com',
        password: 'mySecretPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Le serveur renvoie un token JWT pour les requêtes authentifiées
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Vérification que le token contient l'ID de l'utilisateur
      const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET!) as any;
      expect(decodedToken.id).toBe(testUser.id);
      
      // Le token a une expiration de 24h pour sécuriser les sessions
      expect(decodedToken.exp - decodedToken.iat).toBe(24 * 60 * 60);
    });

    it('🚫 Devrait rejeter la connexion avec un email inexistant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@company.com',
          password: 'anyPassword'
        })
        .expect(401);

      // Message générique pour éviter l'énumération d'emails
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('🚫 Devrait rejeter la connexion avec un mot de passe incorrect', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@company.com',
          password: 'wrongPassword' // Mot de passe incorrect
        })
        .expect(401);

      // Message générique pour éviter les attaques par force brute
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('🚫 Devrait valider les champs requis pour la connexion', async () => {
      // Test sans email
      await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      // Test sans mot de passe
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@company.com' })
        .expect(400);

      // Test avec champs vides
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' })
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('🔒 Sécurité du système dauthentification', () => {
    /**
     * MESURES DE SÉCURITÉ IMPLÉMENTÉES :
     * 1. Hashage des mots de passe avec bcrypt (salt rounds = 10)
     * 2. Tokens JWT avec expiration (24h)
     * 3. Messages d'erreur génériques pour éviter l'énumération
     * 4. Validation stricte des entrées
     * 5. Gestion sécurisée des variables d'environnement
     */

    it('🔐 Devrait hasher les mots de passe avec bcrypt', async () => {
      const userData = {
        email: 'security.test@company.com',
        name: 'Security Tester',
        password: 'plainTextPassword123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      // Le mot de passe ne doit jamais être stocké en clair
      expect(user!.password).not.toBe(userData.password);
      
      // Vérification du format bcrypt (commence par $2a$, $2b$ ou $2y$)
      expect(user!.password).toMatch(/^\$2[aby]\$10\$/);
      
      // Le hash doit être différent même pour le même mot de passe
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@test.com',
          name: 'Another User',
          password: await bcrypt.hash(userData.password, 10)
        }
      });
      
      expect(user!.password).not.toBe(anotherUser.password);
    });

    it('⏱️ Devrait générer des tokens JWT avec expiration', async () => {
      const userData = {
        email: 'jwt.test@company.com',
        name: 'JWT Tester',
        password: 'testPassword123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const token = response.body.token;
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Vérification de la structure du token
      expect(decodedToken).toHaveProperty('id');
      expect(decodedToken).toHaveProperty('iat'); // Issued at
      expect(decodedToken).toHaveProperty('exp'); // Expiration

      // Le token expire dans 24 heures (86400 secondes)
      const tokenDuration = decodedToken.exp - decodedToken.iat;
      expect(tokenDuration).toBe(24 * 60 * 60);

      // Le token n'est pas encore expiré
      expect(decodedToken.exp * 1000).toBeGreaterThan(Date.now());
    });

    it('🛡️ Devrait utiliser des messages d\'erreur génériques', async () => {
      // Test avec email inexistant
      const invalidEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@company.com',
          password: 'anyPassword'
        })
        .expect(401);

      // Test avec mot de passe incorrect (utilisateur existant)
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      await prisma.user.create({
        data: {
          email: 'existing@company.com',
          name: 'Existing User',
          password: hashedPassword
        }
      });

      const invalidPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@company.com',
          password: 'wrongPassword'
        })
        .expect(401);

      // Les deux erreurs retournent le même message pour éviter l'énumération
      expect(invalidEmailResponse.body.error).toBe('Invalid credentials');
      expect(invalidPasswordResponse.body.error).toBe('Invalid credentials');
    });
  });
});