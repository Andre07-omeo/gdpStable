// src/scripts/clean-reservations.js

const { ReservationCleanupService } = require('../services/ReservationCleanupService');

async function run() {
  console.log('🧹 Début du nettoyage...');
  console.log(`📅 ${new Date().toISOString()}`);
  
  try {
    const service = new ReservationCleanupService();
    const resultats = await service.cleanReservationsByBatch(50);
    
    console.log('✅ Nettoyage terminé !');
    console.log(`📊 Terminées : ${resultats.terminees}`);
    console.log(`📊 Expirées : ${resultats.expirees}`);
    console.log(`📊 Erreurs : ${resultats.erreurs}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

run();