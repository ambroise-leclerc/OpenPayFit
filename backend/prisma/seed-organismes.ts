/**
 * Script de seed pour pré-peupler les organismes collecteurs obligatoires
 * Ces organismes sont globaux (estGlobal = true) et s'appliquent à toutes les entreprises
 *
 * Utilisation :
 * npx ts-node prisma/seed-organismes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Organismes collecteurs obligatoires en France (2025)
 * Sources :
 * - URSSAF : Collecteur unique pour la Sécurité sociale
 * - France Travail : Assurance chômage (anciennement Pôle Emploi)
 * - AGIRC-ARRCO : Retraite complémentaire obligatoire
 */
const organismesObligatoires = [
  {
    code: 'URSSAF',
    nom: 'URSSAF - Union de Recouvrement des Cotisations de Sécurité Sociale et d\'Allocations Familiales',
    typeOrganisme: 'URSSAF' as const,
    description: 'Collecteur unique des cotisations de sécurité sociale (maladie, vieillesse, allocations familiales) pour le régime général',
    estGlobal: true,
    siteWeb: 'https://www.urssaf.fr',
    telephone: '3957',
    adresse: 'Réseau national - voir site web pour votre caisse locale',
    ville: 'Paris',
  },
  {
    code: 'FRANCE_TRAVAIL',
    nom: 'France Travail',
    typeOrganisme: 'CHOMAGE' as const,
    description: 'Service public de l\'emploi - Collecteur des cotisations d\'assurance chômage (anciennement Pôle Emploi)',
    estGlobal: true,
    siteWeb: 'https://www.francetravail.fr',
    telephone: '3949',
    adresse: '1-5 avenue du Docteur Gley',
    codePostal: '75020',
    ville: 'Paris',
  },
  {
    code: 'AGIRC_ARRCO',
    nom: 'AGIRC-ARRCO',
    typeOrganisme: 'RETRAITE' as const,
    description: 'Régime de retraite complémentaire obligatoire des salariés du secteur privé (fusion AGIRC et ARRCO depuis 2019)',
    estGlobal: true,
    siteWeb: 'https://www.agirc-arrco.fr',
    telephone: '0970 660 660',
    adresse: '16-18 rue Jules César',
    codePostal: '75012',
    ville: 'Paris',
  },
];

/**
 * Organismes complémentaires (exemples pour information)
 * Ces organismes ne sont pas créés automatiquement car ils sont spécifiques aux entreprises
 * selon leur convention collective ou leur choix
 */
const organismesComplementairesExemples = [
  // Caisses de retraite complémentaire AGIRC-ARRCO
  { code: 'AG2R', nom: 'AG2R LA MONDIALE', typeOrganisme: 'RETRAITE' },
  { code: 'MALAKOFF', nom: 'MALAKOFF HUMANIS', typeOrganisme: 'RETRAITE' },
  { code: 'KLESIA', nom: 'KLESIA', typeOrganisme: 'RETRAITE' },
  { code: 'PRO_BTP', nom: 'PRO BTP', typeOrganisme: 'RETRAITE' },
  { code: 'IRCEM', nom: 'IRCEM', typeOrganisme: 'RETRAITE' },
  { code: 'APICIL', nom: 'APICIL', typeOrganisme: 'RETRAITE' },
  { code: 'AGRICA', nom: 'AGRICA', typeOrganisme: 'RETRAITE' },
  { code: 'AUDIENS', nom: 'AUDIENS', typeOrganisme: 'RETRAITE' },

  // Organisme spécifique au secteur agricole
  { code: 'MSA', nom: 'Mutualité Sociale Agricole', typeOrganisme: 'URSSAF' },

  // Exemples d'OPCO (formation professionnelle)
  { code: 'OPCO_EP', nom: 'OPCO des Entreprises de Proximité', typeOrganisme: 'FORMATION' },
  { code: 'AFDAS', nom: 'AFDAS', typeOrganisme: 'FORMATION' },
  { code: 'ATLAS', nom: 'ATLAS', typeOrganisme: 'FORMATION' },
];

async function main() {
  console.log('🌱 Début du seeding des organismes collecteurs obligatoires...\n');

  // Créer ou mettre à jour les organismes obligatoires
  for (const organisme of organismesObligatoires) {
    const result = await prisma.organismeCotisation.upsert({
      where: { code: organisme.code },
      update: {
        ...organisme,
      },
      create: {
        ...organisme,
      },
    });

    console.log(`✅ ${result.code} - ${result.nom}`);
  }

  console.log('\n✨ Seeding terminé avec succès !');
  console.log(`\n📋 ${organismesObligatoires.length} organismes obligatoires créés :`);
  console.log('   - URSSAF (Sécurité sociale)');
  console.log('   - France Travail (Assurance chômage)');
  console.log('   - AGIRC-ARRCO (Retraite complémentaire)\n');

  console.log('💡 Note : Les entreprises pourront ajouter leurs organismes spécifiques');
  console.log('   (caisses de retraite de branche, mutuelles, OPCO, etc.) via l\'interface de gestion.\n');

  console.log('📚 Exemples d\'organismes complémentaires disponibles :');
  console.log(`   ${organismesComplementairesExemples.length} organismes (MSA, AG2R, Malakoff, PRO BTP, OPCO, etc.)`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
