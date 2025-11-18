/**
 * Script pour appliquer les migrations SQLite avec better-sqlite3
 * Utilisé à la place de Prisma migrate pour éviter les problèmes de téléchargement de binaires
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Déterminer le fichier de base de données selon l'environnement
const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
const dbPath = path.join(__dirname, '../prisma', dbFileName);

// En mode test, supprimer la base existante pour repartir à zéro
if (process.env.NODE_ENV === 'test' && fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log(`Deleted existing ${dbFileName} to start fresh`);
}

console.log(`Applying migrations to ${dbFileName}...`);

// Créer ou ouvrir la base de données
const db = new Database(dbPath);

// Lire et appliquer toutes les migrations
const migrationsDir = path.join(__dirname, '../prisma/migrations');
const migrations = fs.readdirSync(migrationsDir)
  .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
  .sort();

console.log(`Found ${migrations.length} migration(s)`);

for (const migration of migrations) {
  const sqlFile = path.join(migrationsDir, migration, 'migration.sql');
  if (fs.existsSync(sqlFile)) {
    console.log(`Applying migration: ${migration}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Enlever les lignes de commentaires et séparer les instructions SQL
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (err) {
        // Ignorer les erreurs pour les tables/colonnes/index déjà existants
        if (!err.message.includes('already exists') &&
            !err.message.includes('duplicate column') &&
            !err.message.includes('UNIQUE constraint')) {
          console.error(`  Error executing statement:`, err.message);
          console.error(`  Statement:`, statement.substring(0, 100));
          throw err;
        }
        // Ne pas logger "Skipped" pour éviter le spam
      }
    }
    console.log(`  ✓ Applied`);
  }
}

db.close();
console.log('Migrations completed successfully');
