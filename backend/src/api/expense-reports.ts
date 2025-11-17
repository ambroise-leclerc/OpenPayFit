import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Validation des enums
const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;
const VALID_CATEGORIES = ['TRANSPORT', 'MEAL', 'ACCOMMODATION', 'EQUIPMENT', 'OTHER'] as const;

type ExpenseStatus = typeof VALID_STATUSES[number];
type ExpenseCategory = typeof VALID_CATEGORIES[number];

function isValidStatus(status: string): status is ExpenseStatus {
  return VALID_STATUSES.includes(status as ExpenseStatus);
}

function isValidCategory(category: string): category is ExpenseCategory {
  return VALID_CATEGORIES.includes(category as ExpenseCategory);
}

// Définition des types pour les paramètres d'URL
interface CompanyParams {
  companyId: string;
}

interface ReportParams extends CompanyParams {
  reportId: string;
}

interface ItemParams extends ReportParams {
  itemId: string;
}

// Configuration de multer pour l'upload de fichiers
const uploadsDir = path.join(__dirname, '../../uploads/receipts');

// Créer le dossier d'uploads s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Générer un nom de fichier unique avec timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

// Filtrer les types de fichiers acceptés
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier invalide. Seuls les fichiers JPG, PNG et PDF sont autorisés.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB
  }
});

const router = Router({ mergeParams: true });

// Fonction helper pour transformer les objets expense report avec employee
function transformExpenseReportWithEmployee(report: any) {
  return {
    ...report,
    employee: report.employee ? {
      id: report.employee.id,
      firstName: report.employee.prenom,
      lastName: report.employee.nom,
      email: report.employee.email,
      grossSalary: report.employee.salaireBrut,
      department: report.employee.department,
      companyId: report.employee.compagnieId,
    } : undefined,
  };
}

// Middleware de sécurité : vérifier que l'utilisateur est propriétaire de l'entreprise
router.use(async (req: Request<CompanyParams>, res: Response, next: NextFunction) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ error: 'L\'ID de l\'entreprise est requis' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== req.userId) {
      return res.status(403).json({ error: 'Interdit' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/companies/:companyId/expense-reports
// Créer un nouveau rapport de notes de frais
router.post('/', async (req: Request<CompanyParams>, res: Response) => {
  const { employeeId, title, items } = req.body;
  const { companyId } = req.params;

  if (!employeeId || !title) {
    return res.status(400).json({ error: 'employeeId et title sont requis' });
  }

  try {
    // Vérifier que l'employé appartient à l'entreprise
    const employee = await prisma.employe.findFirst({
      where: {
        id: employeeId,
        compagnieId: companyId,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé dans cette entreprise' });
    }

    // Calculer le montant total si des items sont fournis
    let totalAmount = 0;
    const itemsData = [];

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { category, amount, date, description, receiptPath } = item;

        if (!category || amount == null || !date || !description) {
          return res.status(400).json({
            error: 'Chaque item doit avoir category, amount, date et description'
          });
        }

        // Valider la catégorie
        if (!isValidCategory(category)) {
          return res.status(400).json({
            error: `Catégorie invalide. Doit être parmi : ${VALID_CATEGORIES.join(', ')}`
          });
        }

        const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          return res.status(400).json({
            error: 'Chaque montant d\'item doit être un nombre positif valide'
          });
        }

        // Valider la date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            error: 'Format de date invalide. Utilisez le format ISO 8601 (YYYY-MM-DD)'
          });
        }

        totalAmount += parsedAmount;
        itemsData.push({
          category,
          amount: parsedAmount,
          date: parsedDate,
          description,
          receiptPath: receiptPath || null,
        });
      }
    }

    // Créer le rapport avec ses items
    const newReport = await prisma.expenseReport.create({
      data: {
        employeId: employeeId,
        title,
        totalAmount,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        employee: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            salaireBrut: true,
            department: true,
            compagnieId: true,
          },
        },
      },
    });

    res.status(201).json(transformExpenseReportWithEmployee(newReport));
  } catch (error) {
    console.error('Erreur lors de la création du rapport de notes de frais :', error);
    res.status(500).json({ error: 'Échec de la création du rapport de notes de frais' });
  }
});

