// src/app/page.tsx
// ⚠️ Le middleware gère déjà la redirection de "/" vers /login ou /dashboard.
//    Ce composant est un FALLBACK au cas où le middleware ne s'exécute pas.
//    On utilise une redirection CLIENT (useEffect) pour éviter tout conflit
//    avec le middleware (pas de boucle possible).
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirection côté client (le middleware fait déjà le travail en amont)
    router.replace('/login');
  }, [router]);

  // Écran de chargement pendant la redirection
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-500">Redirection…</p>
      </div>
    </div>
  );
}