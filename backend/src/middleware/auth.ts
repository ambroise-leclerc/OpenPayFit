import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
