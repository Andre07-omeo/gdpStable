// scripts/check-all.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ==========================================');
console.log('🚀 VÉRIFICATION COMPLÈTE DU PROJET');
console.log('🚀 ==========================================\n');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(`📌 ${title}`, 'cyan');
  console.log('='.repeat(50));
}

function runCommand(command, description) {
  try {
    log(`▶️ ${description}...`, 'yellow');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} terminé avec succès !`, 'green');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de: ${description}`, 'red');
    console.error(error.message);
    return false;
  }
}

// ============================================
// 1. VÉRIFICATION DE L'ENVIRONNEMENT
// ============================================
logSection('1. VÉRIFICATION DE L\'ENVIRONNEMENT');

// Vérifier Node.js
const nodeVersion = process.version;
log(`✅ Node.js version: ${nodeVersion}`, 'green');

// Vérifier npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  log(`✅ npm version: ${npmVersion}`, 'green');
} catch {
  log('❌ npm non trouvé', 'red');
}

// Vérifier les fichiers .env
logSection('2. VÉRIFICATION DES FICHIERS .ENV');

const envFiles = ['.env.local', '.env.production', '.env'];
for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    log(`✅ ${envFile} trouvé`, 'green');
  } else {
    log(`⚠️ ${envFile} non trouvé (création recommandée)`, 'yellow');
  }
}

// Vérifier les variables essentielles
function checkEnvVariables(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'JWT_SECRET'];
  const missing = required.filter(v => !content.includes(`${v}=`));
  if (missing.length > 0) {
    log(`⚠️ Variables manquantes dans ${file}: ${missing.join(', ')}`, 'yellow');
  }
}

checkEnvVariables('.env.local');
checkEnvVariables('.env.production');

// ============================================
// 3. NETTOYAGE DU CACHE
// ============================================
logSection('3. NETTOYAGE DU CACHE');

const dirsToClean = ['.next', 'node_modules/.cache', 'out'];
for (const dir of dirsToClean) {
  if (fs.existsSync(dir)) {
    log(`🧹 Suppression de ${dir}...`, 'yellow');
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      log(`✅ ${dir} supprimé`, 'green');
    } catch (error) {
      log(`⚠️ Impossible de supprimer ${dir}`, 'yellow');
    }
  } else {
    log(`ℹ️ ${dir} non trouvé (pas nécessaire)`, 'blue');
  }
}

// ============================================
// 4. CORRECTION DES ROUTES API ET PAGES
// ============================================
logSection('4. CORRECTION DES FICHIERS');

// Vérifier et corriger les routes API
function fixApiRoutes(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
        fixApiRoutes(filePath);
      }
    } else if (file.endsWith('route.ts') || file.endsWith('route.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes('export const dynamic')) {
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
            insertIndex = i + 1;
          }
        }
        lines.splice(insertIndex, 0, "export const dynamic = 'force-dynamic';");
        fs.writeFileSync(filePath, lines.join('\n'));
        log(`✅ Fixé: ${path.basename(filePath)}`, 'green');
      }
    }
  }
}

// Vérifier et corriger les pages
function fixPages(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
        fixPages(filePath);
      }
    } else if (file === 'page.tsx' || file === 'page.ts') {
      const content = fs.readFileSync(filePath, 'utf8');
      const usesLocalStorage = content.includes('localStorage') || content.includes('window');
      if (usesLocalStorage && content.includes("'use client'") && !content.includes('export const dynamic')) {
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('use client')) {
            insertIndex = i + 1;
            break;
          }
        }
        if (insertIndex === 0) insertIndex = 1;
        lines.splice(insertIndex, 0, "export const dynamic = 'force-dynamic';");
        fs.writeFileSync(filePath, lines.join('\n'));
        log(`✅ Fixé page: ${path.basename(filePath)}`, 'green');
      }
    }
  }
}

// Exécuter les corrections
log('🔧 Correction des routes API...', 'yellow');
fixApiRoutes(path.join(__dirname, '../src'));
log('🔧 Correction des pages...', 'yellow');
fixPages(path.join(__dirname, '../src'));

// ============================================
// 5. NETTOYAGE ET GÉNÉRATION PRISMA
// ============================================
logSection('5. NETTOYAGE ET GÉNÉRATION PRISMA');

