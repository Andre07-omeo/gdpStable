// src/app/page.tsx

'use client';

import { useEffect, useState } from 'react';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { PanneauxList } from '@/components/panneaux/PanneauxList';
import { Panneau } from '@/types/panneau';

export default function HomePage() {
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPanneaux = async () => {
      try {
        const res = await fetch('/api/panneaux');
        if (res.ok) {
          const data = await res.json();
          setPanneaux(data);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPanneaux();
  }, []);

  return (
    <LayoutWrapper>  {/* ✅ UNIQUEMENT SUR LA PAGE D'ACCUEIL */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            📍 Découvrez nos panneaux publicitaires
          </h2>
          <p className="text-gray-600">
            {panneaux.length} panneaux disponibles
          </p>
        </div>

        <PanneauxList panneaux={panneaux} isLoading={isLoading} />
      </div>
    </LayoutWrapper>
  );
}