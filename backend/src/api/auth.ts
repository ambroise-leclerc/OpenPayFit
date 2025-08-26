import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';

const router = Router();

// JWT secret should be set via environment variable for security
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // Generate a token for the new user
    const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, {
      expiresIn: '24h', // Token expires in 24 hours
    });

    res.status(201).json({ token });

  } catch (error) {
    // Check if it's a Prisma unique constraint violation error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate a token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, {
            expiresIn: '24h',
        });

        res.status(200).json({ token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
