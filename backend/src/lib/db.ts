import { PrismaClient } from '@prisma/client';

// Initialiser Prisma avec gestion d'erreur pour les environnements où la génération a échoué
let prisma: any;

try {
  prisma = new PrismaClient();
} catch (error) {
  // Si Prisma ne peut pas être initialisé, utiliser better-sqlite3 directement
  console.warn('Warning: Prisma Client could not be initialized. Using better-sqlite3 directly.');

  const Database = require('better-sqlite3');
  const path = require('path');

  // Utiliser la bonne base de données selon l'environnement
  const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
  const dbPath = path.join(__dirname, '../../prisma', dbFileName);
  const db = new Database(dbPath);

  // Créer un wrapper Prisma-like pour better-sqlite3
  const createModelWrapper = (tableName: string) => ({
    create: () => Promise.reject(new Error('Prisma client not initialized - use better-sqlite3 directly')),
    findUnique: () => Promise.reject(new Error('Prisma client not initialized - use better-sqlite3 directly')),
    findMany: (args?: any) => {
      // Implémentation basique pour findMany (utilisé par le moteur de cotisations)
      try {
        let query = `SELECT * FROM ${tableName}`;
        const params: any[] = [];

        if (args?.where) {
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(args.where)) {
            if (typeof value === 'boolean') {
              conditions.push(`${key} = ?`);
              params.push(value ? 1 : 0);
            } else if (value !== null && value !== undefined) {
              conditions.push(`${key} = ?`);
              params.push(value);
            }
          }
          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        const stmt = db.prepare(query);
        const rows = stmt.all(...params);

        // Si include est demandé, charger les relations
        if (args?.include && rows.length > 0) {
          for (const row of rows) {
            for (const [relationName, relationConfig] of Object.entries(args.include)) {
              if (relationConfig === true || (typeof relationConfig === 'object' && relationConfig !== null)) {
                // Déterminer la table et le champ de la relation
                const relationIdField = relationName + 'Id';

                if (row[relationIdField]) {
                  // Mapping des relations vers les noms de tables
                  const tableMapping: Record<string, string> = {
                    categorie: 'categories_cotisation',
                    organisme: 'organismes_cotisation',
                    regle: 'regles_cotisation'
                  };

                  const relationTable = tableMapping[relationName] || relationName;
                  const relQuery = `SELECT * FROM ${relationTable} WHERE id = ?`;

                  try {
                    const relStmt = db.prepare(relQuery);
                    const relRow = relStmt.get(row[relationIdField]);

                    // Si select est spécifié, ne garder que les champs demandés
                    if (typeof relationConfig === 'object' && (relationConfig as any).select && relRow) {
                      const selectedFields: any = {};
                      for (const field of Object.keys((relationConfig as any).select)) {
                        selectedFields[field] = relRow[field];
                      }
                      row[relationName] = selectedFields;
                    } else {
                      row[relationName] = relRow;
                    }
                  } catch (e) {
                    // Ignorer les erreurs de relation
                    row[relationName] = null;
                  }
                }
              }
            }
          }
        }

        return Promise.resolve(rows);
      } catch (e) {
        console.error(`Error in findMany for ${tableName}:`, e);
        return Promise.resolve([]);
      }
    },
    findFirst: (args?: any) => {
      try {
        let query = `SELECT * FROM ${tableName}`;
        const params: any[] = [];

        if (args?.where) {
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(args.where)) {
            if (typeof value === 'object' && value !== null) {
              // Support pour les opérateurs (lte, gte, etc.)
              for (const [op, opValue] of Object.entries(value)) {
                if (op === 'lte') {
                  conditions.push(`${key} <= ?`);
                  params.push(opValue);
                } else if (op === 'gte' || op === 'gt') {
                  conditions.push(`${key} > ?`);
                  params.push(opValue);
                }
              }
            } else if (typeof value === 'boolean') {
              conditions.push(`${key} = ?`);
              params.push(value ? 1 : 0);
            } else if (value !== null && value !== undefined) {
              conditions.push(`${key} = ?`);
              params.push(value);
            }
          }

          // Support pour OR
          if ((args.where as any).OR) {
            const orConditions: string[] = [];
            for (const orClause of (args.where as any).OR) {
              for (const [key, value] of Object.entries(orClause)) {
                if (value === null) {
                  orConditions.push(`${key} IS NULL`);
                } else if (typeof value === 'object' && value !== null) {
                  for (const [op, opValue] of Object.entries(value)) {
                    if (op === 'gt') {
                      orConditions.push(`${key} > ?`);
                      params.push(opValue);
                    }
                  }
                }
              }
            }
            if (orConditions.length > 0) {
              conditions.push(`(${orConditions.join(' OR ')})`);
            }
          }

          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        if (args?.orderBy) {
          const orderClauses: string[] = [];
          for (const [key, direction] of Object.entries(args.orderBy)) {
            orderClauses.push(`${key} ${direction === 'desc' ? 'DESC' : 'ASC'}`);
          }
          if (orderClauses.length > 0) {
            query += ` ORDER BY ${orderClauses.join(', ')}`;
          }
        }

        query += ' LIMIT 1';

        const stmt = db.prepare(query);
        const row = stmt.get(...params);
        return Promise.resolve(row || null);
      } catch (e) {
        console.error(`Error in findFirst for ${tableName}:`, e);
        return Promise.resolve(null);
      }
    },
    update: () => Promise.reject(new Error('Prisma client not initialized - use better-sqlite3 directly')),
    delete: () => Promise.reject(new Error('Prisma client not initialized - use better-sqlite3 directly')),
    deleteMany: () => Promise.reject(new Error('Prisma client not initialized - use better-sqlite3 directly')),
  });

  prisma = {
    user: createModelWrapper('User'),
    company: createModelWrapper('Company'),
    employee: createModelWrapper('Employee'),
    regleCotisation: createModelWrapper('regles_cotisation'),
    tauxCotisation: createModelWrapper('taux_cotisation'),
    categorieCotisation: createModelWrapper('categories_cotisation'),
    organismeCotisation: createModelWrapper('organismes_cotisation'),
    regleComptable: createModelWrapper('regles_comptables'),
    $disconnect: () => { db.close(); return Promise.resolve(); },
    $connect: () => Promise.resolve(),
  };
}

export default prisma;
