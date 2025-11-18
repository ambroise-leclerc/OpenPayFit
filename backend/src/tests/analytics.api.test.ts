// backend/src/tests/analytics.api.test.ts
import request from 'supertest';
import app from '../index';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET as string;
const cheminBd = path.join(__dirname, '../../prisma/test.db');

interface Utilisateur {
  id: string;
  email: string;
}

interface Entreprise {
  id: string;
  nom: string;
  proprietaireId: string;
}

interface Employe {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  salaireBrut: number;
  departement: string | null;
  entrepriseId: string;
}

describe.skip('Endpoints API Analytics (nécessite Prisma - ignoré en CI)', () => {
  let bd: DatabaseType;
  let utilisateur1: Utilisateur, entreprise1: Entreprise, jeton1: string;
  let employe1: Employe, employe2: Employe;

  beforeAll(() => {
    bd = new Database(cheminBd);

    // Nettoyage de la base de données de test
    bd.exec('DELETE FROM expenses');
    bd.exec('DELETE FROM leaves');
    bd.exec('DELETE FROM Payslip');
    bd.exec('DELETE FROM Employee');
    bd.exec('DELETE FROM Company');
    bd.exec('DELETE FROM User');

    // Création d'un utilisateur
    const utilisateur1Id = randomUUID();
    bd.prepare(`INSERT INTO User (id, email, motDePasse, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(utilisateur1Id, 'utilisateur1@test.com', 'p1', 'USER');

    utilisateur1 = { id: utilisateur1Id, email: 'utilisateur1@test.com' };

    // Création d'une entreprise
    const entreprise1Id = randomUUID();
    bd.prepare(`INSERT INTO Company (id, nom, proprietaireId, createdAt, updatedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`)
      .run(entreprise1Id, 'Entreprise Analytics', utilisateur1.id);

    entreprise1 = { id: entreprise1Id, nom: 'Entreprise Analytics', proprietaireId: utilisateur1.id };

    // Création de 2 employés avec départements
    const emp1Id = randomUUID();
    const emp2Id = randomUUID();
    bd.prepare(`INSERT INTO Employee (id, prenom, nom, email, salaireBrut, department, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(emp1Id, 'Alice', 'Martin', 'alice@entreprise.com', 45000, 'Tech', entreprise1.id);
    bd.prepare(`INSERT INTO Employee (id, prenom, nom, email, salaireBrut, department, compagnieId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(emp2Id, 'Bob', 'Dupont', 'bob@entreprise.com', 50000, 'Commercial', entreprise1.id);

    employe1 = { id: emp1Id, prenom: 'Alice', nom: 'Martin', email: 'alice@entreprise.com', salaireBrut: 45000, departement: 'Tech', entrepriseId: entreprise1.id };
    employe2 = { id: emp2Id, prenom: 'Bob', nom: 'Dupont', email: 'bob@entreprise.com', salaireBrut: 50000, departement: 'Commercial', entrepriseId: entreprise1.id };

    // Création de quelques fiches de paie
    bd.prepare(`INSERT INTO Payslip (id, employeeId, payPeriod, grossSalary, deductions, netSalary, totalCotisationsSalariales, totalCotisationsPatronales, totalChargesFiscales, coutTotal, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp1Id, '2025-01', 45000, 10000, 35000, 10000, 15000, 2000, 60000);
    bd.prepare(`INSERT INTO Payslip (id, employeeId, payPeriod, grossSalary, deductions, netSalary, totalCotisationsSalariales, totalCotisationsPatronales, totalChargesFiscales, coutTotal, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp2Id, '2025-01', 50000, 11000, 39000, 11000, 16000, 2200, 66000);

    // Création de quelques congés
    bd.prepare(`INSERT INTO leaves (id, employeeId, type, status, startDate, endDate, days, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp1Id, 'PAID_LEAVE', 'APPROVED', '2025-02-10', '2025-02-14', 5);
    bd.prepare(`INSERT INTO leaves (id, employeeId, type, status, startDate, endDate, days, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp2Id, 'SICK_LEAVE', 'APPROVED', '2025-02-12', '2025-02-13', 2);

    // Création de quelques notes de frais
    bd.prepare(`INSERT INTO expenses (id, employeeId, category, status, amount, date, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp1Id, 'TRANSPORT', 'APPROVED', 150.50, '2025-02-05', 'Train Paris-Lyon');
    bd.prepare(`INSERT INTO expenses (id, employeeId, category, status, amount, date, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp2Id, 'MEAL', 'PENDING', 45.00, '2025-02-06', 'Déjeuner client');
    bd.prepare(`INSERT INTO expenses (id, employeeId, category, status, amount, date, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(randomUUID(), emp1Id, 'EQUIPMENT', 'APPROVED', 800.00, '2025-02-08', 'Nouveau laptop');

    // Génération du jeton JWT
    jeton1 = jwt.sign({ userId: utilisateur1.id }, JWT_SECRET);

    bd.close();
  });

  afterAll(() => {
    // Nettoyage des données de test après l'exécution de tous les tests
    bd = new Database(cheminBd);
    bd.exec('DELETE FROM expenses');
    bd.exec('DELETE FROM leaves');
    bd.exec('DELETE FROM Payslip');
    bd.exec('DELETE FROM Employee');
    bd.exec('DELETE FROM Company');
    bd.exec('DELETE FROM User');
    bd.close();
  });

  describe('GET /api/companies/:companyId/analytics/payroll', () => {
    it('doit retourner les données de masse salariale', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/payroll`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
      expect(Array.isArray(reponse.body)).toBe(true);
      expect(reponse.body.length).toBeGreaterThan(0);

      // Vérifier la structure des données
      if (reponse.body.length > 0) {
        expect(reponse.body[0]).toHaveProperty('periode');
        expect(reponse.body[0]).toHaveProperty('totalBrut');
        expect(reponse.body[0]).toHaveProperty('totalNet');
        expect(reponse.body[0]).toHaveProperty('nombre');
      }
    });

    it('doit retourner 401 sans jeton d\'authentification', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/payroll`);

      expect(reponse.statusCode).toEqual(401);
    });
  });

  describe('GET /api/companies/:companyId/analytics/headcount', () => {
    it('doit retourner la répartition des effectifs par département', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/headcount`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
      expect(Array.isArray(reponse.body)).toBe(true);
      expect(reponse.body.length).toBeGreaterThan(0);

      // Vérifier la structure des données
      expect(reponse.body[0]).toHaveProperty('departement');
      expect(reponse.body[0]).toHaveProperty('nombre');

      // Vérifier que nous avons au moins les départements Tech et Commercial
      const departements = reponse.body.map((d: any) => d.departement);
      expect(departements).toContain('Tech');
      expect(departements).toContain('Commercial');
    });
  });

  describe('GET /api/companies/:companyId/analytics/leaves', () => {
    it('doit retourner les statistiques de congés', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/leaves`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
      expect(reponse.body).toHaveProperty('totalJours');
      expect(reponse.body).toHaveProperty('tauxAbsence');
      expect(reponse.body).toHaveProperty('parType');
      expect(reponse.body).toHaveProperty('parStatut');

      // Vérifier les valeurs
      expect(reponse.body.totalJours).toBeGreaterThan(0);
      expect(typeof reponse.body.tauxAbsence).toBe('number');
    });
  });

  describe('GET /api/companies/:companyId/analytics/expenses', () => {
    it('doit retourner les statistiques de notes de frais', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/expenses`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
      expect(reponse.body).toHaveProperty('montantTotal');
      expect(reponse.body).toHaveProperty('parCategorie');
      expect(reponse.body).toHaveProperty('parStatut');
      expect(reponse.body).toHaveProperty('topDepenses');

      // Vérifier les valeurs
      expect(reponse.body.montantTotal).toBeGreaterThan(0);
      expect(Array.isArray(reponse.body.topDepenses)).toBe(true);

      // Vérifier la structure des top dépenses
      if (reponse.body.topDepenses.length > 0) {
        expect(reponse.body.topDepenses[0]).toHaveProperty('nomEmploye');
        expect(reponse.body.topDepenses[0]).toHaveProperty('categorie');
        expect(reponse.body.topDepenses[0]).toHaveProperty('montant');
        expect(reponse.body.topDepenses[0]).toHaveProperty('description');
      }
    });

    it('doit supporter le paramètre limit pour les top dépenses', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/expenses?limit=1`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
      expect(reponse.body.topDepenses.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Filtrage par période', () => {
    it('doit supporter le filtrage par mois', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/payroll?period=month&year=2025&month=1`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
    });

    it('doit supporter le filtrage par trimestre', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/leaves?period=quarter&year=2025&quarter=1`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
    });

    it('doit supporter le filtrage par année', async () => {
      const reponse = await request(app)
        .get(`/api/companies/${entreprise1.id}/analytics/expenses?period=year&year=2025`)
        .set('Authorization', `Bearer ${jeton1}`);

      expect(reponse.statusCode).toEqual(200);
    });
  });
});
