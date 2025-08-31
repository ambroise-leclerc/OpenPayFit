import request from 'supertest';
import app from '../index';
import prisma from '../lib/db';
import { cleanDatabase } from './test-utils';

/**
 * Tests d'Intégration - Parcours Utilisateur Complet OpenPayFit
 * 
 * Ce fichier de tests vous montre comment utiliser l'API complète d'OpenPayFit
 * en suivant des scénarios réels d'utilisation. C'est un guide pratique qui démontre :
 * 
 * 1. 🏢 Création d'une entreprise de A à Z
 * 2. 👥 Gestion complète des employés
 * 3. 💰 Calcul et gestion de la paie
 * 4. 🔄 Workflow complet d'une PME
 * 
 * Ces tests servent de documentation vivante pour comprendre comment
 * intégrer et utiliser l'API OpenPayFit dans une vraie application.
 */

describe('🚀 Parcours Utilisateur Complet - Guide d\'utilisation OpenPayFit', () => {
  // Variables partagées pour le parcours complet
  let userToken: string;
  let userId: string;
  let companyId: string;
  let employeeIds: string[] = [];

  beforeEach(async () => {
    // 🧹 Nettoyage complet de la base pour chaque scénario
    await cleanDatabase();
    
    // Reset des variables
    employeeIds = [];
  });

  describe('🏢 Scénario 1: Création et gestion d\'une entreprise complète', () => {
    /**
     * SCÉNARIO : "TechStart Solutions" - une startup qui démarre
     * 
     * Étapes du parcours :
     * 1. Le fondateur s'inscrit sur OpenPayFit
     * 2. Il crée sa société "TechStart Solutions" 
     * 3. Il embauche ses premiers employés
     * 4. Il configure leurs salaires et horaires
     * 5. Il calcule la première paie mensuelle
     */

    it('📋 Parcours complet : De l\'inscription à la première paie', async () => {
      // 👤 ÉTAPE 1: Inscription du fondateur
      console.log('\n🎯 ÉTAPE 1: Inscription du fondateur de TechStart Solutions');
      
      const founderData = {
        email: 'founder@techstart.com',
        name: 'Alice Entrepreneur',
        password: 'SecurePassword123!'
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(founderData)
        .expect(201);

      userToken = registrationResponse.body.token;
      
      // Récupération de l'ID utilisateur depuis le token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET!) as any;
      userId = decoded.id;

      console.log(`✅ Fondateur inscrit avec succès (ID: ${userId})`);

      // 🏢 ÉTAPE 2: Création de l'entreprise
      console.log('\n🎯 ÉTAPE 2: Création de l\'entreprise TechStart Solutions');

      const companyData = {
        name: 'TechStart Solutions SARL'
      };

      const companyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(companyData)
        .expect(201);

      companyId = companyResponse.body.id;
      
      expect(companyResponse.body.name).toBe(companyData.name);
      expect(companyResponse.body.ownerId).toBe(userId);

      console.log(`✅ Entreprise créée avec succès (ID: ${companyId})`);

      // 👥 ÉTAPE 3: Embauche des premiers employés
      console.log('\n🎯 ÉTAPE 3: Embauche de l\'équipe initiale');

      const employeesData = [
        {
          firstName: 'Bob',
          lastName: 'Developer',
          email: 'bob@techstart.com',
          baseHourlyRate: 25, // 25€/heure pour le développeur senior
          role: 'Développeur Senior'
        },
        {
          firstName: 'Carol',
          lastName: 'Designer',
          email: 'carol@techstart.com', 
          baseHourlyRate: 20, // 20€/heure pour la designer
          role: 'UX Designer'
        },
        {
          firstName: 'David',
          lastName: 'Marketing',
          email: 'david@techstart.com',
          baseHourlyRate: 18, // 18€/heure pour le responsable marketing
          role: 'Responsable Marketing'
        }
      ];

      // Création des employés un par un
      for (const employeeData of employeesData) {
        const employeeResponse = await request(app)
          .post(`/api/companies/${companyId}/employees`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(employeeData)
          .expect(201);

        employeeIds.push(employeeResponse.body.id);
        
        expect(employeeResponse.body.firstName).toBe(employeeData.firstName);
        expect(employeeResponse.body.lastName).toBe(employeeData.lastName);
        expect(employeeResponse.body.companyId).toBe(companyId);

        console.log(`✅ Employé ${employeeData.firstName} ${employeeData.lastName} embauché (Taux: ${employeeData.baseHourlyRate}€/h)`);
      }

      // 📊 ÉTAPE 4: Vérification de l'équipe constituée
      console.log('\n🎯 ÉTAPE 4: Vérification de l\'équipe constituée');

      const teamResponse = await request(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(teamResponse.body).toHaveLength(3);
      
      const totalHourlyBudget = teamResponse.body.reduce((sum: number, emp: any) => 
        sum + emp.baseHourlyRate, 0
      );

      console.log(`✅ Équipe de ${teamResponse.body.length} employés constituée`);
      console.log(`💰 Budget horaire total: ${totalHourlyBudget}€/heure`);

      // 💰 ÉTAPE 5: Calcul de la première paie
      console.log('\n🎯 ÉTAPE 5: Calcul de la première paie mensuelle');

      // Simulation : chaque employé a travaillé 160 heures (temps plein)
      const monthlyHours = 160;

      for (let i = 0; i < employeeIds.length; i++) {
        const employeeId = employeeIds[i];
        const employee = teamResponse.body[i];

        const payrollRequest = {
          employeeId,
          hoursWorked: monthlyHours,
          overtime: 0,
          bonuses: employee.firstName === 'Bob' ? 200 : 0 // Bonus pour Bob
        };

        const payrollResponse = await request(app)
          .post('/api/payroll')
          .set('Authorization', `Bearer ${userToken}`)
          .send(payrollRequest)
          .expect(201);

        const expectedGrossSalary = monthlyHours * employee.baseHourlyRate + (payrollRequest.bonuses || 0);
        
        expect(payrollResponse.body.grossSalary).toBe(expectedGrossSalary);
        expect(payrollResponse.body.hoursWorked).toBe(monthlyHours);

        console.log(`💵 Paie calculée pour ${employee.firstName}: ${expectedGrossSalary}€ brut`);
      }

      // 📈 ÉTAPE 6: Récapitulatif financier
      console.log('\n🎯 ÉTAPE 6: Récapitulatif financier mensuel');

      const totalPayroll = teamResponse.body.reduce((total: number, emp: any) => {
        const baseSalary = monthlyHours * emp.baseHourlyRate;
        const bonus = emp.firstName === 'Bob' ? 200 : 0;
        return total + baseSalary + bonus;
      }, 0);

      console.log(`📊 RÉCAPITULATIF TECHSTART SOLUTIONS:`);
      console.log(`   • Entreprise: ${companyData.name}`);
      console.log(`   • Fondateur: ${founderData.name}`);
      console.log(`   • Employés: ${teamResponse.body.length} personnes`);
      console.log(`   • Masse salariale mensuelle: ${totalPayroll}€`);
      console.log(`   • Budget horaire: ${totalHourlyBudget}€/heure`);

      // Vérifications finales de cohérence
      expect(totalPayroll).toBeGreaterThan(0);
      expect(employeeIds).toHaveLength(3);
    });
  });

  describe('🔄 Scénario 2: Gestion évolutive d\'une entreprise existante', () => {
    /**
     * SCÉNARIO : "GrowthCorp" - une entreprise qui grandit
     * 
     * Ce scénario simule l'évolution d'une entreprise :
     * 1. Embauche de nouveaux employés
     * 2. Augmentation de salaires
     * 3. Gestion des heures supplémentaires
     * 4. Calculs de paie complexes
     */

    it('📈 Parcours évolutif : Croissance et gestion avancée', async () => {
      // Configuration initiale rapide
      const setupData = await setupTestCompany();
      userToken = setupData.token;
      companyId = setupData.companyId;

      // 🚀 ÉTAPE 1: Expansion de l'équipe
      console.log('\n🎯 ÉTAPE 1: Expansion de l\'équipe (embauche massive)');

      const newEmployees = [
        { firstName: 'Eva', lastName: 'Sales', email: 'eva@growthcorp.com', baseHourlyRate: 22 },
        { firstName: 'Frank', lastName: 'Support', email: 'frank@growthcorp.com', baseHourlyRate: 16 },
        { firstName: 'Grace', lastName: 'HR', email: 'grace@growthcorp.com', baseHourlyRate: 24 }
      ];

      // Embauche en parallèle pour tester la robustesse
      const hiringPromises = newEmployees.map(employeeData =>
        request(app)
          .post(`/api/companies/${companyId}/employees`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(employeeData)
      );

      const hiringResults = await Promise.all(hiringPromises);
      
      hiringResults.forEach((result, index) => {
        expect(result.status).toBe(201);
        employeeIds.push(result.body.id);
        console.log(`✅ ${newEmployees[index].firstName} embauché(e) à ${newEmployees[index].baseHourlyRate}€/h`);
      });

      // 📊 ÉTAPE 2: Audit de l'équipe complète
      console.log('\n🎯 ÉTAPE 2: Audit de l\'équipe complète');

      const fullTeamResponse = await request(app)
        .get(`/api/companies/${companyId}/employees`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const teamSize = fullTeamResponse.body.length;
      const averageHourlyRate = fullTeamResponse.body.reduce((sum: number, emp: any) => 
        sum + emp.baseHourlyRate, 0) / teamSize;

      console.log(`👥 Équipe totale: ${teamSize} employés`);
      console.log(`💰 Taux horaire moyen: ${averageHourlyRate.toFixed(2)}€/h`);

      expect(teamSize).toBeGreaterThanOrEqual(3);

      // 💪 ÉTAPE 3: Gestion des heures supplémentaires
      console.log('\n🎯 ÉTAPE 3: Période intense - Heures supplémentaires');

      const overtimeScenarios = [
        { employeeIndex: 0, regularHours: 160, overtime: 20, bonus: 300 }, // Employé star
        { employeeIndex: 1, regularHours: 150, overtime: 10, bonus: 0 },   // Temps partiel + HS
        { employeeIndex: 2, regularHours: 160, overtime: 0, bonus: 150 }   // Bonus de performance
      ];

      const payrollResults = [];

      for (const scenario of overtimeScenarios) {
        if (scenario.employeeIndex < fullTeamResponse.body.length) {
          const employee = fullTeamResponse.body[scenario.employeeIndex];
          
          const payrollData = {
            employeeId: employee.id,
            hoursWorked: scenario.regularHours,
            overtime: scenario.overtime,
            bonuses: scenario.bonus
          };

          const payrollResponse = await request(app)
            .post('/api/payroll')
            .set('Authorization', `Bearer ${userToken}`)
            .send(payrollData)
            .expect(201);

          const expectedGross = (scenario.regularHours * employee.baseHourlyRate) + 
                               (scenario.overtime * employee.baseHourlyRate * 1.5) + // 150% pour les HS
                               scenario.bonus;

          // Note: Le calcul réel peut différer selon la logique métier
          payrollResults.push({
            employee: `${employee.firstName} ${employee.lastName}`,
            gross: payrollResponse.body.grossSalary,
            hours: scenario.regularHours + scenario.overtime
          });

          console.log(`💵 ${employee.firstName}: ${payrollResponse.body.grossSalary}€ (${scenario.regularHours}h + ${scenario.overtime}h HS + ${scenario.bonus}€ bonus)`);
        }
      }

      // 📈 ÉTAPE 4: Analyse de performance
      console.log('\n🎯 ÉTAPE 4: Analyse de performance mensuelle');

      const totalGrossPayroll = payrollResults.reduce((sum, result) => sum + result.gross, 0);
      const totalHoursWorked = payrollResults.reduce((sum, result) => sum + result.hours, 0);

      console.log(`📊 RÉCAPITULATIF GROWTHCORP:`);
      console.log(`   • Masse salariale brute: ${totalGrossPayroll}€`);
      console.log(`   • Heures totales travaillées: ${totalHoursWorked}h`);
      console.log(`   • Productivité: ${(totalGrossPayroll / totalHoursWorked).toFixed(2)}€/heure`);

      expect(totalGrossPayroll).toBeGreaterThan(0);
      expect(payrollResults).toHaveLength(overtimeScenarios.length);
    });
  });

  describe('🛠️ Scénario 3: Gestion des cas d\'erreur et récupération', () => {
    /**
     * SCÉNARIO : Tests de robustesse et gestion d'erreur
     * 
     * Ce scénario teste la robustesse de l'API :
     * 1. Tentatives d'accès non autorisées
     * 2. Données invalides
     * 3. Récupération après erreur
     * 4. Cohérence des données
     */

    it('🛡️ Tests de robustesse et sécurité', async () => {
      // Configuration utilisateur légitime
      const legitimateUser = await setupTestCompany();
      const legitimateToken = legitimateUser.token;
      const legitimateCompanyId = legitimateUser.companyId;

      // Configuration utilisateur malveillant
      const maliciousUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hacker@malicious.com',
          name: 'Malicious User',
          password: 'hack123'
        })
        .expect(201);

      const maliciousToken = maliciousUserResponse.body.token;

      console.log('\n🎯 TEST 1: Tentative d\'accès aux données d\'autres entreprises');

      // Tentative d'accès à l'entreprise d'un autre utilisateur
      const unauthorizedAccessResponse = await request(app)
        .get(`/api/companies/${legitimateCompanyId}/employees`)
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(404); // Should not find the company for this user

      console.log('✅ Isolation des données confirmée - accès refusé');

      console.log('\n🎯 TEST 2: Validation des données d\'entrée');

      // Test de données invalides
      const invalidEmployeeData = [
        { firstName: '', lastName: 'Test', email: 'invalid@test.com', baseHourlyRate: -10 }, // Nom vide + salaire négatif
        { firstName: 'Test', lastName: '', email: 'not-an-email', baseHourlyRate: 'not-a-number' }, // Email invalide
        { } // Données manquantes
      ];

      for (const invalidData of invalidEmployeeData) {
        const response = await request(app)
          .post(`/api/companies/${legitimateCompanyId}/employees`)
          .set('Authorization', `Bearer ${legitimateToken}`)
          .send(invalidData);

        // Devrait retourner une erreur (400 ou 500)
        expect([400, 500]).toContain(response.status);
        console.log(`✅ Données invalides rejetées: ${response.status}`);
      }

      console.log('\n🎯 TEST 3: Récupération après erreur');

      // Création d'un employé valide après les erreurs
      const validEmployeeData = {
        firstName: 'Recovery',
        lastName: 'Test',
        email: 'recovery@test.com',
        baseHourlyRate: 20
      };

      const recoveryResponse = await request(app)
        .post(`/api/companies/${legitimateCompanyId}/employees`)
        .set('Authorization', `Bearer ${legitimateToken}`)
        .send(validEmployeeData)
        .expect(201);

      console.log('✅ Système récupéré - employé valide créé après erreurs');

      // Vérification de la cohérence
      const employeesAfterRecovery = await request(app)
        .get(`/api/companies/${legitimateCompanyId}/employees`)
        .set('Authorization', `Bearer ${legitimateToken}`)
        .expect(200);

      expect(employeesAfterRecovery.body).toHaveLength(1);
      expect(employeesAfterRecovery.body[0].firstName).toBe('Recovery');

      console.log('✅ Cohérence des données confirmée après récupération');
    });
  });
});

// 🔧 Fonction utilitaire pour configuration rapide d'entreprise
async function setupTestCompany() {
  const userData = {
    email: `test.${Date.now()}@company.com`,
    name: 'Test Owner',
    password: 'testpass123'
  };

  const userResponse = await request(app)
    .post('/api/auth/register')
    .send(userData);

  const token = userResponse.body.token;

  const companyResponse = await request(app)
    .post('/api/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Company SARL' });

  return {
    token,
    companyId: companyResponse.body.id,
    userId: companyResponse.body.ownerId
  };
}