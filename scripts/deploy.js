// scripts/deploy.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function log(msg) { console.log('\n=== ' + msg + ' ===\n'); }
function ok(msg) { console.log('  OK ' + msg); }

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

async function main() {
  log('1. Verification des icones');
  const iconsDir = path.join(ROOT, 'public', 'icons');
  const required = [
    'icon-192x192.png', 'icon-512x512.png',
    'maskable-192x192.png', 'maskable-512x512.png',
    'apple-touch-icon-180x180.png',
  ];
  for (const icon of required) {
    if (!fs.existsSync(path.join(iconsDir, icon))) {
      console.error('  MANQUANT : ' + icon);
      process.exit(1);
    }
    ok(icon);
  }

  log('2. Verification du manifest');
  const manifest = path.join(ROOT, 'public', 'manifest.webmanifest');
  if (!fs.existsSync(manifest)) {
    console.error('  MANQUANT : manifest.webmanifest');
    process.exit(1);
  }
  const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (!m.icons || m.icons.length === 0) {
    console.error('  Le manifest ne declare pas d\'icones');
    process.exit(1);
  }
  ok('Manifest OK (' + m.icons.length + ' icones)');

  log('3. Verification du service worker');
  const sw = path.join(ROOT, 'public', 'sw.js');
  if (!fs.existsSync(sw)) {
    console.error('  MANQUANT : sw.js');
    process.exit(1);
  }
  ok('sw.js present');

  log('4. Generation du client Prisma');
  run('pnpm prisma generate');

  log('5. Build Next.js');
  run('pnpm build');

  log('6. Verification post-build');
  const standalone = path.join(ROOT, '.next', 'standalone');
  if (!fs.existsSync(standalone)) {
    console.error('  MANQUANT : .next/standalone (ajoutez output: "standalone" dans next.config.js)');
    process.exit(1);
  }
  ok('.next/standalone cree');

  log('Deploiement pret !');
  console.log('\nPour lancer en production :');
  console.log('  node .next/standalone/server.js');
  console.log('\nOu avec pm2 :');
  console.log('  pm2 start .next/standalone/server.js --name gestion-panneaux');
}

main().catch((err) => { console.error(err); process.exit(1); });
