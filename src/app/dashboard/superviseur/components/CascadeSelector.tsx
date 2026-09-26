'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/CascadeSelector.tsximport { useState, useEffect } from 'react';
import { useLocalisationData } from '../hooks/useLocalisationData';

export interface CascadeValue {
  pays_id: number | null;
  province_id: number | null;
  ville_id: number | null;
  district_id: number | null;
}

interface CascadeSelectorProps {
  value: CascadeValue;
  onChange: (value: CascadeValue) => void;
  showDistrict?: boolean;
  disabled?: boolean;
}

export default function CascadeSelector({
  value,
  onChange,
  showDistrict = true,
  disabled = false,
}: CascadeSelectorProps) {
  const { loadPays, loadProvinces, loadVilles, loadDistricts } = useLocalisationData();

  const [paysList, setPaysList] = useState<any[]>([]);
  const [provincesList, setProvincesList] = useState<any[]>([]);
  const [villesList, setVillesList] = useState<any[]>([]);
  const [districtsList, setDistrictsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1️⃣ Charger les pays au montage
  useEffect(() => {
    loadPays().then(setPaysList);
  }, []);

  // 2️⃣ Quand pays change → charger les provinces
  useEffect(() => {
    if (!value.pays_id) {
      setProvincesList([]);
      return;
    }
    setLoading(true);
    loadProvinces(value.pays_id).then((data) => {
      setProvincesList(data);
      setLoading(false);
    });
  }, [value.pays_id]);

  // 3️⃣ Quand province change → charger villes ET districts
  useEffect(() => {
    if (!value.province_id) {
      setVillesList([]);
      setDistrictsList([]);
      return;
    }
    setLoading(true);
    Promise.all([
      loadVilles(value.province_id),
      loadDistricts(value.province_id),
    ]).then(([villes, districts]) => {
      setVillesList(villes);
      setDistrictsList(districts);
      setLoading(false);
    });
  }, [value.province_id]);

  return (
    <div className="space-y-3">
      {/* 1. PAYS */}
      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">
          🌍 Pays *
        </label>
        <select
          value={value.pays_id || ''}
          onChange={(e) => {
            const pays_id = e.target.value ? Number(e.target.value) : null;
            onChange({ pays_id, province_id: null, ville_id: null, district_id: null });
          }}
          disabled={disabled}
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">-- Choisir un pays --</option>
          {paysList.map((p) => (
            <option key={p.id_pays} value={p.id_pays}>
              {p.nom} ({p.code})
            </option>
          ))}
        </select>
      </div>

      {/* 2. PROVINCE */}
      {value.pays_id && (
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">
            🗺️ Province *
          </label>
          <select
            value={value.province_id || ''}
            onChange={(e) => {
              const province_id = e.target.value ? Number(e.target.value) : null;
              onChange({ ...value, province_id, ville_id: null, district_id: null });
            }}
            disabled={disabled || loading || provincesList.length === 0}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">
              {provincesList.length === 0
                ? 'Aucune province disponible'
                : '-- Choisir une province --'}
            </option>
            {provincesList.map((p) => (
              <option key={p.id_province} value={p.id_province}>
                {p.nom} ({p.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. VILLE */}
      {value.province_id && (
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">
            🏙️ Ville *
          </label>
          <select
            value={value.ville_id || ''}
            onChange={(e) => {
              const ville_id = e.target.value ? Number(e.target.value) : null;
              onChange({ ...value, ville_id });
            }}
            disabled={disabled || loading || villesList.length === 0}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">
              {villesList.length === 0
                ? 'Aucune ville disponible'
                : '-- Choisir une ville --'}
            </option>
            {villesList.map((v) => (
              <option key={v.id_ville} value={v.id_ville}>
                {v.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 4. DISTRICT (optionnel) */}
      {showDistrict && value.province_id && (
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">
            📍 District (optionnel)
          </label>
          <select
            value={value.district_id || ''}
            onChange={(e) => {
              const district_id = e.target.value ? Number(e.target.value) : null;
              onChange({ ...value, district_id });
            }}
            disabled={disabled || loading}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">-- Non assigné --</option>
            {districtsList.map((d) => (
              <option key={d.id_district} value={d.id_district}>
                {d.nom} ({d.code})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}