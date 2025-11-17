import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db';

const router = Router();

// Le secret JWT doit être défini via une variable d'environnement pour la sécurité
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('La variable d\'environnement JWT_SECRET n\'est pas définie.');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'L\'email et le mot de passe sont requis' });
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

    // Générer un jeton pour le nouvel utilisateur
    const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, {
      expiresIn: '24h', // Le jeton expire dans 24 heures
    });

    res.status(201).json({ token });

  } catch (error) {
    // Vérifier s'il s'agit d'une erreur de violation de contrainte unique Prisma
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002') {
      return res.status(409).json({ error: 'L\'email existe déjà' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur interne' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'L\'email et le mot de passe sont requis' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Générer un jeton
        const token = jwt.sign({ userId: user.id }, JWT_SECRET as string, {
            expiresIn: '24h',
        });

        res.status(200).json({ token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

export default router;
