// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SOURCE = path.join(ICONS_DIR, 'source-512.png');

const SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_SIZES = [57, 60, 72, 76, 114, 120, 144, 152, 180];
const MASKABLE_SIZES = [192, 512];

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source introuvable : ' + SOURCE);
    console.error('Renommez icon-512x512.png en source-512.png dans public/icons/');
    process.exit(1);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('\n=== Generation des icones standard ===');
  for (const size of SIZES) {
    const output = path.join(ICONS_DIR, 'icon-' + size + 'x' + size + '.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(output);
    const stats = fs.statSync(output);
    console.log('  OK icon-' + size + 'x' + size + '.png (' + (stats.size / 1024).toFixed(1) + ' Ko)');
  }

  console.log('\n=== Generation des icones Apple (iOS) ===');
  for (const size of APPLE_SIZES) {
    const output = path.join(ICONS_DIR, 'apple-touch-icon-' + size + 'x' + size + '.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(output);
    const stats = fs.statSync(output);
    console.log('  OK apple-touch-icon-' + size + 'x' + size + '.png (' + (stats.size / 1024).toFixed(1) + ' Ko)');
  }

  console.log('\n=== Generation des icones maskable (Android) ===');
  for (const size of MASKABLE_SIZES) {
    const output = path.join(ICONS_DIR, 'maskable-' + size + 'x' + size + '.png');
    const innerSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - innerSize) / 2);
    await sharp(SOURCE)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 30, g: 64, b: 175, alpha: 1 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 30, g: 64, b: 175, alpha: 1 },
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(output);
    const stats = fs.statSync(output);
    console.log('  OK maskable-' + size + 'x' + size + '.png (' + (stats.size / 1024).toFixed(1) + ' Ko)');
  }

  console.log('\n=== Generation du favicon ===');
  for (const size of [16, 32]) {
    const output = path.join(ICONS_DIR, 'favicon-' + size + 'x' + size + '.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(output);
    console.log('  OK favicon-' + size + 'x' + size + '.png');
  }

  console.log('\n=== Generation terminee ===');
  console.log('Dossier : ' + ICONS_DIR);
}

generateIcons().catch((err) => {
  console.error('Erreur :', err);
  process.exit(1);
});
