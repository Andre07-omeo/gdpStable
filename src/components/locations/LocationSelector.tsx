// components/locations/LocationSelector.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Location {
  id: number;
  code: string;
  nom: string;
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
}

export interface LocationSelection {
  paysId?: number;
  provinceIds?: number[];
  villeIds?: number[];
  communeIds?: number[];
}

interface LocationSelectorProps {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection) => void;
  className?: string;
}

export function LocationSelector({ 
  value = {}, 
  onChange, 
  className = '' 
}: LocationSelectorProps) {
  // États pour les listes
  const [paysList, setPaysList] = useState<Location[]>([]);
  const [provincesList, setProvincesList] = useState<Location[]>([]);
  const [villesList, setVillesList] = useState<Location[]>([]);
  const [communesList, setCommunesList] = useState<Location[]>([]);
  
  // États pour les sélections
  const [selectedPays, setSelectedPays] = useState<number | undefined>(value.paysId);
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>(value.provinceIds || []);
  const [selectedVilles, setSelectedVilles] = useState<number[]>(value.villeIds || []);
  const [selectedCommunes, setSelectedCommunes] = useState<number[]>(value.communeIds || []);

  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isUpdatingFromParent = useRef(false);

  // 🔥 CORRECTION : Synchronisation avec les props parentes
  useEffect(() => {
    if (value && !isUpdatingFromParent.current) {
      isUpdatingFromParent.current = true;
      setSelectedPays(value.paysId);
      setSelectedProvinces(value.provinceIds || []);
      setSelectedVilles(value.villeIds || []);
      setSelectedCommunes(value.communeIds || []);
      
      // Recharger les listes en fonction des nouvelles sélections
      if (value.paysId) {
        fetchLocations('provinces', value.paysId).then(data => {
          setProvincesList(data);
        });
        
        if (value.provinceIds && value.provinceIds.length > 0) {
          const promises = value.provinceIds.map(id => fetchLocations('villes', id));
          Promise.all(promises).then(results => {
            const allVilles = results.flat();
            const uniqueVilles = allVilles.filter((v, index, self) => 
              index === self.findIndex(t => t.id === v.id)
            );
            setVillesList(uniqueVilles);
          });
        }
      }
      
      setTimeout(() => {
        isUpdatingFromParent.current = false;
      }, 100);
    }
  }, [value]);

  // Charger les pays au montage
  useEffect(() => {
    fetchLocations('pays').then(setPaysList);
  }, []);

  // 🔥 CORRECTION : Gérer le chargement des provinces quand le pays change
  useEffect(() => {
    if (selectedPays && !isUpdatingFromParent.current) {
      fetchLocations('provinces', selectedPays).then(data => {
        setProvincesList(data);
        // Réinitialiser les sélections inférieures
        setSelectedProvinces([]);
        setSelectedVilles([]);
        setSelectedCommunes([]);
        setVillesList([]);
        setCommunesList([]);
      });
    }
    // Si le pays est désélectionné, reset tout
    if (!selectedPays && !isUpdatingFromParent.current) {
      setProvincesList([]);
      setSelectedProvinces([]);
      setVillesList([]);
      setSelectedVilles([]);
      setCommunesList([]);
      setSelectedCommunes([]);
    }
  }, [selectedPays]);

  // 🔥 CORRECTION : Gérer le chargement des villes quand les provinces changent
  useEffect(() => {
    if (selectedProvinces.length > 0 && !isUpdatingFromParent.current) {
      const promises = selectedProvinces.map(id => fetchLocations('villes', id));
      Promise.all(promises).then(results => {
        const allVilles = results.flat();
        const uniqueVilles = allVilles.filter((v, index, self) => 
          index === self.findIndex(t => t.id === v.id)
        );
        setVillesList(uniqueVilles);
        // Réinitialiser les sélections inférieures
        setSelectedVilles([]);
        setSelectedCommunes([]);
        setCommunesList([]);
      });
    }
    if (selectedProvinces.length === 0 && !isUpdatingFromParent.current) {
      setVillesList([]);
      setSelectedVilles([]);
      setCommunesList([]);
      setSelectedCommunes([]);
    }
  }, [selectedProvinces]);

  // 🔥 CORRECTION : Gérer le chargement des communes quand les villes changent
  useEffect(() => {
    if (selectedVilles.length > 0 && !isUpdatingFromParent.current) {
      const promises = selectedVilles.map(id => fetchLocations('communes', id));
      Promise.all(promises).then(results => {
        const allCommunes = results.flat();
        const uniqueCommunes = allCommunes.filter((c, index, self) => 
          index === self.findIndex(t => t.id === c.id)
        );
        setCommunesList(uniqueCommunes);
        // Réinitialiser les sélections inférieures
        setSelectedCommunes([]);
      });
    }
    if (selectedVilles.length === 0 && !isUpdatingFromParent.current) {
      setCommunesList([]);
      setSelectedCommunes([]);
    }
  }, [selectedVilles]);

  // Notifier le parent des changements
  useEffect(() => {
    if (onChange && !isInitialLoad && !isUpdatingFromParent.current) {
      const selection: LocationSelection = {};
      if (selectedPays) selection.paysId = selectedPays;
      if (selectedProvinces.length > 0) selection.provinceIds = selectedProvinces;
      if (selectedVilles.length > 0) selection.villeIds = selectedVilles;
      if (selectedCommunes.length > 0) selection.communeIds = selectedCommunes;
      onChange(selection);
    }
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [selectedPays, selectedProvinces, selectedVilles, selectedCommunes, onChange, isInitialLoad]);

  // components/locations/LocationSelector.tsx

// ✅ La fonction fetchLocations est déjà correcte
const fetchLocations = async (type: string, parentId?: number): Promise<Location[]> => {
    try {
        setLoading(true);
        const url = parentId 
            ? `/api/locations?type=${type}&parentId=${parentId}`
            : `/api/locations?type=${type}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            return result.data || [];
        }
        return [];
    } catch (error) {
        console.error(`Erreur chargement ${type}:`, error);
        return [];
    } finally {
        setLoading(false);
    }
};
  // Gestionnaires de sélection
  const handlePaysChange = (paysId: number | undefined) => {
    setSelectedPays(paysId);
  };

  const toggleProvince = (id: number) => {
    setSelectedProvinces(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleVille = (id: number) => {
    setSelectedVilles(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleCommune = (id: number) => {
    setSelectedCommunes(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  // Tout sélectionner / Aucune
  const selectAllProvinces = () => setSelectedProvinces(provincesList.map(p => p.id));
  const deselectAllProvinces = () => setSelectedProvinces([]);
  const selectAllVilles = () => setSelectedVilles(villesList.map(v => v.id));
  const deselectAllVilles = () => setSelectedVilles([]);
  const selectAllCommunes = () => setSelectedCommunes(communesList.map(c => c.id));
  const deselectAllCommunes = () => setSelectedCommunes([]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pays */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pays
          <span className="text-xs text-gray-500 ml-2">(sélectionnez un pays)</span>
        </label>
        <select
          value={selectedPays || ''}
          onChange={(e) => handlePaysChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Sélectionnez un pays</option>
          {paysList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Provinces */}
      {selectedPays && provincesList.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Provinces
              <span className="text-xs text-gray-500 ml-2">
                ({selectedProvinces.length} sélectionnée(s) / {provincesList.length} total)
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllProvinces}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Tout
              </button>
              <button
                type="button"
                onClick={deselectAllProvinces}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Aucune
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {provincesList.map((p) => (
              <label key={p.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProvinces.includes(p.id)}
                  onChange={() => toggleProvince(p.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{p.nom}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Villes */}
      {selectedProvinces.length > 0 && villesList.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Villes
              <span className="text-xs text-gray-500 ml-2">
                ({selectedVilles.length} sélectionnée(s) / {villesList.length} total)
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllVilles}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Tout
              </button>
              <button
                type="button"
                onClick={deselectAllVilles}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Aucune
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {villesList.map((v) => (
              <label key={v.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedVilles.includes(v.id)}
                  onChange={() => toggleVille(v.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{v.nom}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Communes */}
      {selectedVilles.length > 0 && communesList.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Communes
              <span className="text-xs text-gray-500 ml-2">
                ({selectedCommunes.length} sélectionnée(s) / {communesList.length} total)
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllCommunes}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Tout
              </button>
              <button
                type="button"
                onClick={deselectAllCommunes}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Aucune
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {communesList.map((c) => (
              <label key={c.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCommunes.includes(c.id)}
                  onChange={() => toggleCommune(c.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{c.nom}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Résumé de la sélection */}
      {selectedPays && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-800">Résumé de la sélection :</p>
          <ul className="text-xs text-blue-700 mt-1 space-y-1">
            <li>📍 Pays : {paysList.find(p => p.id === selectedPays)?.nom}</li>
            {selectedProvinces.length > 0 && (
              <li>📍 {selectedProvinces.length} province(s) sélectionnée(s)</li>
            )}
            {selectedVilles.length > 0 && (
              <li>📍 {selectedVilles.length} ville(s) sélectionnée(s)</li>
            )}
            {selectedCommunes.length > 0 && (
              <li>📍 {selectedCommunes.length} commune(s) sélectionnée(s)</li>
            )}
            {selectedProvinces.length === 0 && selectedVilles.length === 0 && selectedCommunes.length === 0 && (
              <li>📍 Toutes les zones du pays sélectionné</li>
            )}
          </ul>
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-500 animate-pulse">Chargement...</div>
      )}
    </div>
  );
}