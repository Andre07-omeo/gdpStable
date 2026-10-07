// scripts/verifier-pwa.js
// Usage : node scripts/verifier-pwa.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const PUBLIC_DIR = path.join(ROOT, 'public');

// Couleurs console
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (msg, color = C.reset) => console.log(color + msg + C.reset);
const ok = (msg) => log('  OK  ' + msg, C.green);
const fail = (msg) => log('  MANQUANT  ' + msg, C.red);
const warn = (msg) => log('  ATTENTION  ' + msg, C.yellow);

let erreurs = 0;
let avertissements = 0;

// ============================================================
// 1. VERIFICATION DES ICONES
// ============================================================
function verifierIcones() {
  log('\n=== 1. ICONES ===', C.bright + C.cyan);

  const iconesRequises = [
    // Standard
    'icon-16x16.png',
    'icon-32x32.png',
    'icon-48x48.png',
    'icon-72x72.png',
    'icon-96x96.png',
    'icon-128x128.png',
    'icon-144x144.png',
    'icon-152x152.png',
    'icon-192x192.png',
    'icon-384x384.png',
    'icon-512x512.png',
    // Apple
    'apple-touch-icon-57x57.png',
    'apple-touch-icon-60x60.png',
    'apple-touch-icon-72x72.png',
    'apple-touch-icon-76x76.png',
    'apple-touch-icon-114x114.png',
    'apple-touch-icon-120x120.png',
    'apple-touch-icon-144x144.png',
    'apple-touch-icon-152x152.png',
    'apple-touch-icon-180x180.png',
    // Maskable
    'maskable-192x192.png',
    'maskable-512x512.png',
    // Favicon
    'favicon-16x16.png',
    'favicon-32x32.png',
  ];

  if (!fs.existsSync(ICONS_DIR)) {
    fail('Dossier public/icons/ introuvable');
    erreurs++;
    return;
  }

  let manquantes = 0;
  for (const icone of iconesRequises) {
    const chemin = path.join(ICONS_DIR, icone);
    if (fs.existsSync(chemin)) {
      const stats = fs.statSync(chemin);
      const taille = (stats.size / 1024).toFixed(1);
      if (stats.size === 0) {
        fail(icone + ' (fichier vide)');
        erreurs++;
        manquantes++;
      } else {
        ok(icone + ' (' + taille + ' Ko)');
      }
    } else {
      fail(icone);
      manquantes++;
      erreurs++;
    }
  }

  if (manquantes === 0) {
    log('\n  Toutes les icones sont presentes (' + iconesRequises.length + ')', C.green);
  } else {
    log('\n  ' + manquantes + ' icone(s) manquante(s) sur ' + iconesRequises.length, C.red);
    log('  Solution : node scripts/generate-icons.js', C.yellow);
  }
}

