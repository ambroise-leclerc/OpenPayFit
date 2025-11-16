/**
 * Module de calcul de paie MVP
 *
 * Ce module implémente une logique de calcul de paie simplifiée pour le MVP.
 * Calcul : net = brut - 25% (approximation des cotisations sociales)
 *
 * MIGRATION VERS SYSTÈME DÉTAILLÉ :
 * - Les nouvelles fonctions utilisent le moteur de cotisations pour un calcul détaillé
 * - Les anciennes fonctions sont conservées pour compatibilité mais marquées comme dépréciées
 */

import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { calculerCotisations, ResultatCalcul, LigneCotisation } from './moteurCotisations';

// Utiliser la base de données appropriée selon l'environnement
const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
const dbPath = path.join(__dirname, '../../prisma', dbFileName);

// Connections à la base de données (une pour lecture, une pour écriture)
let dbReadInstance: Database.Database | null = null;
let dbWriteInstance: Database.Database | null = null;

/**
 * Récupère ou crée une connexion à la base de données
 */
function getDatabase(readonly: boolean = false): Database.Database {
  if (readonly) {
    if (!dbReadInstance || !dbReadInstance.open) {
      dbReadInstance = new Database(dbPath, { readonly: true });
    }
    return dbReadInstance;
  } else {
    if (!dbWriteInstance || !dbWriteInstance.open) {
      dbWriteInstance = new Database(dbPath, { readonly: false });
    }
    return dbWriteInstance;
  }
}

/**
 * Ferme les connexions à la base de données (utile pour les tests)
 */
export function closeDatabaseConnection(): void {
  if (dbReadInstance && dbReadInstance.open) {
    dbReadInstance.close();
    dbReadInstance = null;
  }
  if (dbWriteInstance && dbWriteInstance.open) {
    dbWriteInstance.close();
    dbWriteInstance = null;
  }
}

// Types TypeScript pour les fiches de paie
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grossSalary: number;
  companyId: string;
}

export interface Payslip {
  id: string;
  payPeriod: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  employeeId: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollRunResult {
  status: 'success' | 'error';
  payslipsGenerated: number;
  errors?: string[];
}

/**
 * Taux de cotisations sociales pour le MVP (25% du salaire brut)
 * @deprecated Ce taux est conservé uniquement pour compatibilité avec l'ancien système
 */
const DEDUCTION_RATE = 0.25;

/**
 * Valide le format de la période de paie (YYYY-MM)
 */
export function validatePayPeriod(period: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(period);
}

/**
 * Récupère tous les employés d'une entreprise
 */
export function getCompanyEmployees(companyId: string): Employee[] {
  const db = getDatabase(true);

  const employees = db.prepare(`
    SELECT id, firstName, lastName, email, grossSalary, companyId
    FROM Employee
    WHERE companyId = ?
  `).all(companyId) as Employee[];

  return employees;
}


/**
 * Vérifie si une fiche de paie existe déjà pour un employé et une période donnée
 */
export function payslipExists(employeeId: string, payPeriod: string): boolean {
  const db = getDatabase(true);

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM Payslip
    WHERE employeeId = ? AND payPeriod = ?
  `).get(employeeId, payPeriod) as { count: number };

  return result.count > 0;
}


/**
 * Récupère toutes les fiches de paie d'une entreprise pour une période donnée
 */
export function getPayslipsByPeriod(companyId: string, payPeriod: string): Payslip[] {
  const db = getDatabase(true);

  const payslips = db.prepare(`
    SELECT p.id, p.payPeriod, p.grossSalary, p.deductions, p.netSalary, p.employeeId, e.firstName as employeeFirstName, e.lastName as employeeLastName, p.createdAt, p.updatedAt
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    WHERE e.companyId = ? AND p.payPeriod = ?
    ORDER BY p.createdAt DESC
  `).all(companyId, payPeriod) as Payslip[];

  return payslips;
}

/**
 * Récupère toutes les fiches de paie d'une entreprise
 */
export function getAllPayslips(companyId: string): Payslip[] {
  const db = getDatabase(true);

  const payslips = db.prepare(`
    SELECT p.id, p.payPeriod, p.grossSalary, p.deductions, p.netSalary, p.employeeId, e.firstName as employeeFirstName, e.lastName as employeeLastName, p.createdAt, p.updatedAt
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    WHERE e.companyId = ?
    ORDER BY p.payPeriod DESC, p.createdAt DESC
  `).all(companyId) as Payslip[];

  return payslips;
}

/**
 * Récupère une fiche de paie par son ID
 */
export function getPayslipById(id: string): Payslip | null {
  const db = getDatabase(true);

  const payslip = db.prepare(`
    SELECT id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt
    FROM Payslip
    WHERE id = ?
  `).get(id) as Payslip | undefined;

  return payslip || null;
}

/**
 * Vérifie si un utilisateur est propriétaire de l'entreprise associée à une fiche de paie
 */
export function isPayslipOwner(payslipId: string, userId: string): boolean {
  const db = getDatabase(true);

  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    INNER JOIN Company c ON e.companyId = c.id
    WHERE p.id = ? AND c.ownerId = ?
  `).get(payslipId, userId) as { count: number };

