/**
 * Connecteur Sage - Export des données de paie vers Sage
 * Supporte les formats TRA (Transactions) et PNM (Plan de comptes)
 */

import prisma from '../lib/db';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Configuration du connecteur Sage
 */
export interface SageConfig {
  formatType: 'TRA' | 'PNM';  // Format d'export
  accountMapping: {
    salaryExpense: string;      // Compte de charges de salaires (ex: "6411")
    socialCharges: string;      // Compte de cotisations patronales (ex: "6451")
    socialDebt: string;         // Compte de dettes sociales (ex: "431")
    employeeDebt: string;       // Compte de dettes envers employés (ex: "421")
    taxCharges: string;         // Compte de charges fiscales (ex: "6311")
  };
  exportPath?: string;          // Chemin d'export des fichiers (optionnel)
  journalCode?: string;         // Code journal (ex: "PAI" pour paie)
}

/**
 * Ligne d'écriture comptable
 */
interface AccountingEntry {
  date: string;           // Format AAAAMMJJ
  journalCode: string;    // Code journal
  accountNumber: string;  // Numéro de compte
  label: string;          // Libellé de l'écriture
  debit: number;          // Montant débit
  credit: number;         // Montant crédit
  piece?: string;         // Numéro de pièce
}

/**
 * Génère un fichier au format TRA (Transaction) pour Sage
 * Format : Lignes d'écritures avec séparateurs de champs
 */
export function generateTRAFormat(entries: AccountingEntry[]): string {
  const lines: string[] = [];

  entries.forEach(entry => {
    // Format TRA : DATE|JOURNAL|COMPTE|LIBELLE|DEBIT|CREDIT|PIECE
    const line = [
      entry.date,
      entry.journalCode,
      entry.accountNumber,
      entry.label.substring(0, 30), // Limite à 30 caractères
      formatAmount(entry.debit),
      formatAmount(entry.credit),
      entry.piece || ''
    ].join('|');

    lines.push(line);
  });

  return lines.join('\n');
}

/**
 * Génère un fichier au format PNM (Plan de comptes) pour Sage
 * Format : Structure hiérarchique des comptes
 */
export function generatePNMFormat(entries: AccountingEntry[]): string {
  const lines: string[] = [];
  const accounts = new Set<string>();

  // Extraire tous les comptes uniques
  entries.forEach(entry => accounts.add(entry.accountNumber));

  // Générer les lignes PNM
  accounts.forEach(account => {
    // Format PNM simplifié : COMPTE|TYPE|LIBELLE
    const type = account.startsWith('6') ? 'CHG' : 'DET'; // CHG = Charge, DET = Dette
    const label = getAccountLabel(account);
    lines.push(`${account}|${type}|${label}`);
  });

  return lines.join('\n');
}

/**
 * Formate un montant pour l'export Sage
 * Format : montant avec 2 décimales, virgule comme séparateur
 */
function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/**
 * Retourne le libellé d'un compte selon le plan comptable français
 */
function getAccountLabel(account: string): string {
  const labels: { [key: string]: string } = {
    '6411': 'Salaires bruts',
    '6451': 'Cotisations sociales patronales',
    '6311': 'Taxes sur salaires',
    '421': 'Personnel - rémunérations dues',
    '431': 'Sécurité sociale',
    '437': 'Autres organismes sociaux'
  };
  return labels[account] || `Compte ${account}`;
}

/**
 * Valide et sécurise un chemin d'export pour éviter les path traversal
 */
function validateExportPath(exportPath: string): string {
  // Normaliser le chemin pour résoudre les ../ et ./
  const normalizedPath = path.normalize(exportPath);

  // Vérifier qu'il n'y a pas de tentative de remontée de répertoire
  if (normalizedPath.includes('..')) {
    throw new Error('Chemin d\'export invalide : tentative de path traversal détectée');
  }

  // Vérifier que le chemin ne commence pas par / (chemin absolu)
  if (path.isAbsolute(normalizedPath)) {
    throw new Error('Chemin d\'export invalide : seuls les chemins relatifs sont autorisés');
  }

  return normalizedPath;
}

/**
 * Valide le format de la période de paie (YYYY-MM)
 */
function validatePayPeriod(payPeriod: string): void {
  const periodRegex = /^\d{4}-\d{2}$/;
  if (!periodRegex.test(payPeriod)) {
    throw new Error('Format de période invalide. Format attendu : YYYY-MM (ex: 2025-11)');
  }

  // Vérifier que le mois est valide (01-12)
  const [year, month] = payPeriod.split('-');
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Mois invalide. Doit être entre 01 et 12');
  }

  // Vérifier que l'année est raisonnable (2000-2100)
  const yearNum = parseInt(year, 10);
  if (yearNum < 2000 || yearNum > 2100) {
    throw new Error('Année invalide. Doit être entre 2000 et 2100');
  }
}

