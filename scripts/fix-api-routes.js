// scripts/fix-api-routes.js
const fs = require('fs');
const path = require('path');

function fixApiRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('export const dynamic')) {
    return;
  }
  
  if (!filePath.includes('/api/')) {
    return;
  }
  
  if (!filePath.endsWith('route.ts') && !filePath.endsWith('route.tsx')) {
    return;
  }
  
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
      insertIndex = i + 1;
    }
  }
  
  if (insertIndex === 0) {
    insertIndex = 0;
  }
  
  lines.splice(insertIndex, 0, "export const dynamic = 'force-dynamic';");
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`✅ Fixé: ${path.basename(filePath)}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
        walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fixApiRoute(filePath);
    }
  }
}

const srcDir = path.join(__dirname, '../src');
console.log('🔍 Recherche des routes API...');
walkDir(srcDir);
console.log('✅ Toutes les routes API ont été corrigées !');