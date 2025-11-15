import { PrismaClient } from '@prisma/client';

// Initialiser Prisma avec gestion d'erreur pour les environnements où la génération a échoué
let prisma: any;

try {
  prisma = new PrismaClient();
} catch (error) {
  // Si Prisma ne peut pas être initialisé, créer un mock basique
  console.warn('Warning: Prisma Client could not be initialized. Using mock client.');
  prisma = {
    user: {
      create: () => Promise.reject(new Error('Prisma client not initialized')),
      findUnique: () => Promise.reject(new Error('Prisma client not initialized')),
      findMany: () => Promise.reject(new Error('Prisma client not initialized')),
      update: () => Promise.reject(new Error('Prisma client not initialized')),
      delete: () => Promise.reject(new Error('Prisma client not initialized')),
      deleteMany: () => Promise.reject(new Error('Prisma client not initialized')),
    },
    company: {
      create: () => Promise.reject(new Error('Prisma client not initialized')),
      findUnique: () => Promise.reject(new Error('Prisma client not initialized')),
      findMany: () => Promise.reject(new Error('Prisma client not initialized')),
      findFirst: () => Promise.reject(new Error('Prisma client not initialized')),
      update: () => Promise.reject(new Error('Prisma client not initialized')),
      delete: () => Promise.reject(new Error('Prisma client not initialized')),
      deleteMany: () => Promise.reject(new Error('Prisma client not initialized')),
    },
    employee: {
      create: () => Promise.reject(new Error('Prisma client not initialized')),
      findUnique: () => Promise.reject(new Error('Prisma client not initialized')),
      findMany: () => Promise.reject(new Error('Prisma client not initialized')),
      update: () => Promise.reject(new Error('Prisma client not initialized')),
      delete: () => Promise.reject(new Error('Prisma client not initialized')),
      deleteMany: () => Promise.reject(new Error('Prisma client not initialized')),
    },
    $disconnect: () => Promise.resolve(),
    $connect: () => Promise.resolve(),
  };
}

export default prisma;