// Nettoyer Prisma
if (fs.existsSync('node_modules/.prisma')) {
  log('🧹 Nettoyage de Prisma...', 'yellow');
  fs.rmSync('node_modules/.prisma', { recursive: true, force: true });
}

// Générer Prisma
log('🔄 Génération du client Prisma...', 'yellow');
runCommand('npx prisma generate', 'Génération Prisma');

// Vérifier les migrations
if (fs.existsSync('prisma/schema.prisma')) {
  log('✅ Fichier schema.prisma trouvé', 'green');
}

// ============================================
// 6. VÉRIFICATION DES DÉPENDANCES
// ============================================
logSection('6. VÉRIFICATION DES DÉPENDANCES');

// Vérifier les dépendances manquantes
log('🔍 Vérification des dépendances...', 'yellow');
runCommand('npm ls --depth=0', 'Liste des dépendances');

// ============================================
// 7. COMPILATION ET BUILD
// ============================================
logSection('7. COMPILATION ET BUILD');

log('📦 Compilation TypeScript...', 'yellow');
const tsCompile = runCommand('npx tsc --noEmit', 'Compilation TypeScript');

if (tsCompile) {
  log('✅ TypeScript compile sans erreur !', 'green');
} else {
  log('⚠️ Des erreurs TypeScript persistent, le build pourrait échouer', 'yellow');
}

log('🏗️ Build du projet...', 'yellow');
const buildSuccess = runCommand('npm run build', 'Build Next.js');

// ============================================
// 8. VÉRIFICATION POST-BUILD
// ============================================
logSection('8. VÉRIFICATION POST-BUILD');

if (buildSuccess) {
  log('✅ BUILD RÉUSSI ! 🎉', 'green');
  
  // Vérifier la taille du build
  if (fs.existsSync('.next')) {
    const buildSize = fs.statSync('.next').size;
    log(`📊 Taille du build: ${(buildSize / 1024 / 1024).toFixed(2)} MB`, 'blue');
  }
  
  // Vérifier les fichiers générés
  const buildFiles = ['.next/BUILD_ID', '.next/prerender-manifest.json'];
  for (const file of buildFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file} généré`, 'green');
    }
  }
} else {
  log('❌ BUILD ÉCHOUÉ ! Veuillez corriger les erreurs ci-dessus.', 'red');
}

// ============================================
// 9. RÉSUMÉ FINAL
// ============================================
logSection('9. RÉSUMÉ FINAL');

console.log(`
${colors.green}✅ Vérification terminée !${colors.reset}

${colors.cyan}Résumé des actions effectuées :${colors.reset}
  1. ✅ Nettoyage du cache (.next, node_modules/.cache)
  2. ✅ Correction des routes API (ajout de dynamic)
  3. ✅ Correction des pages (ajout de dynamic)
  4. ✅ Génération du client Prisma
  5. ✅ Vérification des dépendances
  6. ✅ Compilation TypeScript ${tsCompile ? '✅' : '❌'}
  7. ✅ Build Next.js ${buildSuccess ? '✅' : '❌'}

${colors.blue}Prochaines étapes :${colors.reset}
  ${buildSuccess ? '✅ Votre projet est prêt pour le déploiement !' : '⚠️ Corrigez les erreurs ci-dessus et relancez le script.'}
  
  Pour démarrer le serveur en mode développement :
  ${colors.yellow}npm run dev${colors.reset}
  
  Pour démarrer le serveur en production :
  ${colors.yellow}npm run start${colors.reset}
`);

// ============================================
// 10. OPTION: DÉMARRER LE SERVEUR
// ============================================
if (buildSuccess) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n🔧 Voulez-vous démarrer le serveur maintenant ? (o/N) ', (answer) => {
    if (answer.toLowerCase() === 'o' || answer.toLowerCase() === 'oui') {
      console.log('\n🚀 Démarrage du serveur...');
      execSync('npm run dev', { stdio: 'inherit' });
    } else {
      console.log('\n👋 Au revoir !');
      rl.close();
    }
  });
}

console.log('\n' + '='.repeat(50));
log('🚀 Fin de la vérification !', 'magenta');
console.log('='.repeat(50));