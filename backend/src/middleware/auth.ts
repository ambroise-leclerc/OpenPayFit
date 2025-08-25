import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// TODO: Move this to an environment variable (.env) for production
const JWT_SECRET = 'YOUR_SUPER_SECRET_KEY_CHANGE_ME_IN_ENV';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // No token, unauthorized
  }

  jwt.verify(token, JWT_SECRET, (err: any, payload: any) => {
    if (err) {
      return res.sendStatus(403); // Token is no longer valid
    }

    req.userId = payload.userId;
    next();
  });
}
