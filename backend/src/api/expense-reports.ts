import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
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

// Middleware de sécurité : vérifier que l'utilisateur est propriétaire de l'entreprise
router.use(async (req: Request<CompanyParams>, res: Response, next: NextFunction) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:companyId/expense-reports
// Créer un nouveau rapport de notes de frais
router.post('/', async (req: Request<CompanyParams>, res: Response) => {
  const { employeeId, title, items } = req.body;
  const { companyId } = req.params;

  if (!employeeId || !title) {
    return res.status(400).json({ error: 'employeeId and title are required' });
  }

  try {
    // Vérifier que l'employé appartient à l'entreprise
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: companyId,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found in this company' });
    }

    // Calculer le montant total si des items sont fournis
    let totalAmount = 0;
    const itemsData = [];

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { category, amount, date, description, receiptPath } = item;

        if (!category || amount == null || !date || !description) {
          return res.status(400).json({
            error: 'Each item must have category, amount, date, and description'
          });
        }

        const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          return res.status(400).json({
            error: 'Each item amount must be a valid non-negative number'
          });
        }

        totalAmount += parsedAmount;
        itemsData.push({
          category,
          amount: parsedAmount,
          date: new Date(date),
          description,
          receiptPath: receiptPath || null,
        });
      }
    }

    // Créer le rapport avec ses items
    const newReport = await prisma.expenseReport.create({
      data: {
        employeeId,
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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error creating expense report:', error);
    res.status(500).json({ error: 'Failed to create expense report' });
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
        companyId: companyId,
      },
    };

    // Filtrer par statut si fourni
    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Filtrer par employé si fourni
    if (employeeId && typeof employeeId === 'string') {
      where.employeeId = employeeId;
    }

    const reports = await prisma.expenseReport.findMany({
      where,
      include: {
        items: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching expense reports:', error);
    res.status(500).json({ error: 'Failed to fetch expense reports' });
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
          companyId: companyId,
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
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Expense report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching expense report:', error);
    res.status(500).json({ error: 'Failed to fetch expense report' });
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
          companyId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Expense report not found' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;

    const updatedReport = await prisma.expenseReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        items: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json(updatedReport);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense report not found' });
    }
    console.error('Error updating expense report:', error);
    res.status(500).json({ error: 'Failed to update expense report' });
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
          companyId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Expense report not found' });
    }

    await prisma.expenseReport.delete({
      where: { id: reportId },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Expense report not found' });
    }
    console.error('Error deleting expense report:', error);
    res.status(500).json({ error: 'Failed to delete expense report' });
  }
});

// POST /api/companies/:companyId/expense-reports/:reportId/items
// Ajouter un item à un rapport de notes de frais
router.post('/:reportId/items', async (req: Request<ReportParams>, res: Response) => {
  const { reportId, companyId } = req.params;
  const { category, amount, date, description, receiptPath } = req.body;

  if (!category || amount == null || !date || !description) {
    return res.status(400).json({
      error: 'category, amount, date, and description are required'
    });
  }

  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'amount must be a valid non-negative number' });
  }

  try {
    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          companyId: companyId,
        },
      },
    });

    if (!existingReport) {
      return res.status(404).json({ error: 'Expense report not found' });
    }

    // Créer le nouvel item
    const newItem = await prisma.expenseItem.create({
      data: {
        reportId,
        category,
        amount: parsedAmount,
        date: new Date(date),
        description,
        receiptPath: receiptPath || null,
      },
    });

    // Mettre à jour le montant total du rapport
    const newTotalAmount = existingReport.totalAmount + parsedAmount;
    await prisma.expenseReport.update({
      where: { id: reportId },
      data: { totalAmount: newTotalAmount },
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating expense item:', error);
    res.status(500).json({ error: 'Failed to create expense item' });
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
            companyId: companyId,
          },
        },
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Expense item not found' });
    }

    const updateData: any = {};
    let amountDifference = 0;

    if (category !== undefined) updateData.category = category;
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (receiptPath !== undefined) updateData.receiptPath = receiptPath;

    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ error: 'amount must be a valid non-negative number' });
      }
      updateData.amount = parsedAmount;
      amountDifference = parsedAmount - existingItem.amount;
    }

    const updatedItem = await prisma.expenseItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Mettre à jour le montant total si l'amount a changé
    if (amountDifference !== 0) {
      const report = await prisma.expenseReport.findUnique({
        where: { id: reportId },
      });
      if (report) {
        await prisma.expenseReport.update({
          where: { id: reportId },
          data: { totalAmount: report.totalAmount + amountDifference },
        });
      }
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating expense item:', error);
    res.status(500).json({ error: 'Failed to update expense item' });
  }
});

// POST /api/companies/:companyId/expense-reports/:reportId/upload-receipt
// Upload d'un fichier de reçu
router.post('/:reportId/upload-receipt', upload.single('receipt'), async (req: Request, res: Response) => {
  const reportId = req.params.reportId as string;
  const companyId = req.params.companyId as string;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Vérifier que le rapport existe et appartient à l'entreprise
    const existingReport = await prisma.expenseReport.findFirst({
      where: {
        id: reportId,
        employee: {
          companyId: companyId,
        },
      },
    });

    if (!existingReport) {
      // Supprimer le fichier uploadé si le rapport n'existe pas
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Expense report not found' });
    }

    // Retourner le chemin relatif du fichier
    const receiptPath = `/uploads/receipts/${req.file.filename}`;
    res.status(200).json({ receiptPath });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload receipt' });
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
            companyId: companyId,
          },
        },
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Expense item not found' });
    }

    // Supprimer l'item
    await prisma.expenseItem.delete({
      where: { id: itemId },
    });

    // Mettre à jour le montant total du rapport
    const report = await prisma.expenseReport.findUnique({
      where: { id: reportId },
    });
    if (report) {
      await prisma.expenseReport.update({
        where: { id: reportId },
        data: { totalAmount: report.totalAmount - existingItem.amount },
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense item:', error);
    res.status(500).json({ error: 'Failed to delete expense item' });
  }
});

export default router;