// GET /api/companies/:companyId/expense-reports
// Récupérer tous les rapports de notes de frais d'une entreprise
router.get('/', async (req: Request<CompanyParams>, res: Response) => {
  const { companyId } = req.params;
  const { status, employeeId } = req.query;

  try {
    const where: any = {
      employee: {
        compagnieId: companyId,
      },
    };

    // Filtrer par statut si fourni
    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Filtrer par employé si fourni
    if (employeeId && typeof employeeId === 'string') {
      where.employeId = employeeId;
    }

    const reports = await prisma.expenseReport.findMany({
      where,
      include: {
        items: true,
        employee: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            salaireBrut: true,
            department: true,
            compagnieId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(reports.map(transformExpenseReportWithEmployee));
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports de notes de frais :', error);
    res.status(500).json({ error: 'Échec de la récupération des rapports de notes de frais' });
  }
});

// GET /api/companies/:companyId/expense-reports/:reportId
// Récupérer un rapport de notes de frais spécifique
router.get('/:reportId', async (req: Request<ReportParams>, res: Response) => {
  const { reportId, companyId } = req.params;

  try {
    const report = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          compagnieId: companyId,
        },
      },
      include: {
        items: {
          orderBy: {
            date: 'asc',
          },
        },
        employee: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            salaireBrut: true,
            department: true,
            compagnieId: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }

    res.json(transformExpenseReportWithEmployee(report));
  } catch (error) {
    console.error('Erreur lors de la récupération du rapport de notes de frais :', error);
    res.status(500).json({ error: 'Échec de la récupération du rapport de notes de frais' });
  }
});

// PUT /api/companies/:companyId/expense-reports/:reportId
// Modifier un rapport de notes de frais
router.put('/:reportId', async (req: Request<ReportParams>, res: Response) => {
  const { reportId, companyId } = req.params;
  const { title, status } = req.body;

  try {
    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          compagnieId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }

    const updateData: { title?: string; status?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) {
      if (!isValidStatus(status)) {
        return res.status(400).json({
          error: `Statut invalide. Doit être parmi : ${VALID_STATUSES.join(', ')}`
        });
      }
      updateData.status = status;
    }

    const updatedReport = await prisma.expenseReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        items: true,
        employee: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            salaireBrut: true,
            department: true,
            compagnieId: true,
          },
        },
      },
    });

    res.json(transformExpenseReportWithEmployee(updatedReport));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }
    console.error('Erreur lors de la mise à jour du rapport de notes de frais :', error);
    res.status(500).json({ error: 'Échec de la mise à jour du rapport de notes de frais' });
  }
});

// DELETE /api/companies/:companyId/expense-reports/:reportId
// Supprimer un rapport de notes de frais
router.delete('/:reportId', async (req: Request<ReportParams>, res: Response) => {
  const { reportId, companyId } = req.params;

  try {
    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          compagnieId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }

    await prisma.expenseReport.delete({
      where: { id: reportId },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }
    console.error('Erreur lors de la suppression du rapport de notes de frais :', error);
    res.status(500).json({ error: 'Échec de la suppression du rapport de notes de frais' });
  }
});

// POST /api/companies/:companyId/expense-reports/:reportId/items
// Ajouter un item à un rapport de notes de frais
router.post('/:reportId/items', async (req: Request<ReportParams>, res: Response) => {
  const { reportId, companyId } = req.params;
  const { category, amount, date, description, receiptPath } = req.body;

  if (!category || amount == null || !date || !description) {
    return res.status(400).json({
      error: 'category, amount, date et description sont requis'
    });
  }

  // Valider la catégorie
  if (!isValidCategory(category)) {
    return res.status(400).json({
      error: `Catégorie invalide. Doit être parmi : ${VALID_CATEGORIES.join(', ')}`
    });
  }

  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'amount doit être un nombre positif valide' });
  }

  // Valider la date
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({
      error: 'Format de date invalide. Utilisez le format ISO 8601 (YYYY-MM-DD)'
    });
  }

  try {
    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          compagnieId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }

    // Créer le nouvel item
    const newItem = await prisma.expenseItem.create({
      data: {
        reportId,
        category,
        amount: parsedAmount,
        date: parsedDate,
        description,
        receiptPath: receiptPath || null,
      },
    });

    // Mettre à jour le montant total du rapport de manière atomique
    await prisma.expenseReport.update({
      where: { id: reportId },
      data: { totalAmount: { increment: parsedAmount } },
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Erreur lors de la création de l\'item de note de frais :', error);
    res.status(500).json({ error: 'Échec de la création de l\'item de note de frais' });
  }
});

