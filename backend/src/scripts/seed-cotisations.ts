/**
 * Script de seed pour charger les données de référence des cotisations sociales
 * depuis le fichier YAML des fixtures.
 *
 * Usage: ts-node src/scripts/seed-cotisations.ts [chemin-fichier-yaml]
 *
 * Par défaut, charge le fichier cotisations-france-2024-2025.yaml
 */

import fs = require('fs');
import path = require('path');
import yaml = require('yaml');
import { PrismaClient, TypeCotisation, TypeCalcul, TypeAssiette } from '@prisma/client';

const prisma = new PrismaClient();

// ====================================
// TYPES POUR LE PARSING YAML
// ====================================

interface CotisationYAML {
  code: string;
  nom: string;
  description?: string;
  categorie: string;
  organisme: string;
  type: string;
  actif: boolean;
  calcul: {
    type: string;
    assiette: string;
    plafond: number | null;
    plancher: number | null;
  };
  taux: Array<{
    taux: number;
    date_debut: string;
    date_fin: string | null;
  }>;
  comptabilite: {
    compte_debit: string;
    compte_credit: string;
  };
}

interface FixtureYAML {
  version: string;
  date_creation: string;
  description: string;
  source?: string;
  constantes?: Record<string, number>;
  cotisations: CotisationYAML[];
}

// ====================================
// MAPPING DES ENUMS
// ====================================

const TYPE_COTISATION_MAP: Record<string, TypeCotisation> = {
  'COTISATION_SALARIALE': TypeCotisation.COTISATION_SALARIALE,
  'COTISATION_PATRONALE': TypeCotisation.COTISATION_PATRONALE,
  'CHARGE_FISCALE': TypeCotisation.CHARGE_FISCALE,
};

const TYPE_CALCUL_MAP: Record<string, TypeCalcul> = {
  'POURCENTAGE': TypeCalcul.POURCENTAGE,
  'MONTANT_FIXE': TypeCalcul.MONTANT_FIXE,
  'TRANCHES': TypeCalcul.TRANCHES,
};

const TYPE_ASSIETTE_MAP: Record<string, TypeAssiette> = {
  'SALAIRE_BRUT': TypeAssiette.SALAIRE_BRUT,
  'SALAIRE_NET': TypeAssiette.SALAIRE_NET,
  'SALAIRE_PLAFONNE': TypeAssiette.SALAIRE_PLAFONNE,
};

// ====================================
// MAPPING CATÉGORIES
// ====================================

