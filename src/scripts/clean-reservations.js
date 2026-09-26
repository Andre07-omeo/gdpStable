// src/scripts/clean-reservations.js

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const CLEANUP_TOKEN = process.env.CLEANUP_API_TOKEN || 'mon-token-securise-123456';

async function runCleanup() {
  console.log('🚀 Démarrage du nettoyage automatique...');

  try {
    // 1. Simulation d'abord
    const simRes = await fetch(`${BASE_URL}/api/reservations/clean`, {
      method: 'GET',
      headers: { 'x-cleanup-token': CLEANUP_TOKEN },
    });
    const sim = await simRes.json();

    console.log('📊 Simulation:', {
      pretes: sim.resume?.pretes_a_nettoyer,
      en_attente: sim.resume?.en_attente_validation,
    });

    // 2. Nettoyage effectif
    const cleanRes = await fetch(`${BASE_URL}/api/reservations/clean`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cleanup-token': CLEANUP_TOKEN,
      },
      body: JSON.stringify({ batch: 100 }),
    });

    const result = await cleanRes.json();

    if (!result.success) {
      console.error('❌ Échec:', result.error);
      process.exit(1);
    }

    console.log('✅ Nettoyage terminé:', {
      terminees: result.data.terminees,
      expirees: result.data.expirees,
      total: result.data.total,
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

runCleanup();