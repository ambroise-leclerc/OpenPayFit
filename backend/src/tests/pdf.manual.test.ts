/**
 * Test isolé pour générer un PDF de démonstration avec des données réalistes
 * Ce test peut être exécuté séparément pour produire un exemple de fiche de paie
 */

import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { generatePayslipPDF, PayslipWithEmployee } from '../lib/pdfGenerator';

const dbPath = path.join(__dirname, '../../prisma/test.db');

describe('PDF Generation - Manual Inspection', () => {
  it('should generate a comprehensive PDF sample with realistic data', () => {
    // Créer des données de fiche de paie réalistes
    const samplePayslip: PayslipWithEmployee = {
      id: randomUUID(),
      payPeriod: '2025-11',
      grossSalary: 3500,
      deductions: 875,
      netSalary: 2625,
      employeeId: randomUUID(),
      employeeFirstName: 'Marie',
      employeeLastName: 'Dupont',
      employeeEmail: 'marie.dupont@example.com',
      companyName: 'OpenPayFit SARL',
      createdAt: new Date().toISOString(),
    };

    // Générer le PDF
    const pdfDoc = generatePayslipPDF(samplePayslip);

    // Créer le dossier de sortie s'il n'existe pas
    const outputDir = path.join(__dirname, '../../test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sauvegarder le PDF
    const outputPath = path.join(outputDir, 'fiche-paie-demo-complete.pdf');
    const writeStream = fs.createWriteStream(outputPath);

    pdfDoc.pipe(writeStream);

    // Attendre que le PDF soit complètement écrit
    return new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => {
        // Vérifier que le fichier a été créé
        const stats = fs.statSync(outputPath);

        console.log('\n✅ PDF de démonstration généré avec succès !');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📄 Fichier : ${outputPath}`);
        console.log(`📊 Taille  : ${(stats.size / 1024).toFixed(2)} KB`);
        console.log('\n📋 Données de la fiche :');
        console.log(`   Employé    : ${samplePayslip.employeeFirstName} ${samplePayslip.employeeLastName}`);
        console.log(`   Entreprise : ${samplePayslip.companyName}`);
        console.log(`   Période    : ${samplePayslip.payPeriod}`);
        console.log(`   Brut       : ${samplePayslip.grossSalary} €`);
        console.log(`   Net        : ${samplePayslip.netSalary} €`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Assertions
        expect(stats.size).toBeGreaterThan(1000);
        expect(stats.size).toBeLessThan(1000000);

        resolve();
      });

      writeStream.on('error', reject);
    });
  });

  it('should generate multiple PDF samples with different salaries', async () => {
    const outputDir = path.join(__dirname, '../../test-output/samples');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const salaryExamples = [
      { gross: 1800, name: 'SMIC', firstName: 'Jean', lastName: 'Martin' },
      { gross: 3000, name: 'Salaire moyen', firstName: 'Sophie', lastName: 'Bernard' },
      { gross: 5500, name: 'Cadre', firstName: 'Pierre', lastName: 'Durand' },
      { gross: 8000, name: 'Cadre supérieur', firstName: 'Claire', lastName: 'Lefebvre' },
    ];

    console.log('\n📚 Génération de plusieurs exemples de fiches de paie...\n');

    const promises = salaryExamples.map((example) => {
      const payslip: PayslipWithEmployee = {
        id: randomUUID(),
        payPeriod: '2025-11',
        grossSalary: example.gross,
        deductions: Math.round(example.gross * 0.25 * 100) / 100,
        netSalary: Math.round(example.gross * 0.75 * 100) / 100,
        employeeId: randomUUID(),
        employeeFirstName: example.firstName,
        employeeLastName: example.lastName,
        employeeEmail: `${example.firstName.toLowerCase()}.${example.lastName.toLowerCase()}@example.com`,
        companyName: 'OpenPayFit SARL',
        createdAt: new Date().toISOString(),
      };

      const pdfDoc = generatePayslipPDF(payslip);
      const filename = `fiche-paie-${example.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      const outputPath = path.join(outputDir, filename);
      const writeStream = fs.createWriteStream(outputPath);

      pdfDoc.pipe(writeStream);

      return new Promise<string>((resolve, reject) => {
        writeStream.on('finish', () => {
          const stats = fs.statSync(outputPath);
          console.log(`   ✓ ${example.name.padEnd(20)} → ${filename.padEnd(35)} (${(stats.size / 1024).toFixed(2)} KB)`);
          resolve(outputPath);
        });
        writeStream.on('error', reject);
      });
    });

    const generatedFiles = await Promise.all(promises);

    console.log(`\n✅ ${generatedFiles.length} exemples générés dans : ${outputDir}\n`);

    // Vérifier que tous les fichiers ont été créés
    expect(generatedFiles).toHaveLength(salaryExamples.length);
    generatedFiles.forEach(filePath => {
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
