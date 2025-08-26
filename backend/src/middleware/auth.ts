import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT secret should be set via environment variable for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // No token, unauthorized
  }

  jwt.verify(token, JWT_SECRET as string, (err: any, payload: any) => {
    if (err) {
      return res.sendStatus(403); // Token is no longer valid
    }

    req.userId = payload.userId;
    next();
  });
}
