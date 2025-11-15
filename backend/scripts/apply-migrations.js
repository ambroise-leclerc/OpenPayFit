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
    try {
      db.exec(sql);
    } catch (err) {
      // Ignorer les erreurs pour les tables/colonnes déjà existantes
      if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
        console.error(`Error applying migration ${migration}:`, err.message);
        throw err;
      } else {
        console.log(`  Skipped (already applied)`);
      }
    }
  }
}

db.close();
console.log('Migrations completed successfully');