/**
 * Exporte les données de paie d'une période vers Sage
 */
export async function exportPayrollToSage(
  companyId: string,
  payPeriod: string,
  config: SageConfig
): Promise<{ filePath: string; recordCount: number }> {
  // Valider le format de la période
  validatePayPeriod(payPeriod);

  // Récupérer toutes les fiches de paie de la période
  const fichesPaie = await prisma.fichePaie.findMany({
    where: {
      employee: {
        compagnieId: companyId
      },
      payPeriod: payPeriod
    },
    include: {
      employee: true,
      lignesCotisations: true
    }
  });

  if (fichesPaie.length === 0) {
    throw new Error(`Aucune fiche de paie trouvée pour la période ${payPeriod}`);
  }

  // Générer les écritures comptables
  const entries: AccountingEntry[] = [];
  const journalCode = config.journalCode || 'PAI';
  const date = payPeriod.replace('-', '') + '01'; // Format AAAAMMJJ

  fichesPaie.forEach((fiche: any) => {
    // 1. Écriture de salaire brut
    entries.push({
      date,
      journalCode,
      accountNumber: config.accountMapping.salaryExpense,
      label: `Salaire ${fiche.employee.prenom} ${fiche.employee.nom}`,
      debit: fiche.salaireBrut,
      credit: 0,
      piece: `PAIE-${payPeriod}`
    });

    // 2. Cotisations salariales (réduction du net)
    if (fiche.totalCotisationsSalariales && fiche.totalCotisationsSalariales > 0) {
      entries.push({
        date,
        journalCode,
        accountNumber: config.accountMapping.socialDebt,
        label: `Cotisations salariales ${fiche.employee.prenom} ${fiche.employee.nom}`,
        debit: 0,
        credit: fiche.totalCotisationsSalariales,
        piece: `PAIE-${payPeriod}`
      });
    }

    // 3. Cotisations patronales
    if (fiche.totalCotisationsPatronales && fiche.totalCotisationsPatronales > 0) {
      entries.push({
        date,
        journalCode,
        accountNumber: config.accountMapping.socialCharges,
        label: `Cotisations patronales ${fiche.employee.prenom} ${fiche.employee.nom}`,
        debit: fiche.totalCotisationsPatronales,
        credit: 0,
        piece: `PAIE-${payPeriod}`
      });

      entries.push({
        date,
        journalCode,
        accountNumber: config.accountMapping.socialDebt,
        label: `Dette sociale ${fiche.employee.prenom} ${fiche.employee.nom}`,
        debit: 0,
        credit: fiche.totalCotisationsPatronales,
        piece: `PAIE-${payPeriod}`
      });
    }

    // 4. Net à payer
    entries.push({
      date,
      journalCode,
      accountNumber: config.accountMapping.employeeDebt,
      label: `Net à payer ${fiche.employee.prenom} ${fiche.employee.nom}`,
      debit: 0,
      credit: fiche.salaireNet,
      piece: `PAIE-${payPeriod}`
    });
  });

  // Générer le fichier au format demandé
  const content = config.formatType === 'TRA'
    ? generateTRAFormat(entries)
    : generatePNMFormat(entries);

  // Valider et sécuriser le chemin d'export
  const exportPath = validateExportPath(config.exportPath || './exports');
  const fileName = `sage_export_${payPeriod}.${config.formatType.toLowerCase()}`;
  const filePath = path.join(exportPath, fileName);

  // Créer le dossier s'il n'existe pas
  await fs.mkdir(exportPath, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');

  return {
    filePath,
    recordCount: entries.length
  };
}

/**
 * Valide la configuration Sage
 */
export function validateSageConfig(config: any): config is SageConfig {
  if (!config.formatType || !['TRA', 'PNM'].includes(config.formatType)) {
    throw new Error('Format invalide. Doit être TRA ou PNM');
  }

  if (!config.accountMapping) {
    throw new Error('Le mapping des comptes est requis');
  }

  const required = ['salaryExpense', 'socialCharges', 'socialDebt', 'employeeDebt', 'taxCharges'];
  for (const field of required) {
    if (!config.accountMapping[field]) {
      throw new Error(`Le compte ${field} est requis dans le mapping`);
    }
  }

  return true;
}
