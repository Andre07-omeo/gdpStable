'use client';

import { Panneau } from '@/types/panneau';

interface PanneauxListProps {
  panneaux: Panneau[];
  isLoading?: boolean;
}

export function PanneauxList({ panneaux, isLoading = false }: PanneauxListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 mt-2">Chargement des panneaux...</p>
      </div>
    );
  }

  if (panneaux.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">Aucun panneau trouvé</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {panneaux.map((p, index) => (
        <div 
          key={p.id_panneau || index} // ✅ Ajout d'une clé unique
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition border border-gray-100"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-800">{p.nom}</h3>
              <p className="text-sm text-gray-500">{p.adresse}</p>
              <p className="text-sm text-gray-500">{p.ville}, {p.province}</p>
            </div>
            <span className={'text-xs px-2 py-1 rounded-full ' + (p.etat === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
              {p.etat}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span>📐 {p.nb_faces} face(s)</span>
          </div>
        </div>
      ))}
    </div>
  );
}
