import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour restreindre l'accès aux administrateurs uniquement
 *
 * IMPORTANT: Ce middleware nécessite l'ajout d'un champ `role` au modèle User.
 *
 * Pour l'activer :
 * 1. Ajouter un champ `role` au modèle User dans prisma/schema.prisma :
 *    ```prisma
 *    model User {
 *      id        String    @id @default(cuid())
 *      email     String    @unique
 *      name      String?
 *      password  String
 *      role      String    @default("user") // "user" ou "admin"
 *      companies Company[]
 *      createdAt DateTime  @default(now())
 *      updatedAt DateTime  @updatedAt
 *    }
 *    ```
 *
 * 2. Créer et appliquer la migration :
 *    ```bash
 *    npx prisma migrate dev --name add_user_role
 *    ```
 *
 * 3. Modifier le middleware authenticateToken pour inclure le role dans req :
 *    ```typescript
 *    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
 *    req.userId = user.id;
 *    req.userRole = user.role;
 *    ```
 *
 * 4. Ajouter ce middleware aux routes de cotisations dans index.ts :
 *    ```typescript
 *    import { requireAdmin } from './middleware/admin';
 *    // Pour les routes de consultation (GET) : authenticateToken uniquement
 *    // Pour les routes de modification (POST, PUT, DELETE) : authenticateToken + requireAdmin
 *    ```
 *
 * Usage recommandé :
 * - GET /api/cotisations/* : Tous les utilisateurs authentifiés
 * - POST/PUT/DELETE /api/cotisations/* : Administrateurs uniquement
 */

/**
 * Vérifie que l'utilisateur connecté est un administrateur
 *
 * Ce middleware doit être utilisé après authenticateToken
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore - Le champ userRole sera ajouté à l'interface Request plus tard
  const userRole = req.userRole;

  if (!userRole) {
    return res.status(403).json({
      error: 'Accès refusé : rôle utilisateur non défini',
    });
  }

  if (userRole !== 'admin') {
    return res.status(403).json({
      error: 'Accès refusé : droits administrateur requis pour cette opération',
    });
  }

  next();
}

/**
 * Extension de l'interface Express Request pour TypeScript
 *
 * À ajouter dans src/types/express.d.ts :
 * ```typescript
 * declare global {
 *   namespace Express {
 *     interface Request {
 *       userId?: string;
 *       userRole?: string;
 *     }
 *   }
 * }
 * ```
 */
