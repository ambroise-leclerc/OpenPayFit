import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';

// Définition des types pour les paramètres d'URL
interface ParamsEntreprise {
  companyId: string;
}

const router = Router({ mergeParams: true });

// Middleware de sécurité pour vérifier que l'utilisateur est propriétaire de l'entreprise
router.use(async (req: Request<ParamsEntreprise>, res: Response, next: NextFunction) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ error: 'L\'ID de l\'entreprise est requis' });
  }

  try {
    const entreprise = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!entreprise) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (entreprise.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    next();
  } catch (erreur) {
    console.error('Erreur lors de la vérification des permissions:', erreur);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

// Fonction utilitaire pour calculer la plage de dates selon la période demandée
function obtenirPlageDates(periode?: string, annee?: string, mois?: string, trimestre?: string) {
  const maintenant = new Date();
  let dateDebut: Date;
  let dateFin: Date = maintenant;

  if (periode === 'month' && annee && mois) {
    dateDebut = new Date(parseInt(annee), parseInt(mois) - 1, 1);
    dateFin = new Date(parseInt(annee), parseInt(mois), 0);
  } else if (periode === 'quarter' && annee && trimestre) {
    const t = parseInt(trimestre);
    dateDebut = new Date(parseInt(annee), (t - 1) * 3, 1);
    dateFin = new Date(parseInt(annee), t * 3, 0);
  } else if (periode === 'year' && annee) {
    dateDebut = new Date(parseInt(annee), 0, 1);
    dateFin = new Date(parseInt(annee), 11, 31);
  } else {
    // Par défaut : derniers 12 mois
    dateDebut = new Date(maintenant.getFullYear() - 1, maintenant.getMonth(), 1);
  }

  return { dateDebut, dateFin };
}

// GET /api/companies/:companyId/analytics/payroll
// Retourne l'évolution de la masse salariale par mois
router.get('/payroll', async (req: Request<ParamsEntreprise>, res: Response) => {
  const { companyId } = req.params;
  const { period, year, month, quarter } = req.query;

  try {
    const { dateDebut, dateFin } = obtenirPlageDates(
      period as string,
      year as string,
      month as string,
      quarter as string
    );

    // Récupérer tous les employés de l'entreprise
    const employes = await prisma.employee.findMany({
      where: { companyId },
      select: { id: true },
    });

    const idsEmployes = employes.map((e: any) => e.id);

    // Récupérer toutes les fiches de paie de l'entreprise dans la période
    const fichesPaie = await prisma.fichePaie.findMany({
      where: {
        employeeId: { in: idsEmployes },
        createdAt: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
      select: {
        payPeriod: true,
        grossSalary: true,
        netSalary: true,
        coutTotal: true,
      },
      orderBy: {
        payPeriod: 'asc',
      },
    });

    // Agréger les données par période
    const donnéesAgrégées = fichesPaie.reduce((acc: any, fiche: any) => {
      const periode = fiche.payPeriod;
      if (!acc[periode]) {
        acc[periode] = {
          periode,
          totalBrut: 0,
          totalNet: 0,
          coutTotal: 0,
          nombre: 0,
        };
      }
      acc[periode].totalBrut += fiche.grossSalary;
      acc[periode].totalNet += fiche.netSalary;
      acc[periode].coutTotal += fiche.coutTotal || fiche.grossSalary;
      acc[periode].nombre += 1;
      return acc;
    }, {});

    const resultat = Object.values(donnéesAgrégées);

    res.json(resultat);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des analytics de paie:', erreur);
    res.status(500).json({ error: 'Échec de la récupération des analytics de paie' });
  }
});

// GET /api/companies/:companyId/analytics/headcount
// Retourne la répartition des effectifs par département
router.get('/headcount', async (req: Request<ParamsEntreprise>, res: Response) => {
  const { companyId } = req.params;

  try {
    const employes = await prisma.employee.findMany({
      where: { companyId },
      select: {
        department: true,
      },
    });

    // Compter le nombre d'employés par département
    const comptesParDepartement = employes.reduce((acc: any, emp: any) => {
      const dept = emp.department || 'Non assigné';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const resultat = Object.entries(comptesParDepartement).map(([departement, nombre]) => ({
      departement,
      nombre,
    }));

    res.json(resultat);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des analytics d\'effectifs:', erreur);
    res.status(500).json({ error: 'Échec de la récupération des analytics d\'effectifs' });
  }
});

// GET /api/companies/:companyId/analytics/leaves
// Retourne les statistiques de congés
router.get('/leaves', async (req: Request<ParamsEntreprise>, res: Response) => {
  const { companyId } = req.params;
  const { period, year, month, quarter } = req.query;

  try {
    const { dateDebut, dateFin } = obtenirPlageDates(
      period as string,
      year as string,
      month as string,
      quarter as string
    );

    // Récupérer tous les employés de l'entreprise
    const employes = await prisma.employee.findMany({
      where: { companyId },
      select: { id: true },
    });

    const idsEmployes = employes.map((e: any) => e.id);

    // Récupérer les congés dans la période
    const conges = await prisma.leave.findMany({
      where: {
        employeeId: { in: idsEmployes },
        startDate: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
      select: {
        type: true,
        status: true,
        days: true,
      },
    });

    // Calculer le total de jours de congés approuvés
    const totalJours = conges.reduce((somme: any, conge: any) => {
      if (conge.status === 'APPROVED') {
        return somme + conge.days;
      }
      return somme;
    }, 0);

    // Agréger par type de congé
    const parType = conges.reduce((acc: any, conge: any) => {
      if (conge.status === 'APPROVED') {
        acc[conge.type] = (acc[conge.type] || 0) + conge.days;
      }
      return acc;
    }, {});

    // Agréger par statut
    const parStatut = conges.reduce((acc: any, conge: any) => {
      acc[conge.status] = (acc[conge.status] || 0) + 1;
      return acc;
    }, {});

    // Calculer le taux d'absence (approximatif)
    // Le calcul utilise 71% comme estimation du ratio jours ouvrés/jours calendaires.
    // Cette approximation repose sur l'hypothèse de 5 jours ouvrés par semaine (5/7 ≈ 71%)
    // et ne tient pas compte des jours fériés spécifiques qui varient selon les régions.
    const joursOuvresPeriode = Math.ceil(
      (dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)
    ) * 0.71;
    const joursOuvresPotentiels = joursOuvresPeriode * employes.length;
    const tauxAbsence = joursOuvresPotentiels > 0
      ? (totalJours / joursOuvresPotentiels) * 100
      : 0;

    res.json({
      totalJours,
      tauxAbsence: Math.round(tauxAbsence * 100) / 100,
      parType,
      parStatut,
    });
  } catch (erreur) {
    console.error('Erreur lors de la récupération des analytics de congés:', erreur);
    res.status(500).json({ error: 'Échec de la récupération des analytics de congés' });
  }
});

// GET /api/companies/:companyId/analytics/expenses
// Retourne les statistiques de notes de frais
router.get('/expenses', async (req: Request<ParamsEntreprise>, res: Response) => {
  const { companyId } = req.params;
  const { period, year, month, quarter, limit } = req.query;

  try {
    const { dateDebut, dateFin } = obtenirPlageDates(
      period as string,
      year as string,
      month as string,
      quarter as string
    );

    // Récupérer tous les employés de l'entreprise avec leurs noms
    const employes = await prisma.employee.findMany({
      where: { companyId },
      select: { id: true, firstName: true, lastName: true },
    });

    const idsEmployes = employes.map((e: any) => e.id);
    const mapEmployes = new Map(employes.map((e: any) => [e.id, `${e.firstName} ${e.lastName}`]));

    // Valider et limiter le paramètre limit entre 1 et 100
    let limiteParsee: number | undefined = undefined;
    if (limit) {
      const limiteNombre = parseInt(limit as string);
      if (!isNaN(limiteNombre)) {
        limiteParsee = Math.min(Math.max(1, limiteNombre), 100);
      }
    }

    // Récupérer les notes de frais dans la période
    const notesDeFrais = await prisma.expense.findMany({
      where: {
        employeeId: { in: idsEmployes },
        date: {
          gte: dateDebut,
          lte: dateFin,
        },
      },
      select: {
        id: true,
        employeeId: true,
        category: true,
        status: true,
        amount: true,
        date: true,
        description: true,
      },
      orderBy: {
        amount: 'desc',
      },
      take: limiteParsee,
    });

    // Calculer le montant total
    const montantTotal = notesDeFrais.reduce((somme: any, note: any) => somme + note.amount, 0);

    // Agréger par catégorie
    const parCategorie = notesDeFrais.reduce((acc: any, note: any) => {
      acc[note.category] = (acc[note.category] || 0) + note.amount;
      return acc;
    }, {});

    // Agréger par statut
    const parStatut = notesDeFrais.reduce((acc: any, note: any) => {
      acc[note.status] = (acc[note.status] || 0) + 1;
      return acc;
    }, {});

    // Top 10 des dépenses les plus élevées avec le nom de l'employé
    const topDepenses = notesDeFrais.slice(0, 10).map((note: any) => ({
      id: note.id,
      nomEmploye: mapEmployes.get(note.employeeId) || 'Inconnu',
      categorie: note.category,
      montant: note.amount,
      date: note.date,
      description: note.description,
      statut: note.status,
    }));

    res.json({
      montantTotal,
      parCategorie,
      parStatut,
      topDepenses,
    });
  } catch (erreur) {
    console.error('Erreur lors de la récupération des analytics de notes de frais:', erreur);
    res.status(500).json({ error: 'Échec de la récupération des analytics de notes de frais' });
  }
});

export default router;
