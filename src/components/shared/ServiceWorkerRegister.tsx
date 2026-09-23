// src/components/shared/ServiceWorkerRegister.tsx
'use client';

import { useEffect, useState } from 'react';

export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      console.log('⚠️ Service Worker non supporté');
      return;
    }

    // 🚫 En développement : ne pas activer le SW (sinon conflits de cache)
    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    let refreshing = false;

    // ⚡ Si un nouveau SW prend le contrôle → rechargement automatique
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 Nouveau Service Worker actif → rechargement');
      window.location.reload();
    });

    // 📢 Réception du message SW_UPDATED
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log(`✅ SW mis à jour vers ${event.data.version}`);
        setUpdateReady(true);
      }
    });

    // 📝 Enregistrement du SW
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register(
          '/service-worker.js',
          {
            scope: '/',
            updateViaCache: 'none', // ⚡ Ne JAMAIS utiliser le cache pour le SW
          }
        );

        console.log('✅ Service Worker enregistré :', reg.scope);

        // 🔍 Vérifier les mises à jour immédiatement
        reg.update();

        // 🔁 Vérifier les mises à jour toutes les 60 secondes
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60000);

        // 🔔 Détecter une nouvelle version en attente
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('🆕 Nouvelle version détectée → activation');
              // ⚡ Forcer l'activation immédiate
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch (err) {
        console.error('❌ Erreur Service Worker:', err);
      }
    };

    // Attendre le chargement complet
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }

    return () => {
      window.removeEventListener('load', registerSW);
    };
  }, []);

  // Bandeau visible : "Nouvelle version disponible"
  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-blue-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 max-w-sm">
      <span className="text-sm font-medium">
        🚀 Nouvelle version installée
      </span>
      <button
        onClick={() => window.location.reload()}
        className="bg-white text-blue-600 px-3 py-1 rounded font-bold text-sm hover:bg-blue-50 transition"
      >
        Recharger
      </button>
    </div>
  );
}