// scripts/change-password.ts
import * as dotenv from 'dotenv';
import path from 'path';

// 🔥 Charger .env.local EN PREMIER (avant tout require de db)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  // ⚠️ require APRÈS dotenv.config pour que db.ts lise les bonnes variables
  const bcrypt = require('bcryptjs');
  const { query } = require('../src/lib/db');

  console.log('🔌 Config MySQL détectée :');
  console.log('   MYSQL_HOST     =', process.env.MYSQL_HOST);
  console.log('   MYSQL_PORT     =', process.env.MYSQL_PORT);
  console.log('   MYSQL_USER     =', process.env.MYSQL_USER);
  console.log('   MYSQL_DATABASE =', process.env.MYSQL_DATABASE);
  console.log('');

  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/change-password.ts <email> <mdp>');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const users = await query(
    'SELECT id_user, email, nom, prenom, actif FROM user WHERE email = ?',
    [normalizedEmail]
  );

  const user = (users as any[])[0];
  if (!user) {
    console.error(`❌ Utilisateur introuvable: ${normalizedEmail}`);
    console.error('👉 Vérifiez que la base locale contient bien cet utilisateur.');
    process.exit(1);
  }

  console.log(`👤 Utilisateur : ${user.prenom} ${user.nom} (actif: ${user.actif})`);

  const hash = await bcrypt.hash(newPassword, 10);
  console.log(`🔐 Hash généré : ${hash.slice(0, 20)}...`);

  await query('UPDATE user SET mot_de_passe_hash = ? WHERE id_user = ?', [
    hash,
    user.id_user,
  ]);

  console.log('');
  console.log('✅ Mot de passe modifié avec succès !');
  console.log(`📧 Email : ${user.email}`);
  console.log(`🔑 Nouveau mdp : ${newPassword}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});