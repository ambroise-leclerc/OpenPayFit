/**
 * Script de seed pour charger les données de référence des cotisations sociales
 * depuis le fichier YAML des fixtures.
 *
 * Usage: node scripts/seed-cotisations.js [chemin-fichier-yaml]
 *
 * Par défaut, charge le fichier cotisations-france-2024-2025.yaml
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { randomUUID } = require('crypto');

// Déterminer le fichier de base de données selon l'environnement
const dbFileName = process.env.NODE_ENV === 'test' ? 'test.db' : 'dev.db';
const dbPath = path.join(__dirname, '../prisma', dbFileName);

console.log(`🗄️  Base de données: ${dbFileName}\n`);

// Ouvrir la base de données
const db = new Database(dbPath);

// ====================================
// MAPPING DES ENUMS
// ====================================

const TYPE_COTISATION_MAP = {
  'COTISATION_SALARIALE': 'COTISATION_SALARIALE',
  'COTISATION_PATRONALE': 'COTISATION_PATRONALE',
  'CHARGE_FISCALE': 'CHARGE_FISCALE',
};

const TYPE_CALCUL_MAP = {
  'POURCENTAGE': 'POURCENTAGE',
  'MONTANT_FIXE': 'MONTANT_FIXE',
  'TRANCHES': 'TRANCHES',
};

const TYPE_ASSIETTE_MAP = {
  'SALAIRE_BRUT': 'SALAIRE_BRUT',
  'SALAIRE_NET': 'SALAIRE_NET',
  'SALAIRE_PLAFONNE': 'SALAIRE_PLAFONNE',
};

// ====================================
// MAPPING CATÉGORIES
// ====================================

const CATEGORIES_INFO = {
  'SECURITE_SOCIALE': {
    nom: 'Sécurité sociale',
    description: 'Cotisations de sécurité sociale (maladie, maternité, invalidité, décès)',
  },
  'RETRAITE': {
    nom: 'Retraite de base',
    description: 'Cotisations de retraite de base (plafonnée et déplafonnée)',
  },
  'RETRAITE_COMPLEMENTAIRE': {
    nom: 'Retraite complémentaire',
    description: 'Cotisations de retraite complémentaire AGIRC-ARRCO',
  },
  'CHOMAGE': {
    nom: 'Assurance chômage',
    description: 'Cotisations d\'assurance chômage',
  },
  'FAMILLE': {
    nom: 'Allocations familiales',
    description: 'Cotisations pour les allocations familiales',
  },
  'AT_MP': {
    nom: 'Accidents du travail et maladies professionnelles',
    description: 'Cotisations AT/MP',
  },
  'CSG_CRDS': {
    nom: 'CSG et CRDS',
    description: 'Contribution sociale généralisée et contribution au remboursement de la dette sociale',
  },
  'FORMATION': {
    nom: 'Formation professionnelle',
    description: 'Contribution à la formation professionnelle',
  },
  'SOLIDARITE': {
    nom: 'Solidarité et autonomie',
    description: 'Contributions de solidarité (CSA)',
  },
  'LOGEMENT': {
    nom: 'Aide au logement',
    description: 'Fonds national d\'aide au logement (FNAL)',
  },
  'COMPLEMENTAIRE': {
    nom: 'Complémentaire',
    description: 'Cotisations complémentaires',
  },
  'AUTRES': {
    nom: 'Autres contributions',
    description: 'Autres contributions et taxes',
  },
};

// ====================================
// MAPPING ORGANISMES
// ====================================

const ORGANISMES_INFO = {
  'URSSAF': {
    nom: 'URSSAF',
    description: 'Union de recouvrement des cotisations de sécurité sociale et d\'allocations familiales',
  },
  'AGIRC_ARRCO': {
    nom: 'AGIRC-ARRCO',
    description: 'Association pour le régime de retraite complémentaire des salariés',
  },
  'POLE_EMPLOI': {
    nom: 'Pôle emploi',
    description: 'Service public de l\'emploi (assurance chômage)',
  },
};

// ====================================
// FONCTIONS UTILITAIRES
// ====================================

/**
 * Charge et parse le fichier YAML des cotisations
 */
