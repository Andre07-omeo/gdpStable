// scripts/test-enums.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const ATTENDU = {
  facture: {
    type_document: ['proformat', 'facture', 'avoir'],
    mode_paiement: ['comptant', 'tranche'],
    statut: ['brouillon', 'envoye', 'paye', 'annule'],
  },
  facture_tranche: {
    mode_paiement: ['especes', 'cheque', 'virement', 'carte', 'mobile_money'],
    statut: ['en_attente', 'paye', 'retard'],
  },
};

async function main() {
  console.log('\n🔍 Vérification des ENUM...\n');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'default',
    });
  } catch (e) {
    console.error('❌ Connexion MySQL impossible :', e.message);
    process.exit(1);
  }

  let erreurs = 0;
  for (const [table, colonnes] of Object.entries(ATTENDU)) {
    for (const [colonne, valeursAttendues] of Object.entries(colonnes)) {
      const [rows] = await conn.query(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [process.env.MYSQL_DATABASE || 'default', table, colonne]
      );
      if (rows.length === 0) {
        console.log(`  ❌ ${table}.${colonne} → INTROUVABLE`);
        erreurs++;
        continue;
      }
      const match = rows[0].COLUMN_TYPE.match(/enum\((.+)\)/);
      if (!match) {
        console.log(`  ❌ ${table}.${colonne} → PAS UN ENUM`);
        erreurs++;
        continue;
      }
      const valeursBD = match[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
      const identiques = valeursBD.length === valeursAttendues.length &&
                        valeursBD.every((v, i) => v === valeursAttendues[i]);
      if (identiques) {
        console.log(`  ✅ ${table}.${colonne} OK`);
      } else {
        console.log(`  ❌ ${table}.${colonne} → DIVERGENCE`);
        console.log(`       BD   : ${valeursBD.join(', ')}`);
        console.log(`       Code : ${valeursAttendues.join(', ')}`);
        erreurs++;
      }
    }
  }
  await conn.end();
  console.log('');
  if (erreurs === 0) {
    console.log('🎉 Tous les ENUM sont alignés !\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${erreurs} divergence(s)\n`);
    process.exit(1);
  }
}
main().catch(e => { console.error('❌ Erreur :', e.message); process.exit(1); });