const CATEGORIES_INFO: Record<string, { nom: string; description: string }> = {
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

const ORGANISMES_INFO: Record<string, { nom: string; description: string }> = {
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
function chargerFichierYAML(cheminFichier: string): FixtureYAML {
  console.log(`📂 Chargement du fichier: ${cheminFichier}`);

  if (!fs.existsSync(cheminFichier)) {
    throw new Error(`Le fichier ${cheminFichier} n'existe pas`);
  }

  const contenu = fs.readFileSync(cheminFichier, 'utf8');
  const donnees = yaml.parse(contenu) as FixtureYAML;

  console.log(`✅ Fichier chargé: ${donnees.cotisations.length} cotisations trouvées`);
  console.log(`   Version: ${donnees.version}`);
  console.log(`   Description: ${donnees.description}`);

  return donnees;
}

/**
 * Crée ou met à jour les catégories de cotisations
 */
async function syncCategories(cotisations: CotisationYAML[]): Promise<Map<string, string>> {
  console.log('\n📁 Synchronisation des catégories...');

  const categoriesUniques = new Set(cotisations.map(c => c.categorie));
  const categoriesMap = new Map<string, string>();

  for (const codeCategorie of categoriesUniques) {
    const info = CATEGORIES_INFO[codeCategorie];
    if (!info) {
      console.warn(`⚠️  Catégorie inconnue: ${codeCategorie} - utilisation du code comme nom`);
    }

    const categorie = await prisma.categorieCotisation.upsert({
      where: { code: codeCategorie },
      update: {
        nom: info?.nom || codeCategorie,
        description: info?.description || null,
      },
      create: {
        code: codeCategorie,
        nom: info?.nom || codeCategorie,
        description: info?.description || null,
      },
    });

    categoriesMap.set(codeCategorie, categorie.id);
    console.log(`   ✓ ${codeCategorie}: ${categorie.nom}`);
  }

  console.log(`✅ ${categoriesUniques.size} catégories synchronisées`);
  return categoriesMap;
}

/**
 * Crée ou met à jour les organismes de cotisations
 */
async function syncOrganismes(cotisations: CotisationYAML[]): Promise<Map<string, string>> {
  console.log('\n🏢 Synchronisation des organismes...');

  const organismesUniques = new Set(cotisations.map(c => c.organisme));
  const organismesMap = new Map<string, string>();

  for (const codeOrganisme of organismesUniques) {
    const info = ORGANISMES_INFO[codeOrganisme];
    if (!info) {
      console.warn(`⚠️  Organisme inconnu: ${codeOrganisme} - utilisation du code comme nom`);
    }

    const organisme = await prisma.organismeCotisation.upsert({
      where: { code: codeOrganisme },
      update: {
        nom: info?.nom || codeOrganisme,
        description: info?.description || null,
      },
      create: {
        code: codeOrganisme,
        nom: info?.nom || codeOrganisme,
        description: info?.description || null,
      },
    });

    organismesMap.set(codeOrganisme, organisme.id);
    console.log(`   ✓ ${codeOrganisme}: ${organisme.nom}`);
  }

  console.log(`✅ ${organismesUniques.size} organismes synchronisés`);
  return organismesMap;
}

/**
 * Crée ou met à jour une règle de cotisation avec ses taux et règles comptables
 */
async function syncRegleCotisation(
  cotisation: CotisationYAML,
  categorieId: string,
  organismeId: string
): Promise<void> {
  // 1. Créer ou mettre à jour la règle
  const regle = await prisma.regleCotisation.upsert({
    where: { code: cotisation.code },
    update: {
      nom: cotisation.nom,
      description: cotisation.description || null,
      categorieId,
      organismeId,
      typeCotisation: TYPE_COTISATION_MAP[cotisation.type],
      typeCalcul: TYPE_CALCUL_MAP[cotisation.calcul.type],
      typeAssiette: TYPE_ASSIETTE_MAP[cotisation.calcul.assiette],
      plancher: cotisation.calcul.plancher,
      plafond: cotisation.calcul.plafond,
      estActif: cotisation.actif,
    },
    create: {
      code: cotisation.code,
      nom: cotisation.nom,
      description: cotisation.description || null,
      categorieId,
      organismeId,
      typeCotisation: TYPE_COTISATION_MAP[cotisation.type],
      typeCalcul: TYPE_CALCUL_MAP[cotisation.calcul.type],
      typeAssiette: TYPE_ASSIETTE_MAP[cotisation.calcul.assiette],
      plancher: cotisation.calcul.plancher,
      plafond: cotisation.calcul.plafond,
      estActif: cotisation.actif,
    },
  });

  // 2. Supprimer les anciens taux
  await prisma.tauxCotisation.deleteMany({
    where: { regleId: regle.id },
  });

  // 3. Créer les nouveaux taux
  for (const tauxData of cotisation.taux) {
    await prisma.tauxCotisation.create({
      data: {
        regleId: regle.id,
        taux: tauxData.taux,
        dateDebut: new Date(tauxData.date_debut),
        dateFin: tauxData.date_fin ? new Date(tauxData.date_fin) : null,
      },
    });
  }

  // 4. Supprimer les anciennes règles comptables
  await prisma.regleComptable.deleteMany({
    where: { regleId: regle.id },
  });

  // 5. Créer la nouvelle règle comptable
  await prisma.regleComptable.create({
    data: {
      regleId: regle.id,
      compteDebit: cotisation.comptabilite.compte_debit,
      compteCredit: cotisation.comptabilite.compte_credit,
      description: `Écriture comptable pour ${cotisation.nom}`,
    },
  });

  console.log(`   ✓ ${cotisation.code}: ${cotisation.nom}`);
}

/**
 * Synchronise toutes les règles de cotisations
 */
async function syncRegles(
  cotisations: CotisationYAML[],
  categoriesMap: Map<string, string>,
  organismesMap: Map<string, string>
): Promise<void> {
  console.log('\n📋 Synchronisation des règles de cotisations...');

  let compteur = 0;
  for (const cotisation of cotisations) {
    const categorieId = categoriesMap.get(cotisation.categorie);
    const organismeId = organismesMap.get(cotisation.organisme);

    if (!categorieId || !organismeId) {
      console.error(`❌ Impossible de créer la règle ${cotisation.code}: catégorie ou organisme manquant`);
      continue;
    }

    await syncRegleCotisation(cotisation, categorieId, organismeId);
    compteur++;
  }

  console.log(`✅ ${compteur} règles de cotisations synchronisées`);
}

/**
 * Affiche un récapitulatif des données chargées
 */
async function afficherRecapitulatif(): Promise<void> {
  console.log('\n📊 Récapitulatif des données en base:');

  const stats = await Promise.all([
    prisma.categorieCotisation.count(),
    prisma.organismeCotisation.count(),
    prisma.regleCotisation.count(),
    prisma.tauxCotisation.count(),
    prisma.regleComptable.count(),
  ]);

  console.log(`   • Catégories: ${stats[0]}`);
  console.log(`   • Organismes: ${stats[1]}`);
  console.log(`   • Règles de cotisations: ${stats[2]}`);
  console.log(`   • Taux historiques: ${stats[3]}`);
  console.log(`   • Règles comptables: ${stats[4]}`);

  // Détail par type de cotisation
  const parType = await prisma.regleCotisation.groupBy({
    by: ['typeCotisation'],
    _count: true,
  });

  console.log('\n   Répartition par type:');
  parType.forEach((item: any) => {
    console.log(`   • ${item.typeCotisation}: ${item._count}`);
  });
}

// ====================================
// FONCTION PRINCIPALE
// ====================================

async function main() {
  console.log('🚀 Démarrage du seed des cotisations sociales\n');
  console.log('================================================\n');

  try {
    // 1. Déterminer le fichier à charger
    const cheminFichier = process.argv[2] ||
      path.join(__dirname, '../../fixtures/cotisations/cotisations-france-2024-2025.yaml');

    // 2. Charger le fichier YAML
    const donnees = chargerFichierYAML(cheminFichier);

    // 3. Synchroniser les catégories
    const categoriesMap = await syncCategories(donnees.cotisations);

    // 4. Synchroniser les organismes
    const organismesMap = await syncOrganismes(donnees.cotisations);

    // 5. Synchroniser les règles de cotisations
    await syncRegles(donnees.cotisations, categoriesMap, organismesMap);

    // 6. Afficher le récapitulatif
    await afficherRecapitulatif();

    console.log('\n================================================');
    console.log('✅ Seed terminé avec succès!\n');
  } catch (error) {
    console.error('\n❌ Erreur lors du seed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
main();
