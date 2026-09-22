// scripts/fix-all.js
const { execSync } = require('child_process');

console.log('🔧 Correction des routes API...');
execSync('node scripts/fix-api-routes.js', { stdio: 'inherit' });

console.log('🔧 Correction des pages...');
execSync('node scripts/fix-pages.js', { stdio: 'inherit' });

console.log('🧹 Nettoyage du cache...');
execSync('Remove-Item -Recurse -Force .next', { stdio: 'inherit' });

console.log('🚀 Build du projet...');
execSync('npm run build', { stdio: 'inherit' });

console.log('✅ Tout est corrigé !');