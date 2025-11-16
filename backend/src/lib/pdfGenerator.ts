/**
 * Module de génération de PDF pour les fiches de paie
 * Utilise PDFKit pour créer des documents PDF professionnels
 */

import PDFDocument from 'pdfkit';
import { Payslip, FichePaieDetaille } from './payroll';
import { LigneCotisation } from './moteurCotisations';

export interface PayslipWithEmployee extends Payslip {
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail?: string;
  companyName?: string;
}

/**
 * Génère un PDF pour une fiche de paie
 * @param payslip - La fiche de paie avec les informations de l'employé
 * @returns Un stream PDFDocument
 */
export function generatePayslipPDF(payslip: PayslipWithEmployee): PDFKit.PDFDocument {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Fiche de paie - ${payslip.employeeFirstName} ${payslip.employeeLastName} - ${payslip.payPeriod}`,
      Author: 'OpenPayFit',
      Subject: 'Fiche de paie',
    }
  });

  // Couleurs
  const primaryColor = '#2563eb'; // Bleu
  const grayColor = '#6b7280';
  const lightGrayColor = '#f3f4f6';

  // En-tête du document
  doc
    .fontSize(24)
    .fillColor(primaryColor)
    .text('FICHE DE PAIE', { align: 'center' })
    .moveDown(0.5);

  // Période de paie
  doc
    .fontSize(14)
    .fillColor(grayColor)
    .text(`Période : ${formatPeriod(payslip.payPeriod)}`, { align: 'center' })
    .moveDown(1.5);

  // Informations sur l'entreprise (si disponible)
  if (payslip.companyName) {
    doc
      .fontSize(12)
      .fillColor('#000000')
      .text('ENTREPRISE', { underline: true })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor(grayColor)
      .text(payslip.companyName)
      .moveDown(1);
  }

  // Informations sur l'employé
  doc
    .fontSize(12)
    .fillColor('#000000')
    .text('SALARIÉ', { underline: true })
    .moveDown(0.3)
    .fontSize(10)
    .fillColor(grayColor)
    .text(`Nom : ${payslip.employeeFirstName} ${payslip.employeeLastName}`);

  if (payslip.employeeEmail) {
    doc.text(`Email : ${payslip.employeeEmail}`);
  }

  doc.moveDown(1.5);

  // Ligne de séparation
  doc
    .strokeColor(lightGrayColor)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  // Détails de la rémunération
  doc
    .fontSize(14)
    .fillColor(primaryColor)
    .text('DÉTAIL DE LA RÉMUNÉRATION', { underline: true })
    .moveDown(1);

  // Tableau des montants
  const tableTop = doc.y;
  const col1X = 50;
  const col2X = 400;

  // Fonction helper pour ajouter une ligne au tableau
  const addTableRow = (label: string, amount: number, bold = false) => {
    const y = doc.y;

    // Fond gris clair pour certaines lignes
    if (bold) {
      doc
        .rect(col1X - 5, y - 5, 500, 25)
        .fillAndStroke(lightGrayColor, lightGrayColor);
    }

    doc
      .fontSize(bold ? 12 : 10)
      .fillColor('#000000')
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, col1X, y)
      .text(formatCurrency(amount), col2X, y, { width: 145, align: 'right' });

    doc.moveDown(bold ? 1 : 0.7);
  };

  // Lignes du tableau
  addTableRow('Salaire brut', payslip.grossSalary);

  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .fillColor(grayColor)
    .text('COTISATIONS SOCIALES', col1X)
    .moveDown(0.5);

  addTableRow('Cotisations salariales (25%)', payslip.deductions);

  doc.moveDown(0.5);

  // Ligne de séparation avant le net
  doc
    .strokeColor(primaryColor)
    .lineWidth(2)
    .moveTo(col1X, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(0.5);

  // Salaire net (en gras et mis en évidence)
  addTableRow('SALAIRE NET À PAYER', payslip.netSalary, true);

  // Ligne de séparation finale
  doc
    .strokeColor(primaryColor)
    .lineWidth(2)
    .moveTo(col1X, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(2);

  // Note informative
  doc
    .fontSize(9)
    .fillColor(grayColor)
    .text(
      'Note : Les cotisations sociales sont calculées à un taux simplifié de 25% du salaire brut pour ce MVP.',
      {
        align: 'justify',
        width: 495,
      }
    )
    .moveDown(1);

  // Pied de page
  const bottomY = 750;
  doc
    .fontSize(8)
    .fillColor(grayColor)
    .text(
      `Document généré le ${formatDate(new Date())} par OpenPayFit`,
      50,
      bottomY,
      { align: 'center', width: 495 }
    )
    .text(
      `ID de la fiche : ${payslip.id}`,
      50,
      bottomY + 15,
      { align: 'center', width: 495 }
    );

  // Finaliser le document
  doc.end();

  return doc;
}

/**
 * Formate une période au format YYYY-MM en "Mois Année"
 */
function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]} ${year}`;
}

