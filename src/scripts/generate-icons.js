// scripts/generate-icons.js
// Usage : node scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SOURCE = path.join(ICONS_DIR, 'icon-512x512.png');

// Tailles standard (Android + navigateur)
const SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

// Tailles iOS (apple-touch-icon)
const APPLE_SIZES = [57, 60, 72, 76, 114, 120, 144, 152, 180];

// Tailles maskable (Android, avec padding)
const MASKABLE_SIZES = [192, 512];

async function generateIcons() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source introuvable : ${SOURCE}`);
    console.error('   Placez une icône 512x512 nommée icon-512x512.png dans public/icons/');
    process.exit(1);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // 1. Icônes standard
  console.log('\n📱 Génération des icônes standard...');
  for (const size of SIZES) {
    const output = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE).resize(size, size).png().toFile(output);
    console.log(`   ✅ icon-${size}x${size}.png`);
  }

  // 2. Icônes Apple (iOS)
  console.log('\n🍎 Génération des icônes Apple (iOS)...');
  for (const size of APPLE_SIZES) {
    const output = path.join(ICONS_DIR, `apple-touch-icon-${size}x${size}.png`);
    // iOS n'aime pas la transparence → fond blanc
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(output);
    console.log(`   ✅ apple-touch-icon-${size}x${size}.png`);
  }

  // 3. Icônes maskable (Android adaptive)
  console.log('\n🤖 Génération des icônes maskable (Android)...');
  for (const size of MASKABLE_SIZES) {
    const output = path.join(ICONS_DIR, `maskable-${size}x${size}.png`);
    // Maskable : padding de 10% (safe zone) et fond plein
    const innerSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - innerSize) / 2);
    await sharp(SOURCE)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 30, g: 64, b: 175, alpha: 1 }, // #1e40af (theme_color)
      })
      .png()
      .toFile(output);
    console.log(`   ✅ maskable-${size}x${size}.png`);
  }

  // 4. Favicon
  console.log('\n⭐ Génération du favicon...');
  await sharp(SOURCE).resize(32, 32).png().toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
  await sharp(SOURCE).resize(16, 16).png().toFile(path.join(ICONS_DIR, 'favicon-16x16.png'));
  console.log('   ✅ favicon-32x32.png');
  console.log('   ✅ favicon-16x16.png');

  console.log('\n🎉 Terminé ! Toutes les icônes ont été générées.');
  console.log(`   Dossier : ${ICONS_DIR}`);
}

generateIcons().catch((err) => {
  console.error('❌ Erreur :', err);
  process.exit(1);
});