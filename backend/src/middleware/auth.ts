import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';

// Le secret JWT doit être défini via une variable d'environnement pour la sécurité
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('La variable d\'environnement JWT_SECRET n\'est pas définie.');
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN (jeton porteur)

  if (token == null) {
    return res.sendStatus(401); // Pas de jeton, non autorisé
  }

  jwt.verify(token, JWT_SECRET as string, (err: any, payload: any) => {
    if (err) {
      return res.sendStatus(403); // Le jeton n'est plus valide
    }

    req.userId = payload.userId;
    next();
  });
}

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire de l'entreprise
 * Doit être utilisé après authenticateToken
 * Attend req.params.companyId et req.userId
 */
export async function verifyCompanyOwnership(req: Request, res: Response, next: NextFunction) {
  const { companyId } = req.params;
  const userId = req.userId;

  if (!companyId) {
    return res.status(400).json({ error: 'ID de l\'entreprise manquant' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  try {
    const company = await prisma.compagnie.findUnique({
      where: { id: companyId },
      select: { id: true, proprietaireId: true }
    });

    if (!company) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    if (company.proprietaireId !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé à cette entreprise' });
    }

    // L'entreprise est stockée dans req pour éviter une nouvelle requête DB
    req.company = company;
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification de propriété:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