  return result.count > 0;
}

// ========== NOUVEAU SYSTÈME DE PAIE DÉTAILLÉ ==========

/**
 * Fiche de paie avec détails des cotisations
 */
export interface FichePaieDetaille {
  id: string;
  payPeriod: string;
  grossSalary: number;
  netSalary: number;
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  totalChargesFiscales: number;
  coutTotal: number;
  employeeId: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  lignesCotisations: LigneCotisation[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Calcule les détails complets d'une fiche de paie avec cotisations détaillées
 *
 * Cette fonction utilise le moteur de cotisations pour calculer précisément
 * toutes les cotisations sociales selon les règles en vigueur.
 *
 * @param employeeId - ID de l'employé
 * @param payPeriod - Période de paie (format YYYY-MM)
 * @param grossSalary - Salaire brut mensuel
 * @returns Détails complets de la fiche de paie
 */
export async function calculerDetailsFichePaie(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Promise<FichePaieDetaille> {
  // Extraire l'année et le mois de la période
  const [year, month] = payPeriod.split('-');
  const dateReference = new Date(parseInt(year), parseInt(month) - 1, 15);

  // Calculer les cotisations détaillées
  const resultatCalcul = await calculerCotisations({
    salaireBrut: grossSalary,
    dateReference
  });

  // Calculer le total des charges fiscales (somme des cotisations de type CHARGE_FISCALE)
  const totalChargesFiscales = resultatCalcul.lignesCotisations
    .filter(ligne => ligne.typeCotisation === 'CHARGE_FISCALE')
    .reduce((sum, ligne) => sum + ligne.montantTotal, 0);

  // Construire l'objet FichePaieDetaille
  return {
    id: randomUUID(),
    payPeriod,
    grossSalary,
    netSalary: resultatCalcul.salaireNet,
    totalCotisationsSalariales: resultatCalcul.totalCotisationsSalariales,
    totalCotisationsPatronales: resultatCalcul.totalCotisationsPatronales,
    totalChargesFiscales,
    coutTotal: resultatCalcul.coutTotal,
    employeeId,
    lignesCotisations: resultatCalcul.lignesCotisations,
    createdAt: new Date().toISOString()
  };
}

/**
 * Crée une fiche de paie détaillée dans la base de données
 *
 * Cette fonction est une alternative moderne à createPayslip() et utilise le nouveau système
 * de calcul détaillé des cotisations. L'ancienne fonction reste disponible pour compatibilité.
 * Elle sauvegarde à la fois la fiche de paie et toutes les lignes de cotisations détaillées.
 *
 * @param employeeId - ID de l'employé
 * @param payPeriod - Période de paie (format YYYY-MM)
 * @param grossSalary - Salaire brut mensuel
 * @returns Fiche de paie créée avec détails
 * @throws Error si une fiche de paie existe déjà pour cette période
 */
export async function creerFichePaie(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Promise<FichePaieDetaille> {
  const db = getDatabase();

  // Vérifier si une fiche existe déjà
  if (payslipExists(employeeId, payPeriod)) {
    throw new Error(`Une fiche de paie existe déjà pour l'employé ${employeeId} pour la période ${payPeriod}`);
  }

  // Calculer les détails
  const fichePaie = await calculerDetailsFichePaie(employeeId, payPeriod, grossSalary);

  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  // Commencer une transaction
  const insertFichePaie = db.prepare(`
    INSERT INTO Payslip (
      id, payPeriod, grossSalary, deductions, netSalary,
      totalCotisationsSalariales, totalCotisationsPatronales, totalChargesFiscales, coutTotal,
      employeeId, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLigneCotisation = db.prepare(`
    INSERT INTO lignes_cotisation_fiche_paie (
      id, fichePaieId, code, nom, categorie, organisme, typeCotisation,
      assiette, taux, montantSalarial, montantPatronal, montantTotal,
      compteDebit, compteCredit, createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Transaction pour insérer la fiche et toutes les lignes
  const transaction = db.transaction(() => {
    // Insérer la fiche de paie
    // Pour compatibilité, on garde aussi l'ancien champ 'deductions'
    insertFichePaie.run(
      fichePaie.id,
      fichePaie.payPeriod,
      fichePaie.grossSalary,
      fichePaie.totalCotisationsSalariales, // deductions (legacy)
      fichePaie.netSalary,
      fichePaie.totalCotisationsSalariales,
      fichePaie.totalCotisationsPatronales,
      fichePaie.totalChargesFiscales,
      fichePaie.coutTotal,
      fichePaie.employeeId,
      createdAt,
      updatedAt
    );

    // Insérer toutes les lignes de cotisations
    for (const ligne of fichePaie.lignesCotisations) {
      const ligneId = randomUUID();
      insertLigneCotisation.run(
        ligneId,
        fichePaie.id,
        ligne.code,
        ligne.nom,
        ligne.categorie,
        ligne.organisme,
        ligne.typeCotisation,
        ligne.assiette,
        ligne.taux,
        ligne.montantSalarial,
        ligne.montantPatronal,
        ligne.montantTotal,
        null, // compteDebit - sera ajouté plus tard via les règles comptables
        null, // compteCredit - sera ajouté plus tard via les règles comptables
        createdAt,
        updatedAt
      );
    }
  });

  try {
    transaction();
    fichePaie.createdAt = createdAt;
    fichePaie.updatedAt = updatedAt;
    return fichePaie;
  } catch (error: any) {
    // Protection contre les race conditions : même si payslipExists() a vérifié avant,
    // une autre requête pourrait avoir créé une fiche de paie entre-temps
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Une fiche de paie existe déjà pour l'employé ${employeeId} pour la période ${payPeriod}`);
    }
    throw error;
  }
}

/**
 * Récupère les détails d'une fiche de paie avec toutes ses lignes de cotisations
 *
 * @param payslipId - ID de la fiche de paie
 * @returns Fiche de paie avec détails ou null si non trouvée
 */
export function getFichePaieDetails(payslipId: string): FichePaieDetaille | null {
  const db = getDatabase(true);

  // Récupérer la fiche de paie
  const payslip = db.prepare(`
    SELECT
      p.id, p.payPeriod, p.grossSalary, p.netSalary,
      p.totalCotisationsSalariales, p.totalCotisationsPatronales,
      p.totalChargesFiscales, p.coutTotal,
      p.employeeId, p.createdAt, p.updatedAt,
      e.firstName as employeeFirstName,
      e.lastName as employeeLastName
    FROM Payslip p
    INNER JOIN Employee e ON p.employeeId = e.id
    WHERE p.id = ?
  `).get(payslipId) as any;

  if (!payslip) {
    return null;
  }

  // Si c'est une ancienne fiche de paie (avant migration), créer une ligne "Legacy"
  if (payslip.totalCotisationsSalariales === null || payslip.totalCotisationsSalariales === undefined) {
    const lignesCotisations: LigneCotisation[] = [{
      code: 'LEGACY',
      nom: 'Cotisations sociales (Legacy - 25%)',
      categorie: 'Système simplifié',
      organisme: 'Multiple',
      typeCotisation: 'COTISATION_SALARIALE',
      assiette: payslip.grossSalary,
      taux: 0.25,
      montantSalarial: payslip.grossSalary - payslip.netSalary,
      montantPatronal: 0,
      montantTotal: payslip.grossSalary - payslip.netSalary
    }];

    return {
      id: payslip.id,
      payPeriod: payslip.payPeriod,
      grossSalary: payslip.grossSalary,
      netSalary: payslip.netSalary,
      totalCotisationsSalariales: payslip.grossSalary - payslip.netSalary,
      totalCotisationsPatronales: 0,
      totalChargesFiscales: 0,
      coutTotal: payslip.grossSalary,
      employeeId: payslip.employeeId,
      employeeFirstName: payslip.employeeFirstName,
      employeeLastName: payslip.employeeLastName,
      lignesCotisations,
      createdAt: payslip.createdAt,
      updatedAt: payslip.updatedAt
    };
  }

  // Récupérer les lignes de cotisations
  const lignes = db.prepare(`
    SELECT
      code, nom, categorie, organisme, typeCotisation,
      assiette, taux, montantSalarial, montantPatronal, montantTotal
    FROM lignes_cotisation_fiche_paie
    WHERE fichePaieId = ?
    ORDER BY categorie, nom
  `).all(payslipId) as LigneCotisation[];

  return {
    id: payslip.id,
    payPeriod: payslip.payPeriod,
    grossSalary: payslip.grossSalary,
    netSalary: payslip.netSalary,
    totalCotisationsSalariales: payslip.totalCotisationsSalariales,
    totalCotisationsPatronales: payslip.totalCotisationsPatronales,
    totalChargesFiscales: payslip.totalChargesFiscales,
    coutTotal: payslip.coutTotal,
    employeeId: payslip.employeeId,
    employeeFirstName: payslip.employeeFirstName,
    employeeLastName: payslip.employeeLastName,
    lignesCotisations: lignes,
    createdAt: payslip.createdAt,
    updatedAt: payslip.updatedAt
  };
}

/**
 * Lance le calcul de paie avec le nouveau système détaillé
 *
 * @param companyId - ID de l'entreprise
 * @param payPeriod - Période de paie (format YYYY-MM)
 * @returns Résultat du calcul de paie
 */
export async function runPayrollDetailed(
  companyId: string,
  payPeriod: string
): Promise<PayrollRunResult> {
  // Validation de la période
  if (!validatePayPeriod(payPeriod)) {
    return {
      status: 'error',
      payslipsGenerated: 0,
      errors: [`Format de période invalide: ${payPeriod}. Attendu: YYYY-MM`]
    };
  }

  const employees = getCompanyEmployees(companyId);

  if (employees.length === 0) {
    return {
      status: 'success',
      payslipsGenerated: 0,
      errors: ['Aucun employé trouvé pour cette entreprise']
    };
  }

  const errors: string[] = [];
  let generated = 0;

  for (const employee of employees) {
    try {
      await creerFichePaie(employee.id, payPeriod, employee.grossSalary);
      generated++;
    } catch (error) {
      errors.push(
        `${employee.firstName} ${employee.lastName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  return {
    status: errors.length === 0 ? 'success' : 'error',
    payslipsGenerated: generated,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ========== FONCTIONS DÉPRÉCIÉES (LEGACY) ==========

/**
 * @deprecated Utiliser creerFichePaie() à la place
 * Calcule les cotisations sociales à partir du salaire brut (système simplifié 25%)
 */
export function calculateDeductions(grossSalary: number): number {
  console.warn('calculateDeductions() est déprécié. Utilisez calculerDetailsFichePaie() pour un calcul détaillé.');
  return Math.round(grossSalary * DEDUCTION_RATE * 100) / 100;
}

/**
 * @deprecated Utiliser creerFichePaie() à la place
 * Calcule le salaire net à partir du salaire brut (système simplifié 25%)
 */
export function calculateNetSalary(grossSalary: number): number {
  console.warn('calculateNetSalary() est déprécié. Utilisez calculerDetailsFichePaie() pour un calcul détaillé.');
  const deductions = calculateDeductions(grossSalary);
  return Math.round((grossSalary - deductions) * 100) / 100;
}

/**
 * @deprecated Utiliser creerFichePaie() à la place
 * Crée une fiche de paie avec le système simplifié (25%)
 */
export function createPayslip(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Payslip {
  console.warn('createPayslip() est déprécié. Utilisez creerFichePaie() pour un calcul détaillé des cotisations.');
  const db = getDatabase();

  const id = randomUUID();
  const deductions = calculateDeductions(grossSalary);
  const netSalary = calculateNetSalary(grossSalary);
  const createdAt = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO Payslip (id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, payPeriod, grossSalary, deductions, netSalary, employeeId, createdAt, createdAt);

    return {
      id,
      payPeriod,
      grossSalary,
      deductions,
      netSalary,
      employeeId,
      createdAt
    };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`Une fiche de paie existe déjà pour l'employé ${employeeId} pour la période ${payPeriod}`);
    }
    throw error;
  }
}

/**
 * @deprecated Utiliser runPayrollDetailed() à la place
 * Lance le calcul de paie avec le système simplifié (25%)
 */
export function runPayroll(companyId: string, payPeriod: string): PayrollRunResult {
  console.warn('runPayroll() est déprécié. Utilisez runPayrollDetailed() pour un calcul détaillé des cotisations.');

  // Validation de la période
  if (!validatePayPeriod(payPeriod)) {
    return {
      status: 'error',
      payslipsGenerated: 0,
      errors: [`Format de période invalide: ${payPeriod}. Attendu: YYYY-MM`]
    };
  }

  const employees = getCompanyEmployees(companyId);

  if (employees.length === 0) {
    return {
      status: 'success',
      payslipsGenerated: 0,
      errors: ['Aucun employé trouvé pour cette entreprise']
    };
  }

  const errors: string[] = [];
  let generated = 0;

  for (const employee of employees) {
    try {
      createPayslip(employee.id, payPeriod, employee.grossSalary);
      generated++;
    } catch (error) {
      errors.push(
        `${employee.firstName} ${employee.lastName}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    }
  }

  return {
    status: errors.length === 0 ? 'success' : 'error',
    payslipsGenerated: generated,
    errors: errors.length > 0 ? errors : undefined
  };
}
