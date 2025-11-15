import express, { Request, Response } from 'express';
import cors from 'cors';
import authRouter from './api/auth';
import companiesRouter from './api/companies';
import payrollRouter from './api/payroll';

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/payslips', payrollRouter); // Routes de paie et fiches de paie

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