function chargerFichierYAML(cheminFichier) {
  console.log(`📂 Chargement du fichier: ${cheminFichier}`);

  if (!fs.existsSync(cheminFichier)) {
    throw new Error(`Le fichier ${cheminFichier} n'existe pas`);
  }

  const contenu = fs.readFileSync(cheminFichier, 'utf8');
  const donnees = yaml.parse(contenu);

  console.log(`✅ Fichier chargé: ${donnees.cotisations.length} cotisations trouvées`);
  console.log(`   Version: ${donnees.version}`);
  console.log(`   Description: ${donnees.description}\n`);

  return donnees;
}

/**
 * Crée ou met à jour les catégories de cotisations
 */
function syncCategories(cotisations) {
  console.log('📁 Synchronisation des catégories...');

  const categoriesUniques = [...new Set(cotisations.map(c => c.categorie))];
  const categoriesMap = new Map();

  const insertCategorie = db.prepare(`
    INSERT INTO categories_cotisation (id, code, nom, description, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const updateCategorie = db.prepare(`
    UPDATE categories_cotisation
    SET nom = ?, description = ?, updatedAt = datetime('now')
    WHERE code = ?
  `);

  const getCategorie = db.prepare('SELECT id FROM categories_cotisation WHERE code = ?');

  for (const codeCategorie of categoriesUniques) {
    const info = CATEGORIES_INFO[codeCategorie];
    if (!info) {
      console.warn(`⚠️  Catégorie inconnue: ${codeCategorie} - utilisation du code comme nom`);
    }

    // Vérifier si la catégorie existe déjà
    let row = getCategorie.get(codeCategorie);
    let categorieId;

    if (row) {
      categorieId = row.id;
      // Mettre à jour la catégorie existante sans modifier createdAt
      updateCategorie.run(
        info?.nom || codeCategorie,
        info?.description || null,
        codeCategorie
      );
    } else {
      categorieId = randomUUID();
      insertCategorie.run(
        categorieId,
        codeCategorie,
        info?.nom || codeCategorie,
        info?.description || null
      );
    }

    categoriesMap.set(codeCategorie, categorieId);
    console.log(`   ✓ ${codeCategorie}: ${info?.nom || codeCategorie}`);
  }

  console.log(`✅ ${categoriesUniques.length} catégories synchronisées\n`);
  return categoriesMap;
}

/**
 * Crée ou met à jour les organismes de cotisations
 */
function syncOrganismes(cotisations) {
  console.log('🏢 Synchronisation des organismes...');

  const organismesUniques = [...new Set(cotisations.map(c => c.organisme))];
  const organismesMap = new Map();

  const insertOrganisme = db.prepare(`
    INSERT INTO organismes_cotisation (id, code, nom, description, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const updateOrganisme = db.prepare(`
    UPDATE organismes_cotisation
    SET nom = ?, description = ?, updatedAt = datetime('now')
    WHERE code = ?
  `);

  const getOrganisme = db.prepare('SELECT id FROM organismes_cotisation WHERE code = ?');

  for (const codeOrganisme of organismesUniques) {
    const info = ORGANISMES_INFO[codeOrganisme];
    if (!info) {
      console.warn(`⚠️  Organisme inconnu: ${codeOrganisme} - utilisation du code comme nom`);
    }

    // Vérifier si l'organisme existe déjà
    let row = getOrganisme.get(codeOrganisme);
    let organismeId;

    if (row) {
      organismeId = row.id;
      // Mettre à jour l'organisme existant sans modifier createdAt
      updateOrganisme.run(
        info?.nom || codeOrganisme,
        info?.description || null,
        codeOrganisme
      );
    } else {
      organismeId = randomUUID();
      insertOrganisme.run(
        organismeId,
        codeOrganisme,
        info?.nom || codeOrganisme,
        info?.description || null
      );
    }

    organismesMap.set(codeOrganisme, organismeId);
    console.log(`   ✓ ${codeOrganisme}: ${info?.nom || codeOrganisme}`);
  }

  console.log(`✅ ${organismesUniques.length} organismes synchronisés\n`);
  return organismesMap;
}

/**
 * Crée ou met à jour une règle de cotisation avec ses taux et règles comptables
 */
function syncRegleCotisation(cotisation, categorieId, organismeId) {
  // 1. Créer ou mettre à jour la règle
  const getRegle = db.prepare('SELECT id FROM regles_cotisation WHERE code = ?');
  let row = getRegle.get(cotisation.code);
  let regleId;

  if (row) {
    regleId = row.id;
    const updateRegle = db.prepare(`
      UPDATE regles_cotisation
      SET nom = ?, description = ?, categorieId = ?, organismeId = ?,
          typeCotisation = ?, typeCalcul = ?, typeAssiette = ?,
          plancher = ?, plafond = ?, estActif = ?,
          applicableACadre = ?, applicableANonCadre = ?, applicableAForfaitJours = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `);

    updateRegle.run(
      cotisation.nom,
      cotisation.description || null,
      categorieId,
      organismeId,
      TYPE_COTISATION_MAP[cotisation.type],
      TYPE_CALCUL_MAP[cotisation.calcul.type],
      TYPE_ASSIETTE_MAP[cotisation.calcul.assiette],
      cotisation.calcul.plancher,
      cotisation.calcul.plafond,
      cotisation.actif ? 1 : 0,
      cotisation.applicableACadre !== undefined ? (cotisation.applicableACadre ? 1 : 0) : null,
      cotisation.applicableANonCadre !== undefined ? (cotisation.applicableANonCadre ? 1 : 0) : null,
      cotisation.applicableAForfaitJours !== undefined ? (cotisation.applicableAForfaitJours ? 1 : 0) : null,
      regleId
    );
  } else {
    regleId = randomUUID();
    const insertRegle = db.prepare(`
      INSERT INTO regles_cotisation (
        id, code, nom, description, categorieId, organismeId,
        typeCotisation, typeCalcul, typeAssiette, plancher, plafond,
        estActif, applicableACadre, applicableANonCadre, applicableAForfaitJours,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertRegle.run(
      regleId,
      cotisation.code,
      cotisation.nom,
      cotisation.description || null,
      categorieId,
      organismeId,
      TYPE_COTISATION_MAP[cotisation.type],
      TYPE_CALCUL_MAP[cotisation.calcul.type],
      TYPE_ASSIETTE_MAP[cotisation.calcul.assiette],
      cotisation.calcul.plancher,
      cotisation.calcul.plafond,
      cotisation.actif ? 1 : 0,
      cotisation.applicableACadre !== undefined ? (cotisation.applicableACadre ? 1 : 0) : null,
      cotisation.applicableANonCadre !== undefined ? (cotisation.applicableANonCadre ? 1 : 0) : null,
      cotisation.applicableAForfaitJours !== undefined ? (cotisation.applicableAForfaitJours ? 1 : 0) : null
    );
  }

  // 2. Supprimer les anciens taux
  const deleteTaux = db.prepare('DELETE FROM taux_cotisation WHERE regleId = ?');
  deleteTaux.run(regleId);

  // 3. Créer les nouveaux taux (si présents)
  if (cotisation.taux && cotisation.taux.length > 0) {
    const insertTaux = db.prepare(`
      INSERT INTO taux_cotisation (id, regleId, taux, dateDebut, dateFin, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    for (const tauxData of cotisation.taux) {
      insertTaux.run(
        randomUUID(),
        regleId,
        tauxData.taux,
        tauxData.date_debut,
        tauxData.date_fin || null
      );
    }
  }

  // 4. Supprimer les anciennes tranches
  const deleteTranches = db.prepare('DELETE FROM tranches_cotisation WHERE regleId = ?');
  deleteTranches.run(regleId);

  // 5. Créer les nouvelles tranches (si présentes)
  if (cotisation.tranches && cotisation.tranches.length > 0) {
    const insertTranche = db.prepare(`
      INSERT INTO tranches_cotisation (
        id, regleId, tranche, taux, plancherPASS, plafondPASS, ordre,
        dateDebut, dateFin, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    for (const trancheData of cotisation.tranches) {
      insertTranche.run(
        randomUUID(),
        regleId,
        trancheData.tranche,
        trancheData.taux,
        trancheData.plancher_pass !== undefined ? trancheData.plancher_pass : 0,
        trancheData.plafond_pass,
        trancheData.ordre,
        trancheData.date_debut,
        trancheData.date_fin || null
      );
    }
  }

  // 6. Supprimer les anciennes règles comptables
  const deleteCompta = db.prepare('DELETE FROM regles_comptables WHERE regleId = ?');
  deleteCompta.run(regleId);

  // 7. Créer la nouvelle règle comptable
  const insertCompta = db.prepare(`
    INSERT INTO regles_comptables (id, regleId, compteDebit, compteCredit, description, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  insertCompta.run(
    randomUUID(),
    regleId,
    cotisation.comptabilite.compte_debit,
    cotisation.comptabilite.compte_credit,
    `Écriture comptable pour ${cotisation.nom}`
  );

  console.log(`   ✓ ${cotisation.code}: ${cotisation.nom}`);
}

/**
 * Synchronise toutes les règles de cotisations
 */
function syncRegles(cotisations, categoriesMap, organismesMap) {
  console.log('📋 Synchronisation des règles de cotisations...');

  let compteur = 0;
  for (const cotisation of cotisations) {
    const categorieId = categoriesMap.get(cotisation.categorie);
    const organismeId = organismesMap.get(cotisation.organisme);

    if (!categorieId || !organismeId) {
      console.error(`❌ Impossible de créer la règle ${cotisation.code}: catégorie ou organisme manquant`);
      continue;
    }

    syncRegleCotisation(cotisation, categorieId, organismeId);
    compteur++;
  }

  console.log(`✅ ${compteur} règles de cotisations synchronisées\n`);
}

/**
 * Affiche un récapitulatif des données chargées
 */
function afficherRecapitulatif() {
  console.log('📊 Récapitulatif des données en base:');

  const countCategories = db.prepare('SELECT COUNT(*) as count FROM categories_cotisation').get();
  const countOrganismes = db.prepare('SELECT COUNT(*) as count FROM organismes_cotisation').get();
  const countRegles = db.prepare('SELECT COUNT(*) as count FROM regles_cotisation').get();
  const countTaux = db.prepare('SELECT COUNT(*) as count FROM taux_cotisation').get();
  const countTranches = db.prepare('SELECT COUNT(*) as count FROM tranches_cotisation').get();
  const countCompta = db.prepare('SELECT COUNT(*) as count FROM regles_comptables').get();

  console.log(`   • Catégories: ${countCategories.count}`);
  console.log(`   • Organismes: ${countOrganismes.count}`);
  console.log(`   • Règles de cotisations: ${countRegles.count}`);
  console.log(`   • Taux historiques: ${countTaux.count}`);
  console.log(`   • Tranches de cotisation: ${countTranches.count}`);
  console.log(`   • Règles comptables: ${countCompta.count}`);

  // Détail par type de cotisation
  const parType = db.prepare(`
    SELECT typeCotisation, COUNT(*) as count
    FROM regles_cotisation
    GROUP BY typeCotisation
  `).all();

  console.log('\n   Répartition par type:');
  parType.forEach(({ typeCotisation, count }) => {
    console.log(`   • ${typeCotisation}: ${count}`);
  });
}

// ====================================
// FONCTION PRINCIPALE
// ====================================

function main() {
  console.log('🚀 Démarrage du seed des cotisations sociales\n');
  console.log('================================================\n');

  try {
    // 1. Déterminer le fichier à charger
    const cheminFichier = process.argv[2] ||
      path.join(__dirname, '../fixtures/cotisations/cotisations-france-2024-2025.yaml');

    // 2. Charger le fichier YAML
    const donnees = chargerFichierYAML(cheminFichier);

    // 3. Synchroniser les catégories
    const categoriesMap = syncCategories(donnees.cotisations);

    // 4. Synchroniser les organismes
    const organismesMap = syncOrganismes(donnees.cotisations);

    // 5. Synchroniser les règles de cotisations
    syncRegles(donnees.cotisations, categoriesMap, organismesMap);

    // 6. Afficher le récapitulatif
    afficherRecapitulatif();

    console.log('\n================================================');
    console.log('✅ Seed terminé avec succès!\n');
  } catch (error) {
    console.error('\n❌ Erreur lors du seed:');
    console.error(error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Exécution
main();
