import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/db';

/**
 * Middleware qui vérifie que l'utilisateur authentifié a le rôle ADMIN
 *
 * IMPORTANT : Ce middleware doit être utilisé APRÈS authenticateToken
 * car il dépend de req.userId qui est défini par authenticateToken
 *
 * Retourne 403 Forbidden si l'utilisateur n'est pas admin
 *
 * @example
 * // Dans les routes :
 * router.post('/cotisations/regles', authenticateToken, requireAdmin, async (req, res) => {
 *   // Seuls les admins peuvent créer des règles
 * });
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // Vérifier que l'utilisateur est authentifié (devrait être garanti par authenticateToken)
    if (!req.userId) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });

    // Vérifier que l'utilisateur existe
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier que l'utilisateur est admin
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Accès interdit : cette action nécessite les privilèges administrateur'
      });
    }

    // L'utilisateur est admin, continuer
    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
