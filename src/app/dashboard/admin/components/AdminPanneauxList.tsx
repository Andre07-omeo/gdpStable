'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/admin/components/AdminPanneauxList.tsx
import React, { useState } from 'react';
import { MapPin, Edit2, Trash2, Search, Plus } from 'lucide-react';

// ✅ Type Panneau basé sur ta structure MySQL réelle
export interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: string;
  commune: string;
  province: string;
  ville: string;
  nbFaces?: number;
  faces?: any[];
}

interface AdminPanneauxListProps {
  panneaux: Panneau[];
  onRefresh: () => void;
}

export function AdminPanneauxList({ panneaux, onRefresh }: AdminPanneauxListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPanneaux = panneaux.filter(p =>
    p.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.adresse?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id_panneau: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce panneau ?')) return;
    try {
      const res = await fetch(`/api/admin/panneaux/${id_panneau}`, { 
        method: 'DELETE' 
      });
      
      if (res.ok) {
        alert('Panneau supprimé avec succès');
        onRefresh();
      } else {
        const error = await res.json();
        alert('Erreur: ' + (error.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatusClass = (etat: string) => {
    if (etat === 'Actif') return 'bg-green-100 text-green-700';
    if (etat === 'EnMaintenance') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Panneaux publicitaires</h2>
          <p className="text-sm text-gray-500">Gestion des supports d'affichage</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2">
            <Plus size={16} />
            Nouveau
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Adresse</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Faces</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPanneaux.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucun panneau trouvé
                  </td>
                </tr>
              ) : (
                filteredPanneaux.map((p) => (
                  <tr key={p.id_panneau} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{p.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.nom || 'Sans nom'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.adresse || 'N/A'}</td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">{p.nbFaces || p.faces?.length || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={'px-2 py-1 rounded-full text-xs font-bold ' + getStatusClass(p.etat || 'Actif')}>
                        {p.etat || 'Actif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id_panneau)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}