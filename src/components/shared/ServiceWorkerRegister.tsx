'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ============================================
// ✅ HELPERS localStorage (safe en navigation privée Safari)
// ============================================
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Navigation privée : silencieux
  }
}

// ============================================
// ✅ CAPTURE GLOBALE de beforeinstallprompt
// (avant même que React ne monte le composant)
// ============================================
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    console.log('[PWA] ✅ beforeinstallprompt capturé globalement');
    // Notifier le composant s'il est monté
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });
}

export default function ServiceWorkerRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // ====== Enregistrement du Service Worker ======
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isSecure =
      window.isSecureContext ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.hostname.endsWith('.local');

    if (!isSecure) {
      console.info('[SW] Contexte non sécurisé → ignoré');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] ✅ Enregistré, scope:', registration.scope);

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          checkVersionAndShow(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              checkVersionAndShow(newWorker);
            }
          });
        });

        setInterval(() => registration.update(), 60 * 60 * 1000);
      } catch (err) {
        console.warn('[SW] Enregistrement échoué:', err);
      }
    };

    registerSW();

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
        handleNewVersion(event.data.version);
      }
    });
  }, []);

  // ====== Détection nouvelle version ======
  const checkVersionAndShow = (worker: ServiceWorker) => {
    worker.postMessage({ type: 'GET_VERSION' });
  };

  const handleNewVersion = (version: string) => {
    if (typeof window === 'undefined') return;

    const seenKey = `pwa_version_seen_${version}`;
    const dismissedKey = `pwa_version_dismissed_${version}`;

    if (safeGetItem(dismissedKey)) {
      console.log('[PWA] Version ignorée par l\'utilisateur:', version);
      return;
    }

    if (safeGetItem(seenKey)) {
      console.log('[PWA] Version déjà vue:', version);
      return;
    }

    safeSetItem(seenKey, '1');
    setCurrentVersion(version);
    console.log('[PWA] Nouvelle version détectée:', version);
    setShowUpdateBanner(true);
  };

  const handleDismissUpdate = () => {
    if (currentVersion) {
      safeSetItem(`pwa_version_dismissed_${currentVersion}`, '1');
      console.log('[PWA] Version ignorée:', currentVersion);
    }
    setShowUpdateBanner(false);
  };

  // ====== Bannière d'installation ======
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      console.log('[PWA] Déjà en mode standalone');
      return;
    }

    const dismissedAt = safeGetItem('pwa_install_dismissed_at');
    if (dismissedAt && Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      console.log('[PWA] Installation refusée récemment');
      return;
    }

    // ✅ Si déjà capturé globalement
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      setShowInstallBanner(true);
    }

    const onAvailable = () => {
      if (globalDeferredPrompt) {
        setDeferredPrompt(globalDeferredPrompt);
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('pwa-install-available', onAvailable);

    // Pour iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari && !isStandalone) {
      setTimeout(() => setShowInstallBanner(true), 3000);
    }

    return () => {
      window.removeEventListener('pwa-install-available', onAvailable);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt || globalDeferredPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        console.log('[PWA] Choix utilisateur:', choice.outcome);
        if (choice.outcome === 'accepted') {
          setShowInstallBanner(false);
        }
      } catch (err) {
        console.warn('[PWA] Erreur prompt:', err);
      }
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    } else {
      alert(
        "Pour installer l'application sur iPhone/iPad :\n\n1. Appuyez sur le bouton Partager\n2. Sélectionnez « Sur l'écran d'accueil »\n3. Appuyez sur « Ajouter »"
      );
    }
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    safeSetItem('pwa_install_dismissed_at', Date.now().toString());
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return (
    <>
      {showInstallBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: '#fff', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <img src="/icons/icon-192x192.png" alt="Logo"
              style={{ width: 40, height: 40, borderRadius: 8, background: '#fff', padding: 4 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Installer l'application</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Accès rapide depuis votre écran d'accueil</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleInstall} style={{
              background: '#fff', color: '#1e40af', border: 'none',
              padding: '8px 16px', borderRadius: 6, fontWeight: 600,
              cursor: 'pointer', fontSize: 13,
            }}>Installer</button>
            <button onClick={dismissInstall} aria-label="Fermer" style={{
              background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none',
              padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 16,
            }}>✕</button>
          </div>
        </div>
      )}

      {showUpdateBanner && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 99999,
          background: '#1e40af', color: '#fff', padding: '16px 20px',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(30,64,175,0.4)',
          maxWidth: 360, animation: 'slideUp 0.3s ease-out',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>🎉 Nouvelle version disponible</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>
            Une mise à jour est prête. Rechargez pour en profiter.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={handleDismissUpdate} style={{
              background: 'transparent', color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
            }}>Plus tard</button>
            <button onClick={applyUpdate} style={{
              background: '#fff', color: '#1e40af', border: 'none',
              padding: '6px 14px', borderRadius: 6, fontWeight: 600,
              cursor: 'pointer', fontSize: 12,
            }}>Mettre à jour</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}