/**
 * Formate un montant en euros
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formate une date
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Génère un PDF détaillé pour une fiche de paie avec cotisations détaillées
 * @param fichePaie - La fiche de paie avec détails des cotisations
 * @param companyName - Nom de l'entreprise (optionnel)
 * @returns Un stream PDFDocument
 */
export function generateDetailedPayslipPDF(
  fichePaie: FichePaieDetaille,
  companyName?: string
): PDFKit.PDFDocument {
  // Créer un nouveau document PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Fiche de paie - ${fichePaie.employeeFirstName} ${fichePaie.employeeLastName} - ${fichePaie.payPeriod}`,
      Author: 'OpenPayFit',
      Subject: 'Fiche de paie détaillée',
    }
  });

  // Couleurs
  const primaryColor = '#2563eb'; // Bleu
  const grayColor = '#6b7280';
  const lightGrayColor = '#f3f4f6';

  // En-tête du document
  doc
    .fontSize(24)
    .fillColor(primaryColor)
    .text('FICHE DE PAIE', { align: 'center' })
    .moveDown(0.5);

  // Période de paie
  doc
    .fontSize(14)
    .fillColor(grayColor)
    .text(`Période : ${formatPeriod(fichePaie.payPeriod)}`, { align: 'center' })
    .moveDown(1.5);

  // Informations sur l'entreprise
  if (companyName) {
    doc
      .fontSize(12)
      .fillColor('#000000')
      .text('ENTREPRISE', { underline: true })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor(grayColor)
      .text(companyName)
      .moveDown(1);
  }

  // Informations sur l'employé
  doc
    .fontSize(12)
    .fillColor('#000000')
    .text('SALARIÉ', { underline: true })
    .moveDown(0.3)
    .fontSize(10)
    .fillColor(grayColor)
    .text(`Nom : ${fichePaie.employeeFirstName} ${fichePaie.employeeLastName}`)
    .moveDown(1.5);

  // Ligne de séparation
  doc
    .strokeColor(lightGrayColor)
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  // Détails de la rémunération
  doc
    .fontSize(14)
    .fillColor(primaryColor)
    .text('DÉTAIL DE LA RÉMUNÉRATION', { underline: true })
    .moveDown(1);

  // Salaire brut
  const col1X = 50;
  const col2X = 400;

  doc
    .fontSize(11)
    .fillColor('#000000')
    .text('Salaire brut', col1X)
    .text(formatCurrency(fichePaie.grossSalary), col2X, doc.y - 11, { width: 145, align: 'right' })
    .moveDown(1);

  // Détails des cotisations par catégorie
  doc
    .fontSize(12)
    .fillColor(primaryColor)
    .text('COTISATIONS SOCIALES', col1X)
    .moveDown(0.5);

  // Grouper les lignes par catégorie
  const lignesParCategorie = new Map<string, LigneCotisation[]>();
  for (const ligne of fichePaie.lignesCotisations) {
    if (!lignesParCategorie.has(ligne.categorie)) {
      lignesParCategorie.set(ligne.categorie, []);
    }
    lignesParCategorie.get(ligne.categorie)!.push(ligne);
  }

  // Afficher chaque catégorie et ses lignes
  for (const [categorie, lignes] of lignesParCategorie.entries()) {
    // Vérifier s'il reste assez d'espace, sinon nouvelle page
    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc
      .fontSize(10)
      .fillColor(grayColor)
      .font('Helvetica-Bold')
      .text(categorie.toUpperCase(), col1X)
      .moveDown(0.3);

    for (const ligne of lignes) {
      // Vérifier l'espace disponible
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      const currentY = doc.y;

      doc
        .fontSize(9)
        .fillColor('#000000')
        .font('Helvetica')
        .text(`${ligne.nom}`, col1X + 10, currentY, { width: 280 });

      // Part salariale
      if (ligne.montantSalarial > 0) {
        doc
          .fontSize(8)
          .fillColor(grayColor)
          .text(`Sal.: ${formatCurrency(ligne.montantSalarial)}`, col2X - 80, currentY, { width: 80, align: 'right' });
      }

      // Part patronale
      if (ligne.montantPatronal > 0) {
        doc
          .fontSize(8)
          .fillColor(grayColor)
          .text(`Pat.: ${formatCurrency(ligne.montantPatronal)}`, col2X, currentY, { width: 145, align: 'right' });
      } else if (ligne.montantSalarial > 0) {
        // Si seulement salarial, aligner à droite
        doc
          .fontSize(8)
          .fillColor(grayColor)
          .text(`${formatCurrency(ligne.montantSalarial)}`, col2X, currentY, { width: 145, align: 'right' });
      }

      doc.moveDown(0.5);
    }

    doc.moveDown(0.3);
  }

  // Ligne de séparation
  doc
    .strokeColor(lightGrayColor)
    .lineWidth(1)
    .moveTo(col1X, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(0.5);

  // Totaux des cotisations
  const addTotalRow = (label: string, amount: number, bold = false) => {
    const y = doc.y;

    if (bold) {
      doc
        .rect(col1X - 5, y - 5, 500, 20)
        .fillAndStroke(lightGrayColor, lightGrayColor);
    }

    doc
      .fontSize(bold ? 11 : 10)
      .fillColor('#000000')
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, col1X, y)
      .text(formatCurrency(amount), col2X, y, { width: 145, align: 'right' });

    doc.moveDown(0.7);
  };

  addTotalRow('Total cotisations salariales', fichePaie.totalCotisationsSalariales);
  addTotalRow('Total cotisations patronales', fichePaie.totalCotisationsPatronales);

  doc.moveDown(0.5);

  // Ligne de séparation avant le net
  doc
    .strokeColor(primaryColor)
    .lineWidth(2)
    .moveTo(col1X, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(0.5);

  // Salaire net (en gras et mis en évidence)
  addTotalRow('SALAIRE NET À PAYER', fichePaie.netSalary, true);

  // Ligne de séparation
  doc
    .strokeColor(primaryColor)
    .lineWidth(2)
    .moveTo(col1X, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(1);

  // Coût total employeur
  doc
    .fontSize(10)
    .fillColor(grayColor)
    .font('Helvetica')
    .text('Coût total employeur', col1X)
    .text(formatCurrency(fichePaie.coutTotal), col2X, doc.y - 11, { width: 145, align: 'right' })
    .moveDown(1.5);

  // Note informative
  doc
    .fontSize(9)
    .fillColor(grayColor)
    .text(
      'Ce bulletin de paie a été généré avec des cotisations sociales détaillées conformes à la réglementation française en vigueur.',
      {
        align: 'justify',
        width: 495,
      }
    );

  // Pied de page
  const bottomY = 750;
  doc
    .fontSize(8)
    .fillColor(grayColor)
    .text(
      `Document généré le ${formatDate(new Date())} par OpenPayFit`,
      50,
      bottomY,
      { align: 'center', width: 495 }
    )
    .text(
      `ID de la fiche : ${fichePaie.id}`,
      50,
      bottomY + 15,
      { align: 'center', width: 495 }
    );

  // Finaliser le document
  doc.end();

  return doc;
}
