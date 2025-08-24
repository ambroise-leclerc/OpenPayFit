import express, { Request, Response } from 'express';
import cors from 'cors';
import authRouter from './api/auth'; // Import the auth router

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Enable parsing of JSON request bodies

// API Routes
app.use('/api/auth', authRouter);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, OpenPayFit Backend!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
