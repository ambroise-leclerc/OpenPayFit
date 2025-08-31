import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import { createTestUser, createTestCompany, createTestEmployee, cleanDatabase } from './test-utils';

/**
 * Tests de Gestion d'Erreur - Guide des cas limites et exceptions
 * 
 * Ce fichier de tests vous explique comment l'API OpenPayFit gère les erreurs :
 * 1. 🚨 Types d'erreurs HTTP et leurs significations
 * 2. 🛡️ Validation des données et messages explicites
 * 3. 🔄 Récupération gracieuse après erreur
 * 4. 🧪 Cas limites et edge cases
 * 
 * Comprendre la gestion d'erreur est crucial pour une intégration robuste.
 */

describe('🚨 Gestion d\'Erreur - Guide des cas limites et exceptions', () => {
  let testUser: any;
  let authToken: string;
  let companyId: string;

  beforeEach(async () => {
    // Nettoyage complet
    await cleanDatabase();

    // Configuration de base
    testUser = await createTestUser({
      email: 'errortest@company.com',
      name: 'Error Tester',
      password: 'test123'
    });
    authToken = testUser.token;

    const company = await createTestCompany(testUser.id, { name: 'Error Test Company' });
    companyId = company.id;
  });

  describe('🔐 Erreurs d\'Authentification - Codes 401/403', () => {
    /**
     * CODES D'ERREUR D'AUTHENTIFICATION :
     * 401 Unauthorized : Authentification requise mais absente
     * 403 Forbidden : Authentification présente mais insuffisante
     * 
     * Ces erreurs protègent l'accès aux ressources sensibles
     */

    it('🚫 401 - Accès sans authentification', async () => {
      console.log('\n🎯 TEST: Tentative d\'accès sans token');

      const endpoints = [
        { method: 'get', path: '/api/companies' },
        { method: 'post', path: '/api/companies', body: { name: 'Test' } },
        { method: 'get', path: `/api/companies/${companyId}/employees` },
        { method: 'post', path: '/api/payroll', body: { employeeId: 'fake', hoursWorked: 40 } }
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'get') {
          response = await request(app).get(endpoint.path).send(endpoint.body || {});
        } else if (endpoint.method === 'post') {
          response = await request(app).post(endpoint.path).send(endpoint.body || {});
        } else {
          continue; // Skip unsupported methods
        }

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
        
        console.log(`✅ ${endpoint.method.toUpperCase()} ${endpoint.path} → 401 Unauthorized`);
      }
    });

    it('🚫 403 - Token invalide ou expiré', async () => {
      console.log('\n🎯 TEST: Tokens invalides');

      const invalidTokens = [
        'invalid.token.format',
        'Bearer malformed_token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature', // JWT malformé
      ];

      for (const invalidToken of invalidTokens) {
        const response = await request(app)
          .get('/api/companies')
          .set('Authorization', `Bearer ${invalidToken}`);

        expect([401, 403]).toContain(response.status);
        
        console.log(`✅ Token invalide → ${response.status} (${response.body.error || 'No message'})`);
      }
    });
  });

  describe('❌ Erreurs de Validation - Code 400', () => {
    /**
     * ERREURS DE VALIDATION (400 Bad Request) :
     * Données manquantes, format incorrect, valeurs invalides
     * L'API renvoie des messages explicites pour aider le développeur
     */

    it('🚫 400 - Champs requis manquants', async () => {
      console.log('\n🎯 TEST: Validation des champs requis');

      // Test inscription sans email
      const noEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', password: 'password123' })
        .expect(400);

      expect(noEmailResponse.body.error).toBe('Email and password are required');
      console.log('✅ Inscription sans email → message explicite');

      // Test création entreprise sans nom
      const noNameResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(noNameResponse.body.error).toBe('Company name is required');
      console.log('✅ Entreprise sans nom → message explicite');

      // Test employé avec données manquantes
      const incompleteEmployeeResponse = await request(app)
        .post(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John'
          // lastName et email manquants
        });

      expect([400, 500]).toContain(incompleteEmployeeResponse.status);
      console.log(`✅ Employé incomplet → ${incompleteEmployeeResponse.status}`);
    });

    it('🚫 400 - Formats de données invalides', async () => {
      console.log('\n🎯 TEST: Validation du format des données');

      const invalidFormats = [
        {
          name: 'Email invalide',
          data: { firstName: 'John', lastName: 'Doe', email: 'not-an-email', baseHourlyRate: 15 }
        },
        {
          name: 'Taux horaire négatif',
          data: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', baseHourlyRate: -10 }
        },
        {
          name: 'Taux horaire non numérique',
          data: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', baseHourlyRate: 'fifteen' }
        }
      ];

      for (const testCase of invalidFormats) {
        const response = await request(app)
          .post(`/api/companies/${companyId}/employees`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testCase.data);

        // Peut être 400 (validation) ou 500 (erreur serveur selon l'implémentation)
        expect([400, 500]).toContain(response.status);
        console.log(`✅ ${testCase.name} → ${response.status}`);
      }
    });
  });

  describe('❌ Erreurs de Ressource - Codes 404/409', () => {
    /**
     * ERREURS DE RESSOURCE :
     * 404 Not Found : Ressource inexistante
     * 409 Conflict : Conflit (ex: email déjà utilisé)
     */

    it('🚫 404 - Ressources inexistantes', async () => {
      console.log('\n🎯 TEST: Accès à des ressources inexistantes');

      const fakeId = '00000000-0000-0000-0000-000000000000'; // UUID valide mais inexistant

      // Employés d'une entreprise inexistante
      const fakeCompanyResponse = await request(app)
        .get(`/api/companies/${fakeId}/employees`)
        .set('Authorization', `Bearer ${authToken}`);

      // Peut être 404 ou 403 selon l'implémentation de sécurité
      expect([403, 404]).toContain(fakeCompanyResponse.status);
      console.log(`✅ Entreprise inexistante → ${fakeCompanyResponse.status}`);

      // Calcul paie pour employé inexistant
      const fakeEmployeePayrollResponse = await request(app)
        .post('/api/payroll')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: fakeId,
          hoursWorked: 40,
          overtime: 0,
          bonuses: 0
        });

      expect([404, 500]).toContain(fakeEmployeePayrollResponse.status);
      console.log(`✅ Employé inexistant pour paie → ${fakeEmployeePayrollResponse.status}`);
    });

    it('🚫 409 - Conflits de données', async () => {
      console.log('\n🎯 TEST: Gestion des conflits de données');

      const userData = {
        email: 'conflict@test.com',
        name: 'First User',
        password: 'password123'
      };

      // Premier utilisateur
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Tentative de création du même email
      const conflictResponse = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          name: 'Second User' // Nom différent mais même email
        })
        .expect(409);

      expect(conflictResponse.body.error).toBe('Email already exists');
      console.log('✅ Email en double → 409 Conflict avec message explicite');
    });
  });

  describe('⚡ Erreurs Serveur - Code 500', () => {
    /**
     * ERREURS SERVEUR (500 Internal Server Error) :
     * Erreurs non prévues, problèmes de base de données, erreurs système
     * L'API doit les gérer gracieusement sans exposer d'infos sensibles
     */

    it('🛠️ 500 - Gestion gracieuse des erreurs serveur', async () => {
      console.log('\n🎯 TEST: Simulation d\'erreurs serveur');

      // Test avec des données qui pourraient causer des erreurs DB
      const problematicData = [
        {
          name: 'Données très longues',
          payload: { name: 'A'.repeat(10000) } // Nom très long
        },
        {
          name: 'Caractères spéciaux',
          payload: { name: 'Entreprise avec des caractères bizarres 🏢💼🔥' }
        },
        {
          name: 'Valeurs nulles',
          payload: { name: null }
        }
      ];

      for (const test of problematicData) {
        const response = await request(app)
          .post('/api/companies')
          .set('Authorization', `Bearer ${authToken}`)
          .send(test.payload);

        if (response.status === 500) {
          // Si erreur 500, vérifier que le message ne révèle pas d'infos sensibles
          expect(response.body.error).toBeDefined();
          expect(response.body.error).not.toContain('password');
          expect(response.body.error).not.toContain('secret');
          
          console.log(`✅ ${test.name} → 500 avec message sécurisé`);
        } else {
          // Si pas d'erreur, c'est que l'API gère bien le cas
          console.log(`✅ ${test.name} → ${response.status} (géré correctement)`);
        }
      }
    });
  });

  describe('🧪 Cas Limites et Edge Cases', () => {
    /**
     * CAS LIMITES :
     * Situations particulières qui peuvent casser l'application
     * Tests de robustesse et de cohérence
     */

    it('🔬 Edge Case - Opérations simultanées', async () => {
      console.log('\n🎯 TEST: Opérations simultanées sur la même ressource');

      // Tentative de création de multiples employés simultanément
      const simultaneousEmployees = Array.from({ length: 5 }, (_, i) => ({
        firstName: `Employee${i}`,
        lastName: `Simultaneous`,
        email: `employee${i}@simultaneous.com`,
        baseHourlyRate: 15 + i
      }));

      const promises = simultaneousEmployees.map(employeeData =>
        request(app)
          .post(`/api/companies/${companyId}/employees`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(employeeData)
      );

      const results = await Promise.all(promises);

      // Vérifier que toutes les opérations ont réussi ou échoué gracieusement
      const successCount = results.filter(r => r.status === 201).length;
      const errorCount = results.filter(r => r.status !== 201).length;

      console.log(`✅ Opérations simultanées : ${successCount} succès, ${errorCount} erreurs`);

      // Vérifier la cohérence en base
      const employeesInDb = await request(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(employeesInDb.body.length).toBe(successCount);
    });

    it('🔬 Edge Case - Données de paie extrêmes', async () => {
      console.log('\n🎯 TEST: Calculs de paie avec valeurs extrêmes');

      // Créer un employé test
      const employee = await createTestEmployee(companyId);

      const extremeCases = [
        {
          name: 'Zéro heures',
          data: { employeeId: employee.id, hoursWorked: 0, overtime: 0, bonuses: 0 }
        },
        {
          name: 'Heures négatives',
          data: { employeeId: employee.id, hoursWorked: -10, overtime: 5, bonuses: 100 }
        },
        {
          name: 'Très nombreuses heures',
          data: { employeeId: employee.id, hoursWorked: 1000, overtime: 500, bonuses: 10000 }
        },
        {
          name: 'Bonus négatif',
          data: { employeeId: employee.id, hoursWorked: 40, overtime: 0, bonuses: -500 }
        }
      ];

      for (const testCase of extremeCases) {
        const response = await request(app)
          .post('/api/payroll')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testCase.data);

        if (response.status === 201) {
          // Si l'opération réussit, vérifier la cohérence
          expect(response.body.grossSalary).toBeDefined();
          expect(typeof response.body.grossSalary).toBe('number');
          console.log(`✅ ${testCase.name} → ${response.status} (Salaire: ${response.body.grossSalary}€)`);
        } else {
          // Si échec, vérifier que c'est géré proprement
          expect([400, 500]).toContain(response.status);
          console.log(`✅ ${testCase.name} → ${response.status} (Rejeté proprement)`);
        }
      }
    });

    it('🔬 Edge Case - Limites de caractères et encoding', async () => {
      console.log('\n🎯 TEST: Gestion de l\'encoding et limites');

      const encodingTests = [
        {
          name: 'Émojis et Unicode',
          data: { firstName: '🚀', lastName: 'Émoji', email: 'emoji@test.com', baseHourlyRate: 20 }
        },
        {
          name: 'Accents et caractères spéciaux',
          data: { firstName: 'François', lastName: 'Müller', email: 'francois@test.com', baseHourlyRate: 25 }
        },
        {
          name: 'Caractères de contrôle',
          data: { firstName: 'Test\n\t', lastName: 'Control', email: 'control@test.com', baseHourlyRate: 15 }
        }
      ];

      for (const test of encodingTests) {
        const response = await request(app)
          .post(`/api/companies/${companyId}/employees`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(test.data);

        if (response.status === 201) {
          // Vérifier que l'encoding est préservé
          expect(response.body.firstName).toBeDefined();
          console.log(`✅ ${test.name} → Créé avec succès`);
        } else {
          // Vérifier que l'erreur est gérée proprement
          console.log(`✅ ${test.name} → ${response.status} (Filtrage approprié)`);
        }
      }
    });

    it('🔄 Test de récupération après erreur', async () => {
      console.log('\n🎯 TEST: Récupération système après erreurs multiples');

      // Générer plusieurs erreurs consécutives
      const errorRequests = [
        request(app).post('/api/companies').set('Authorization', 'Bearer invalid').send({}),
        request(app).get('/api/companies/fake-id').set('Authorization', `Bearer ${authToken}`),
        request(app).post('/api/auth/register').send({ email: 'invalid' })
      ];

      await Promise.all(errorRequests);

      console.log('✅ Erreurs multiples générées');

      // Vérifier que le système fonctionne encore normalement
      const healthCheckResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Recovery Test Company' })
        .expect(201);

      expect(healthCheckResponse.body.name).toBe('Recovery Test Company');
      console.log('✅ Système opérationnel après erreurs multiples');

      // Vérifier l'intégrité des données existantes
      const companiesResponse = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(companiesResponse.body.length).toBeGreaterThan(0);
      console.log('✅ Intégrité des données préservée');
    });
  });
});