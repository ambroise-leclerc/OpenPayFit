import express, { Request, Response } from 'express';
import cors from 'cors';
import authRouter from './api/auth';
import companiesRouter from './api/companies';
import payrollRouter from './api/payroll';
import cotisationsRouter from './api/cotisations';
import { authenticateToken } from './middleware/auth';

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/payslips', payrollRouter); // Routes de paie et fiches de paie

// TODO: Restreindre les modifications des cotisations aux administrateurs
// Actuellement, tous les utilisateurs authentifiés peuvent modifier les règles de cotisations.
// Pour sécuriser en production :
// 1. Ajouter un champ `role` au modèle User (voir backend/src/middleware/admin.ts)
// 2. Séparer les routes GET (lecture) des routes POST/PUT/DELETE (modification)
// 3. Appliquer requireAdmin sur les routes de modification uniquement
// Exemple :
//   app.use('/api/cotisations', authenticateToken, cotisationsRouter); // GET seulement
//   app.use('/api/cotisations', authenticateToken, requireAdmin, cotisationsRouterAdmin); // POST/PUT/DELETE
app.use('/api/cotisations', authenticateToken, cotisationsRouter); // Routes des règles de cotisations (authentification requise)

// Health check route
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello, OpenPayFit Backend!');
});

// Start the server only if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app; // Export for testing
