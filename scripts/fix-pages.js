// scripts/fix-pages.js
const fs = require('fs');
const path = require('path');

function fixPage(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!filePath.includes('/page.tsx') && !filePath.includes('/page.ts')) {
    return;
  }
  
  const usesLocalStorage = content.includes('localStorage') || content.includes('window');
  if (!usesLocalStorage) {
    return;
  }
  
  if (!content.includes("'use client'") && !content.includes('"use client"')) {
    return;
  }
  
  if (content.includes('export const dynamic')) {
    return;
  }
  
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('use client')) {
      insertIndex = i + 1;
      break;
    }
  }
  
  if (insertIndex === 0) {
    insertIndex = 1;
  }
  
  lines.splice(insertIndex, 0, "export const dynamic = 'force-dynamic';");
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`✅ Fixé page: ${path.basename(filePath)}`);
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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixPage(filePath);
    }
  }
}

const srcDir = path.join(__dirname, '../src');
console.log('🔍 Recherche des pages...');
walkDir(srcDir);
console.log('✅ Toutes les pages ont été corrigées !');