// ============================================================
// 2. VERIFICATION DU MANIFEST
// ============================================================
function verifierManifest() {
  log('\n=== 2. MANIFEST ===', C.bright + C.cyan);

  const cheminsPossibles = [
    path.join(PUBLIC_DIR, 'manifest.webmanifest'),
    path.join(PUBLIC_DIR, 'manifest.json'),
    path.join(ROOT, 'app', 'manifest.ts'),
    path.join(ROOT, 'app', 'manifest.js'),
    path.join(ROOT, 'src', 'app', 'manifest.ts'),
    path.join(ROOT, 'src', 'app', 'manifest.js'),
  ];

  let trouve = null;
  for (const chemin of cheminsPossibles) {
    if (fs.existsSync(chemin)) {
      trouve = chemin;
      ok(path.relative(ROOT, chemin));
      break;
    }
  }

  if (!trouve) {
    fail('Aucun manifest trouve');
    log('  Attendu : public/manifest.webmanifest', C.yellow);
    erreurs++;
    return;
  }

  // Si c'est un JSON, verifier le contenu
  if (trouve.endsWith('.json') || trouve.endsWith('.webmanifest')) {
    try {
      const contenu = JSON.parse(fs.readFileSync(trouve, 'utf8'));

      const champsRequis = ['name', 'short_name', 'start_url', 'display', 'icons'];
      for (const champ of champsRequis) {
        if (contenu[champ]) {
          ok('Champ "' + champ + '" present');
        } else {
          fail('Champ "' + champ + '" manquant');
          erreurs++;
        }
      }

      // Verifier les icones dans le manifest
      if (Array.isArray(contenu.icons)) {
        ok(contenu.icons.length + ' icone(s) declaree(s) dans le manifest');

        // Verifier que chaque icone existe
        let iconesManquantes = 0;
        for (const icone of contenu.icons) {
          const cheminIcone = path.join(PUBLIC_DIR, icone.src.replace(/^\//, ''));
          if (!fs.existsSync(cheminIcone)) {
            warn('Icone declaree mais absente : ' + icone.src);
            iconesManquantes++;
            avertissements++;
          }
        }
        if (iconesManquantes === 0) {
          ok('Toutes les icones declarees existent');
        } else {
          warn(iconesManquantes + ' icone(s) declaree(s) mais absente(s)');
        }

        // Verifier maskable
        const maskable = contenu.icons.filter((i) => i.purpose === 'maskable');
        if (maskable.length >= 2) {
          ok('Icones maskable presentes (' + maskable.length + ')');
        } else {
          warn('Moins de 2 icones maskable (recommande : 192 et 512)');
          avertissements++;
        }
      } else {
        fail('Champ "icons" invalide');
        erreurs++;
      }

      // Verifier display
      if (contenu.display === 'standalone') {
        ok('display = standalone');
      } else {
        warn('display = ' + contenu.display + ' (recommande : standalone)');
        avertissements++;
      }
    } catch (err) {
      fail('Erreur de lecture du manifest : ' + err.message);
      erreurs++;
    }
  }
}

// ============================================================
// 3. VERIFICATION DU SERVICE WORKER
// ============================================================
function verifierServiceWorker() {
  log('\n=== 3. SERVICE WORKER ===', C.bright + C.cyan);

  const cheminsPossibles = [
    path.join(PUBLIC_DIR, 'sw.js'),
    path.join(PUBLIC_DIR, 'service-worker.js'),
  ];

  let trouve = null;
  for (const chemin of cheminsPossibles) {
    if (fs.existsSync(chemin)) {
      trouve = chemin;
      ok(path.relative(ROOT, chemin));
      break;
    }
  }

  if (!trouve) {
    fail('Aucun service worker trouve');
    log('  Attendu : public/sw.js', C.yellow);
    erreurs++;
    return;
  }

  const contenu = fs.readFileSync(trouve, 'utf8');

  // Verifier CACHE_VERSION
  const matchVersion = contenu.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (matchVersion) {
    ok('CACHE_VERSION = ' + matchVersion[1]);
  } else {
    warn('CACHE_VERSION non trouve');
    avertissements++;
  }

  // Verifier PRECACHE_URLS
  if (contenu.includes('PRECACHE_URLS')) {
    ok('PRECACHE_URLS defini');
  } else {
    warn('PRECACHE_URLS non trouve');
    avertissements++;
  }

  // Verifier manifest dans PRECACHE
  if (contenu.includes('manifest.webmanifest') || contenu.includes('manifest.json')) {
    ok('Manifest present dans le precache');
  } else {
    warn('Manifest absent du precache');
    avertissements++;
  }

  // Verifier les icones dans le precache
  const iconesDansPrecache = (contenu.match(/\/icons\/[^'"]+\.png/g) || []).length;
  if (iconesDansPrecache > 0) {
    ok(iconesDansPrecache + ' icone(s) dans le precache');
  } else {
    warn('Aucune icone dans le precache');
    avertissements++;
  }

  // Verifier skipWaiting
  if (contenu.includes('skipWaiting')) {
    ok('skipWaiting() present');
  } else {
    warn('skipWaiting() absent');
    avertissements++;
  }

  // Verifier clients.claim
  if (contenu.includes('clients.claim')) {
    ok('clients.claim() present');
  } else {
    warn('clients.claim() absent');
    avertissements++;
  }
}

// ============================================================
// 4. VERIFICATION DU LAYOUT
// ============================================================
function verifierLayout() {
  log('\n=== 4. LAYOUT (balises iOS) ===', C.bright + C.cyan);

  const cheminsPossibles = [
    path.join(ROOT, 'app', 'layout.tsx'),
    path.join(ROOT, 'app', 'layout.ts'),
    path.join(ROOT, 'src', 'app', 'layout.tsx'),
    path.join(ROOT, 'src', 'app', 'layout.ts'),
  ];

  let trouve = null;
  for (const chemin of cheminsPossibles) {
    if (fs.existsSync(chemin)) {
      trouve = chemin;
      ok(path.relative(ROOT, chemin));
      break;
    }
  }

  if (!trouve) {
    fail('Aucun layout trouve');
    erreurs++;
    return;
  }

  const contenu = fs.readFileSync(trouve, 'utf8');

  const verifications = [
    { cle: 'apple-mobile-web-app-capable', label: 'apple-mobile-web-app-capable' },
    { cle: 'apple-mobile-web-app-title', label: 'apple-mobile-web-app-title' },
    { cle: 'apple-touch-icon', label: 'apple-touch-icon (lien)' },
    { cle: 'manifest.webmanifest', label: 'manifest.webmanifest (reference)' },
    { cle: 'theme-color', label: 'theme-color' },
  ];

  for (const v of verifications) {
    if (contenu.includes(v.cle)) {
      ok(v.label + ' present');
    } else {
      warn(v.label + ' absent');
      avertissements++;
    }
  }
}

// ============================================================
// 5. VERIFICATION NEXT.CONFIG
// ============================================================
function verifierNextConfig() {
  log('\n=== 5. NEXT.CONFIG ===', C.bright + C.cyan);

  const cheminsPossibles = [
    path.join(ROOT, 'next.config.js'),
    path.join(ROOT, 'next.config.mjs'),
    path.join(ROOT, 'next.config.ts'),
  ];

  let trouve = null;
  for (const chemin of cheminsPossibles) {
    if (fs.existsSync(chemin)) {
      trouve = chemin;
      ok(path.relative(ROOT, chemin));
      break;
    }
  }

  if (!trouve) {
    warn('Aucun next.config trouve');
    avertissements++;
    return;
  }

  const contenu = fs.readFileSync(trouve, 'utf8');

  if (contenu.includes('manifest.webmanifest')) {
    ok('En-tete Content-Type pour manifest');
  } else {
    warn('En-tete Content-Type pour manifest absent');
    avertissements++;
  }

  if (contenu.includes('Service-Worker-Allowed')) {
    ok('En-tete Service-Worker-Allowed present');
  } else {
    warn('En-tete Service-Worker-Allowed absent');
    avertissements++;
  }
}

// ============================================================
// 6. RESUME
// ============================================================
function afficherResume() {
  log('\n========================================', C.bright);
  log('          RESUME DE LA VERIFICATION', C.bright);
  log('========================================', C.bright);

  if (erreurs === 0 && avertissements === 0) {
    log('\n  TOUT EST BON ! Le PWA est correctement configure.', C.green + C.bright);
    log('  Vous pouvez tester l\'installation sur Android et iOS.', C.green);
  } else {
    if (erreurs > 0) {
      log('\n  ' + erreurs + ' erreur(s) bloquante(s)', C.red + C.bright);
      log('  L\'installation PWA ne fonctionnera pas tant que ces erreurs sont presentes.', C.red);
    }
    if (avertissements > 0) {
      log('  ' + avertissements + ' avertissement(s)', C.yellow);
      log('  L\'installation peut fonctionner mais l\'experience sera degradee.', C.yellow);
    }
  }

  log('\n  Commandes utiles :', C.cyan);
  log('    node scripts/generate-icons.js    (generer les icones)', C.reset);
  log('    node scripts/verifier-pwa.js      (relancer la verification)', C.reset);
  log('');
}

// ============================================================
// MAIN
// ============================================================
function main() {
  log('\n========================================', C.bright);
  log('   VERIFICATION PWA - Gestion Panneaux', C.bright);
  log('========================================', C.bright);
  log('Dossier : ' + ROOT);

  verifierIcones();
  verifierManifest();
  verifierServiceWorker();
  verifierLayout();
  verifierNextConfig();
  afficherResume();

  process.exit(erreurs > 0 ? 1 : 0);
}

main();