// PUT /api/companies/:companyId/expense-reports/:reportId/items/:itemId
// Modifier un item d'un rapport de notes de frais
router.put('/:reportId/items/:itemId', async (req: Request<ItemParams>, res: Response) => {
  const { reportId, itemId, companyId } = req.params;
  const { category, amount, date, description, receiptPath } = req.body;

  try {
    // Vérifier que l'item existe et appartient au rapport
    const existingItem = await prisma.expenseItem.findFirst({
      where: {
        id: itemId,
        reportId: reportId,
        report: {
          employee: {
            compagnieId: companyId,
          },
        },
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item de note de frais non trouvé' });
    }

    const updateData: {
      category?: string;
      amount?: number;
      date?: Date;
      description?: string;
      receiptPath?: string | null;
    } = {};
    let amountDifference = 0;

    if (category !== undefined) {
      if (!isValidCategory(category)) {
        return res.status(400).json({
          error: `Catégorie invalide. Doit être parmi : ${VALID_CATEGORIES.join(', ')}`
        });
      }
      updateData.category = category;
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: 'Format de date invalide. Utilisez le format ISO 8601 (YYYY-MM-DD)'
        });
      }
      updateData.date = parsedDate;
    }

    if (description !== undefined) updateData.description = description;
    if (receiptPath !== undefined) updateData.receiptPath = receiptPath;

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ error: 'amount doit être un nombre positif valide' });
      }
      updateData.amount = parsedAmount;
      amountDifference = parsedAmount - existingItem.amount;
    }

    const updatedItem = await prisma.expenseItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Mettre à jour le montant total si l'amount a changé de manière atomique
    if (amountDifference !== 0) {
      await prisma.expenseReport.update({
        where: { id: reportId },
        data: { totalAmount: { increment: amountDifference } },
      });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'item de note de frais :', error);
    res.status(500).json({ error: 'Échec de la mise à jour de l\'item de note de frais' });
  }
});

// POST /api/companies/:companyId/expense-reports/:reportId/upload-receipt
// Upload d'un fichier de reçu
router.post('/:reportId/upload-receipt', upload.single('receipt'), async (req: Request, res: Response) => {
  const reportId = req.params.reportId as string;
  const companyId = req.params.companyId as string;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          compagnieId: companyId,
        },
      },
    });

    if (!existingReport) {
      // Supprimer le fichier uploadé si le rapport n'existe pas
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Rapport de notes de frais non trouvé' });
    }

    // Retourner le chemin relatif du fichier
    const receiptPath = `/uploads/receipts/${req.file.filename}`;
    res.status(200).json({ receiptPath });
  } catch (error) {
    console.error('Erreur lors de l\'upload du reçu :', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Échec de l\'upload du reçu' });
  }
});

// DELETE /api/companies/:companyId/expense-reports/:reportId/items/:itemId
// Supprimer un item d'un rapport de notes de frais
router.delete('/:reportId/items/:itemId', async (req: Request<ItemParams>, res: Response) => {
  const { reportId, itemId, companyId } = req.params;

  try {
    // Vérifier que l'item existe et appartient au rapport
    const existingItem = await prisma.expenseItem.findFirst({
      where: {
        id: itemId,
        reportId: reportId,
        report: {
          employee: {
            compagnieId: companyId,
          },
        },
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item de note de frais non trouvé' });
    }

    // Supprimer l'item
    await prisma.expenseItem.delete({
      where: { id: itemId },
    });

    // Mettre à jour le montant total du rapport de manière atomique
    await prisma.expenseReport.update({
      where: { id: reportId },
      data: { totalAmount: { decrement: existingItem.amount } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'item de note de frais :', error);
    res.status(500).json({ error: 'Échec de la suppression de l\'item de note de frais' });
  }
});

export default router;
