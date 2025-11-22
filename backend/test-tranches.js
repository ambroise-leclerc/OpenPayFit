/**
 * Script de test simple pour vérifier le calcul par tranches
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('📊 Test du calcul par tranches\n');
console.log('================================================\n');

// 1. Vérifier les tranches chargées
console.log('1️⃣  Vérification des tranches en base:\n');
const tranches = db.prepare(`
  SELECT
    rc.code,
    rc.nom,
    tc.tranche,
    tc.taux,
    tc.plancherPASS,
    tc.plafondPASS,
    tc.ordre
  FROM tranches_cotisation tc
  JOIN regles_cotisation rc ON tc.regleId = rc.id
  ORDER BY rc.code, tc.ordre
`).all();

if (tranches.length === 0) {
  console.log('❌ Aucune tranche trouvée en base!');
  process.exit(1);
}

console.log(`✅ ${tranches.length} tranches trouvées:`);
tranches.forEach(t => {
  console.log(`   • ${t.code} (${t.tranche}): ${t.taux * 100}% sur [${t.plancherPASS} PASS - ${t.plafondPASS} PASS]`);
});

// 2. Simuler un calcul manuel
console.log('\n2️⃣  Simulation manuelle d\'un calcul par tranches:\n');

const PASS_MENSUEL = 3864;  // PASS mensuel 2025
const salaireBrut = 5000;   // Salaire de 5000€/mois

console.log(`Salaire brut : ${salaireBrut} €/mois`);
console.log(`PASS mensuel : ${PASS_MENSUEL} €/mois`);
console.log('');

// Exemple : RETRAITE_COMP_T1_SAL (Tranche A)
const t1Sal = tranches.find(t => t.code === 'RETRAITE_COMP_T1_SAL');
if (t1Sal) {
  const plancherEuros = t1Sal.plancherPASS * PASS_MENSUEL;
  const plafondEuros = t1Sal.plafondPASS * PASS_MENSUEL;
  const assietteTranche = Math.min(salaireBrut, plafondEuros) - plancherEuros;
  const montant = assietteTranche * t1Sal.taux;

  console.log(`Tranche A (${t1Sal.code}):`);
  console.log(`  • Plancher: ${plancherEuros} €, Plafond: ${plafondEuros} €`);
  console.log(`  • Assiette: ${assietteTranche.toFixed(2)} €`);
  console.log(`  • Taux: ${(t1Sal.taux * 100).toFixed(2)}%`);
  console.log(`  • Montant: ${montant.toFixed(2)} €`);
  console.log('');
}

// Exemple : RETRAITE_COMP_T2_SAL (Tranche B)
const t2Sal = tranches.find(t => t.code === 'RETRAITE_COMP_T2_SAL');
if (t2Sal) {
  const plancherEuros = t2Sal.plancherPASS * PASS_MENSUEL;
  const plafondEuros = t2Sal.plafondPASS * PASS_MENSUEL;
  const assietteTranche = Math.max(0, Math.min(salaireBrut, plafondEuros) - plancherEuros);
  const montant = assietteTranche * t2Sal.taux;

  console.log(`Tranche B (${t2Sal.code}):`);
  console.log(`  • Plancher: ${plancherEuros} €, Plafond: ${plafondEuros} €`);
  console.log(`  • Assiette: ${assietteTranche.toFixed(2)} €`);
  console.log(`  • Taux: ${(t2Sal.taux * 100).toFixed(2)}%`);
  console.log(`  • Montant: ${montant.toFixed(2)} €`);
  console.log('');
}

// 3. Total
console.log('3️⃣  Total AGIRC-ARRCO salarial:');
const totalT1 = (Math.min(salaireBrut, PASS_MENSUEL) - 0) * (t1Sal?.taux || 0);
const totalT2 = Math.max(0, Math.min(salaireBrut, 8 * PASS_MENSUEL) - PASS_MENSUEL) * (t2Sal?.taux || 0);
const total = totalT1 + totalT2;
console.log(`  • Tranche A: ${totalT1.toFixed(2)} €`);
console.log(`  • Tranche B: ${totalT2.toFixed(2)} €`);
console.log(`  • TOTAL: ${total.toFixed(2)} €`);

console.log('\n================================================');
console.log('✅ Test terminé avec succès!');

db.close();
