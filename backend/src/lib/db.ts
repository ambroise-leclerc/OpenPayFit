import { PrismaClient } from '@prisma/client';

// Initialiser Prisma avec gestion d'erreur pour les environnements où la génération a échoué
let prisma: any;

// En mode test, toujours utiliser better-sqlite3 directement pour éviter les problèmes
// de configuration de DATABASE_URL dans le CI
const shouldUseBetterSqlite = process.env.NODE_ENV === 'test';

if (!shouldUseBetterSqlite) {
  try {
    prisma = new PrismaClient();
  } catch (error) {
    // Si Prisma ne peut pas être initialisé, utiliser better-sqlite3
    console.warn('Attention: Le client Prisma n\'a pas pu être initialisé. Utilisation de better-sqlite3 directement.');
  }
}

if (!prisma || shouldUseBetterSqlite) {
  // Utiliser better-sqlite3 directement
  const Database = require('better-sqlite3');
  const path = require('path');

  // Utiliser la bonne base de données selon l'environnement
  const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
  const dbPath = path.join(__dirname, '../../prisma', dbFileName);
  const db = new Database(dbPath);

  // Liste blanche des tables autorisées pour prévenir les injections SQL
  const ALLOWED_TABLES = new Set([
    'User',
    'Company',
    'Employee',
    'Payslip',
    'lignes_cotisation_fiche_paie',
    'regles_cotisation',
    'taux_cotisation',
    'categories_cotisation',
    'organismes_cotisation',
    'regles_comptables',
    'accounting_integrations',
    'accounting_export_logs',
    'dsn_declarations',
    'transmissions_dsn',
    'configurations_net_entreprises',
    'dsn_events',
    'leaves',
    'leave_balances',
    'expenses',
    'expense_reports',
    'expense_items',
    'tranches_cotisation'
  ]);

  // Mapping des noms de champs Prisma (français) vers les noms de colonnes SQL (anglais)
  const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
    User: {
      nom: 'name',
      motDePasse: 'password',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    Company: {
      nom: 'name',
      proprietaireId: 'ownerId',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    Employee: {
      prenom: 'firstName',
      nom: 'lastName',
      salaireBrut: 'grossSalary',
      compagnieId: 'companyId',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    Payslip: {
      periodeVersement: 'payPeriod',
      salaireBrut: 'grossSalary',
      prelevements: 'deductions',
      salaireNet: 'netSalary',
      employeId: 'employeeId',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    accounting_integrations: {
      compagnieId: 'companyId',
      typeIntegration: 'type',
      statut: 'status',
      dateDerniereSynchro: 'lastSyncAt',
      derniereErreur: 'lastError',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    accounting_export_logs: {
      statut: 'status',
      periodeVersement: 'payPeriod',
      nombreEnregistrements: 'recordCount',
      cheminFichier: 'filePath',
      messageErreur: 'errorMessage',
      nombreTentatives: 'retryCount',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    dsn_declarations: {
      compagnieId: 'companyId',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    dsn_events: {
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    transmissions_dsn: {
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    configurations_net_entreprises: {
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    leaves: {
      employeId: 'employeeId',
      typeDemande: 'type',
      statut: 'status',
      dateDebut: 'startDate',
      dateFin: 'endDate',
      nombreJours: 'days',
      motif: 'reason',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    leave_balances: {
      employeId: 'employeeId',
      typeDemande: 'type',
      annee: 'year',
      joursTotal: 'totalDays',
      joursUtilises: 'usedDays',
      joursRestants: 'remainingDays',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    expenses: {
      employeId: 'employeeId',
      categorie: 'category',
      statut: 'status',
      montant: 'amount',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    expense_reports: {
      employeId: 'employeeId',
      titre: 'title',
      statut: 'status',
      montantTotal: 'totalAmount',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    },
    expense_items: {
      rapportId: 'reportId',
      categorie: 'category',
      montant: 'amount',
      cheminRecu: 'receiptPath',
      dateCreation: 'createdAt',
      dateModification: 'updatedAt'
    }
  };

  // Fonction helper pour traduire les noms de champs (Prisma → SQL)
  const mapFieldName = (tableName: string, fieldName: string): string => {
    return FIELD_MAPPINGS[tableName]?.[fieldName] || fieldName;
  };

  // Fonction helper pour traduire les résultats de SQL vers Prisma (reverse mapping)
  const reverseMapRow = (tableName: string, row: any): any => {
    if (!row) return row;
    const mapping = FIELD_MAPPINGS[tableName];
    if (!mapping) return row;

    const reversedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      // Trouver la clé Prisma correspondante
      const prismaKey = Object.keys(mapping).find(k => mapping[k] === key) || key;
      reversedRow[prismaKey] = value;
    }
    return reversedRow;
  };

  // Créer un wrapper Prisma-like pour better-sqlite3
  const createModelWrapper = (tableName: string) => {
    // Valider le nom de table pour prévenir les injections SQL
    if (!ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Nom de table non autorisé: ${tableName}`);
    }

    return {
    create: (args?: any) => {
      try {
        const crypto = require('crypto');
        const data = { ...args.data };

        // Ajouter les champs par défaut si manquants
        if (!data.id) {
          data.id = crypto.randomUUID();
        }
        if (!data.createdAt) {
          data.createdAt = new Date().toISOString();
        }
        if (!data.updatedAt) {
          data.updatedAt = new Date().toISOString();
        }

        // Gestion spéciale pour Payslip : le champ deductions est legacy et requis
        // mais peut être calculé depuis totalCotisationsSalariales
        if (tableName === 'Payslip' && !data.deductions && !data.prelevements) {
          data.deductions = data.totalCotisationsSalariales || 0;
        }

        const fields = Object.keys(data);
        const mappedFields = fields.map(f => mapFieldName(tableName, f));
        const values = Object.values(data).map(v => {
          if (v instanceof Date) {
            return v.toISOString();
          } else if (typeof v === 'object' && v !== null) {
            return JSON.stringify(v);
          }
          return v;
        });
        const placeholders = mappedFields.map(() => '?').join(', ');
        const query = `INSERT INTO ${tableName} (${mappedFields.join(', ')}) VALUES (${placeholders})`;

        const stmt = db.prepare(query);
        stmt.run(...values);

        // Retourner l'objet créé
        const selectQuery = `SELECT * FROM ${tableName} WHERE id = ?`;
        const selectStmt = db.prepare(selectQuery);
        const row = selectStmt.get(data.id);

        return Promise.resolve(reverseMapRow(tableName, row));
      } catch (e) {
        console.error(`Erreur dans create pour ${tableName}:`, e);
        return Promise.reject(e);
      }
    },
    findUnique: (args?: any) => {
      try {
        if (!args?.where) {
          return Promise.resolve(null);
        }

        let query = `SELECT * FROM ${tableName}`;
        const params: any[] = [];

        // Gérer les requêtes de contraintes uniques (par ex., companyId_type)
        const whereKeys = Object.keys(args.where);
        if (whereKeys.length === 1 && typeof args.where[whereKeys[0]] === 'object') {
          // Contrainte unique composite
          const compositeWhere = args.where[whereKeys[0]];
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(compositeWhere)) {
            const mappedKey = mapFieldName(tableName, key);
            conditions.push(`${mappedKey} = ?`);
            params.push(value);
          }
          query += ` WHERE ${conditions.join(' AND ')}`;
        } else {
          // Simple where
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(args.where)) {
            const mappedKey = mapFieldName(tableName, key);
            conditions.push(`${mappedKey} = ?`);
            params.push(value);
          }
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ' LIMIT 1';

        const stmt = db.prepare(query);
        const row = stmt.get(...params);
        return Promise.resolve(reverseMapRow(tableName, row) || null);
      } catch (e) {
        console.error(`Erreur dans findUnique pour ${tableName}:`, e);
        return Promise.resolve(null);
      }
    },
    findMany: (args?: any) => {
      // Implémentation basique pour findMany (utilisé par le moteur de cotisations)
      try {
        let query = `SELECT * FROM ${tableName}`;
        const params: any[] = [];

        if (args?.where) {
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(args.where)) {
            // Skip OR key as it's handled separately
            if (key === 'OR') continue;

            const mappedKey = mapFieldName(tableName, key);
            if (typeof value === 'boolean') {
              conditions.push(`${mappedKey} = ?`);
              params.push(value ? 1 : 0);
            } else if (value !== null && value !== undefined) {
              conditions.push(`${mappedKey} = ?`);
              params.push(value);
            }
          }

          // Support pour OR
          if ((args.where as any).OR) {
            const orConditions: string[] = [];
            for (const orClause of (args.where as any).OR) {
              for (const [key, value] of Object.entries(orClause)) {
                const mappedKey = mapFieldName(tableName, key);
                if (value === null) {
                  orConditions.push(`${mappedKey} IS NULL`);
                } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
                  for (const [op, opValue] of Object.entries(value)) {
                    const paramValue = opValue instanceof Date ? opValue.toISOString() : opValue;
                    if (op === 'gt') {
                      orConditions.push(`${mappedKey} > ?`);
                      params.push(paramValue);
                    } else if (op === 'gte') {
                      orConditions.push(`${mappedKey} >= ?`);
                      params.push(paramValue);
                    } else if (op === 'lt') {
                      orConditions.push(`${mappedKey} < ?`);
                      params.push(paramValue);
                    } else if (op === 'lte') {
                      orConditions.push(`${mappedKey} <= ?`);
                      params.push(paramValue);
                    }
                  }
                } else if (typeof value === 'boolean') {
                  orConditions.push(`${mappedKey} = ?`);
                  params.push(value ? 1 : 0);
                } else {
                  orConditions.push(`${mappedKey} = ?`);
                  params.push(value);
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
                    regle: 'regles_cotisation',
                    employe: 'Employee',
                    employee: 'Employee',
                    compagnie: 'Company',
                    company: 'Company',
                    declaration: 'dsn_declarations',
                    auteur: 'User',
                    lignesCotisations: 'lignes_cotisation_fiche_paie'
                  };

                  const relationTable = tableMapping[relationName] || relationName;
                  const relQuery = `SELECT * FROM ${relationTable} WHERE id = ?`;

                  try {
                    const relStmt = db.prepare(relQuery);
                    const relRow = relStmt.get(row[relationIdField]);

                    if (process.env.DEBUG_DB) {
                      console.log(`[DB] Relation ${relationName}: table=${relationTable}, id=${row[relationIdField]}, found=${!!relRow}`);
                    }

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

        // Appliquer le reverse mapping à tous les résultats
        const mappedRows = rows.map((row: any) => reverseMapRow(tableName, row));
        return Promise.resolve(mappedRows);
      } catch (e: any) {
        console.error(`Erreur dans findMany pour ${tableName}:`);
        console.error(`  Message: ${e.message}`);
        console.error(`  Code: ${e.code}`);
        console.error(`  Full error:`, e);
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
            if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
              // Support pour les opérateurs (lte, gte, etc.)
              for (const [op, opValue] of Object.entries(value)) {
                // Convertir les dates en chaînes ISO pour SQLite
                const paramValue = opValue instanceof Date ? opValue.toISOString() : opValue;

                if (op === 'lte') {
                  conditions.push(`${key} <= ?`);
                  params.push(paramValue);
                } else if (op === 'gte') {
                  conditions.push(`${key} >= ?`);
                  params.push(paramValue);
                } else if (op === 'gt') {
                  conditions.push(`${key} > ?`);
                  params.push(paramValue);
                } else if (op === 'lt') {
                  conditions.push(`${key} < ?`);
                  params.push(paramValue);
                }
              }
            } else if (typeof value === 'boolean') {
              conditions.push(`${key} = ?`);
              params.push(value ? 1 : 0);
            } else if (value !== null && value !== undefined) {
              // Convertir les dates en chaînes ISO pour SQLite
              const paramValue = value instanceof Date ? value.toISOString() : value;
              conditions.push(`${key} = ?`);
              params.push(paramValue);
            }
          }

          // Support pour OR
          if ((args.where as any).OR) {
            const orConditions: string[] = [];
            for (const orClause of (args.where as any).OR) {
              for (const [key, value] of Object.entries(orClause)) {
                if (value === null) {
                  orConditions.push(`${key} IS NULL`);
                } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
                  for (const [op, opValue] of Object.entries(value)) {
                    // Convertir les dates en chaînes ISO pour SQLite
                    const paramValue = opValue instanceof Date ? opValue.toISOString() : opValue;

                    if (op === 'gt') {
                      orConditions.push(`${key} > ?`);
                      params.push(paramValue);
                    } else if (op === 'gte') {
                      orConditions.push(`${key} >= ?`);
                      params.push(paramValue);
                    } else if (op === 'lt') {
                      orConditions.push(`${key} < ?`);
                      params.push(paramValue);
                    } else if (op === 'lte') {
                      orConditions.push(`${key} <= ?`);
                      params.push(paramValue);
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
        console.error(`Erreur dans findFirst pour ${tableName}:`, e);
        return Promise.resolve(null);
      }
    },
    update: (args?: any) => {
      try {
        if (!args?.where || !args?.data) {
          throw new Error('Update nécessite where et data');
        }

        const data = { ...args.data };

        // Ajouter updatedAt automatiquement
        if (!data.updatedAt) {
          data.updatedAt = new Date().toISOString();
        }

        const setFields = Object.keys(data);
        const mappedSetFields = setFields.map(f => mapFieldName(tableName, f));
        const setValues = Object.values(data).map(v => {
          if (v instanceof Date) {
            return v.toISOString();
          } else if (typeof v === 'object' && v !== null) {
            return JSON.stringify(v);
          }
          return v;
        });

        const setClause = mappedSetFields.map(f => `${f} = ?`).join(', ');
        const whereConditions: string[] = [];
        const whereValues: any[] = [];

        for (const [key, value] of Object.entries(args.where)) {
          const mappedKey = mapFieldName(tableName, key);
          whereConditions.push(`${mappedKey} = ?`);
          whereValues.push(value);
        }

        const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereConditions.join(' AND ')}`;
        const stmt = db.prepare(query);
        stmt.run(...setValues, ...whereValues);

        // Retourner l'objet mis à jour
        const selectQuery = `SELECT * FROM ${tableName} WHERE ${whereConditions.join(' AND ')}`;
        const selectStmt = db.prepare(selectQuery);
        const row = selectStmt.get(...whereValues);

        return Promise.resolve(reverseMapRow(tableName, row));
      } catch (e) {
        console.error(`Erreur dans update pour ${tableName}:`, e);
        return Promise.reject(e);
      }
    },
    delete: (args?: any) => {
      try {
        if (!args?.where) {
          throw new Error('Delete nécessite where');
        }

        const conditions: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(args.where)) {
          conditions.push(`${key} = ?`);
          values.push(value);
        }

        const query = `DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')}`;
        const stmt = db.prepare(query);
        stmt.run(...values);

        return Promise.resolve({ count: stmt.changes });
      } catch (e) {
        console.error(`Erreur dans delete pour ${tableName}:`, e);
        return Promise.reject(e);
      }
    },
    deleteMany: (args?: any) => {
      try {
        let query = `DELETE FROM ${tableName}`;
        const values: any[] = [];

        if (args?.where) {
          const conditions: string[] = [];
          for (const [key, value] of Object.entries(args.where)) {
            conditions.push(`${key} = ?`);
            values.push(value);
          }
          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        const stmt = db.prepare(query);
        stmt.run(...values);

        return Promise.resolve({ count: stmt.changes });
      } catch (e) {
        console.error(`Erreur dans deleteMany pour ${tableName}:`, e);
        return Promise.reject(e);
      }
    },
  };
  };

  prisma = {
    user: createModelWrapper('User'),
    utilisateur: createModelWrapper('User'), // Alias français pour User
    company: createModelWrapper('Company'),
    compagnie: createModelWrapper('Company'), // Alias français pour Company
    employee: createModelWrapper('Employee'),
    employe: createModelWrapper('Employee'), // Alias français pour Employee
    fichePaie: createModelWrapper('Payslip'),
    ligneCotisationFichePaie: createModelWrapper('lignes_cotisation_fiche_paie'),
    regleCotisation: createModelWrapper('regles_cotisation'),
    tauxCotisation: createModelWrapper('taux_cotisation'),
    trancheCotisation: createModelWrapper('tranches_cotisation'),
    categorieCotisation: createModelWrapper('categories_cotisation'),
    organismeCotisation: createModelWrapper('organismes_cotisation'),
    regleComptable: createModelWrapper('regles_comptables'),
    accountingIntegration: createModelWrapper('accounting_integrations'),
    accountingExportLog: createModelWrapper('accounting_export_logs'),
    dSNDeclaration: createModelWrapper('dsn_declarations'),
    transmissionDSN: createModelWrapper('transmissions_dsn'),
    configurationNetEntreprises: createModelWrapper('configurations_net_entreprises'),
    dSNEvent: createModelWrapper('dsn_events'),
    leave: createModelWrapper('leaves'),
    leaveBalance: createModelWrapper('leave_balances'),
    expense: createModelWrapper('expenses'),
    expenseReport: createModelWrapper('expense_reports'),
    expenseItem: createModelWrapper('expense_items'),
    $disconnect: () => { db.close(); return Promise.resolve(); },
    $connect: () => Promise.resolve(),
  };
}

export default prisma;
