// scripts/fix-use-client-position.js
// Déplace 'use client'; en toute première ligne du fichier

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcPath = path.join(projectRoot, 'src');

const USE_CLIENT = "'use client';";
const DYNAMIC_LINE = "export const dynamic = 'force-dynamic';";
const DRY_RUN = process.argv.includes('--dry-run');

const stats = { FIXED: 0, ALREADY: 0, NOT_FOUND: 0 };

/**
 * Trouve tous les fichiers .tsx/.ts dans src/
 */
function findAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
      findAllFiles(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Répare un fichier : place 'use client'; en 1ère ligne
 */
function fixFile(filePath) {
  const relative = path.relative(projectRoot, filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  // Supprime le BOM
  content = content.replace(/^\uFEFF/, '');

  // Vérifie si 'use client' est présent (n'importe où)
  const hasUseClient = /^['"]use client['"];?\s*$/m.test(content);

  if (!hasUseClient) {
    return 'NOT_FOUND';
  }

  // Vérifie si 'use client' est déjà en 1ère ligne
  const lines = content.split(/\r?\n/);
  const firstNonEmpty = lines.findIndex(l => l.trim().length > 0);
  const isFirstLine = /^\s*['"]use client['"];?\s*$/.test(lines[firstNonEmpty] || '');

  if (isFirstLine) {
    return 'ALREADY';
  }

  // === RÉPARATION ===
  // 1. Retire toutes les occurrences de 'use client'; (avec les lignes vides autour)
  content = content.replace(/^\s*['"]use client['"];?\s*\r?\n/gm, '');
  content = content.replace(/\r?\n\s*['"]use client['"];?\s*$/gm, '');
  content = content.replace(/^\s*['"]use client['"];?\s*$/gm, '');

  // 2. Nettoie les lignes vides en début
  content = content.replace(/^(\s*\r?\n)+/, '');

  // 3. Prépare le nouveau début
  let newHeader = `${USE_CLIENT}\n\n`;

  // 4. Si 'force-dynamic' existe déjà, on le garde juste après
  if (!content.includes(DYNAMIC_LINE) && /^['"]use client['"]/m.test(content)) {
    // force-dynamic est peut-être déjà là, on vérifie
  }

  // 5. Ajoute 'use client' au tout début
  const newContent = newHeader + content;

  if (DRY_RUN) {
    console.log(`   [~] [DRY-RUN] ${relative}`);
    return 'FIXED';
  }

  // Backup
  fs.writeFileSync(`${filePath}.bak2`, fs.readFileSync(filePath));

  // Écriture UTF-8 sans BOM
  fs.writeFileSync(filePath, newContent, 'utf8');

  console.log(`   [+] ${relative}`);
  return 'FIXED';
}

// === Exécution ===
console.log('\n+------------------------------------------------------+');
console.log('|   Correction du placement de "use client";           |');
console.log('+------------------------------------------------------+\n');

if (DRY_RUN) {
  console.log('[MODE DRY-RUN] Aucune modification ne sera faite\n');
}

const files = findAllFiles(srcPath);
console.log(`Analyse de ${files.length} fichiers...\n`);

for (const file of files) {
  const result = fixFile(file);
  stats[result]++;
}

console.log('\n+------------------------------------------------------+');
console.log('|                    RAPPORT FINAL                     |');
console.log('+------------------------------------------------------+\n');
console.log(`  [+] Corriges       : ${stats.FIXED}`);
console.log(`  [=] Deja OK        : ${stats.ALREADY}`);
console.log(`  [-] Sans use client: ${stats.NOT_FOUND}`);

if (!DRY_RUN && stats.FIXED > 0) {
  console.log('\nProchaines etapes :');
  console.log('   Remove-Item -Recurse -Force .next');
  console.log('   npm run build\n');
}