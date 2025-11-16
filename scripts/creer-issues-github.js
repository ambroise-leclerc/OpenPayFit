#!/usr/bin/env node

/**
 * Script pour créer automatiquement les 7 issues GitHub
 * pour le système de règles de cotisations
 *
 * Usage:
 *   GITHUB_TOKEN=votre_token node scripts/creer-issues-github.js
 *
 * Pour créer un token GitHub:
 *   1. Aller sur https://github.com/settings/tokens
 *   2. Cliquer "Generate new token" > "Generate new token (classic)"
 *   3. Cocher la permission "repo"
 *   4. Copier le token généré
 */

const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'ambroise-leclerc';
const REPO_NAME = 'OpenPayFit';
const API_BASE = 'https://api.github.com';

// Fichiers des issues dans l'ordre
const ISSUE_FILES = [
  '01-schema-donnees.md',
  '02-dsl-yaml.md',
  '03-api-gestion.md',
  '04-moteur-calcul.md',
  '05-interface-admin.md',
  '06-donnees-france-2024.md',
  '07-migration-module-paie.md'
];

/**
 * Parse un fichier markdown avec frontmatter YAML
 */
function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extraire le frontmatter (entre les ---)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`Impossible de parser le frontmatter dans ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Extraire le titre
  const titleMatch = frontmatter.match(/title:\s*"(.+)"/);
  const title = titleMatch ? titleMatch[1] : 'Sans titre';

  // Extraire les labels
  const labelsMatch = frontmatter.match(/labels:\s*(.+)/);
  const labels = labelsMatch ? labelsMatch[1].split(',').map(l => l.trim()) : [];

  return { title, labels, body };
}

/**
 * Crée une issue sur GitHub via l'API REST
 */
async function createGitHubIssue(title, body, labels) {
  const url = `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      body,
      labels
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

/**
 * Attend un délai (pour éviter de surcharger l'API GitHub)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fonction principale
 */
async function main() {
  // Vérifier le token
  if (!GITHUB_TOKEN) {
    console.error('❌ Erreur: GITHUB_TOKEN non défini');
    console.error('\nPour créer un token GitHub:');
    console.error('  1. Aller sur https://github.com/settings/tokens');
    console.error('  2. Cliquer "Generate new token" > "Generate new token (classic)"');
    console.error('  3. Cocher la permission "repo"');
    console.error('  4. Copier le token généré');
    console.error('\nPuis exécuter:');
    console.error('  GITHUB_TOKEN=votre_token node scripts/creer-issues-github.js');
    process.exit(1);
  }

  console.log('🚀 Création des issues GitHub pour le système de règles de cotisations\n');
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}\n`);

  const issuesDir = path.join(__dirname, '..', '.github', 'ISSUE_PROPOSALS', 'issues');
  const createdIssues = [];

  // Créer chaque issue
  for (let i = 0; i < ISSUE_FILES.length; i++) {
    const fileName = ISSUE_FILES[i];
    const filePath = path.join(issuesDir, fileName);

    console.log(`[${i + 1}/${ISSUE_FILES.length}] Traitement de ${fileName}...`);

    try {
      // Parser le fichier
      const { title, labels, body } = parseMarkdownFile(filePath);

      console.log(`  📝 Titre: ${title}`);
      console.log(`  🏷️  Labels: ${labels.join(', ')}`);

      // Créer l'issue
      const issue = await createGitHubIssue(title, body, labels);

      console.log(`  ✅ Issue créée: #${issue.number}`);
      console.log(`  🔗 URL: ${issue.html_url}\n`);

      createdIssues.push({
        number: issue.number,
        title: issue.title,
        url: issue.html_url
      });

      // Attendre 1 seconde entre chaque création pour ne pas surcharger l'API
      if (i < ISSUE_FILES.length - 1) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}\n`);
      process.exit(1);
    }
  }

  // Résumé
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✨ Toutes les issues ont été créées avec succès!\n');

  createdIssues.forEach((issue, index) => {
    console.log(`${index + 1}. #${issue.number} - ${issue.title}`);
    console.log(`   ${issue.url}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📋 Prochaines étapes:');
  console.log('  1. Vérifier les issues créées sur GitHub');
  console.log('  2. Ajuster l\'ordre ou les priorités si nécessaire');
  console.log('  3. Assigner les issues aux développeurs');
  console.log('  4. Créer un projet GitHub pour suivre l\'avancement');
  console.log('\n🎯 Bon développement!');
}

// Exécuter
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
