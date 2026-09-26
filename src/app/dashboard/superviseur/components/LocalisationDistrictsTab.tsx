'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationDistrictsTab.tsximport { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Layers, Filter } from 'lucide-react';
import { useLocalisationData, District, Province } from '../hooks/useLocalisationData';
import LocalisationTable, { Column } from './LocalisationTable';
import MultipleRowsForm from './MultipleRowsForm';
import CascadeSelector, { CascadeValue } from './CascadeSelector';

export default function LocalisationDistrictsTab() {
  const { loadDistricts, loadProvinces, createDistrict, updateDistrict, deleteEntity, loading } = useLocalisationData();
  const [districts, setDistricts] = useState<District[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [filterProvince, setFilterProvince] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<District | null>(null);
  const [formData, setFormData] = useState({ nom: '', code: '', province_id: '' as number | '' });
  const [saving, setSaving] = useState(false);
  const [cascade, setCascade] = useState<CascadeValue>({
    pays_id: null,
    province_id: null,
    ville_id: null,
    district_id: null,
  });

  const fetchData = async () => {
    const [d, p] = await Promise.all([
      loadDistricts(filterProvince || undefined),
      loadProvinces()
    ]);
    setDistricts(d);
    setProvinces(p);
  };

  useEffect(() => { fetchData(); }, [filterProvince]);

  const filtered = districts.filter((d) =>
    d.nom.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    (d.province_nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.nom.trim() || !formData.code.trim() || !formData.province_id) {
      alert('Tous les champs sont obligatoires');
      return;
    }
    setSaving(true);
    const payload = { nom: formData.nom, code: formData.code, province_id: Number(formData.province_id) };
    const res = editing
      ? await updateDistrict(editing.id_district, payload)
      : await createDistrict(payload);
    setSaving(false);

    if (res.success) {
      setFormData({ nom: '', code: '', province_id: '' });
      setShowSingleForm(false);
      setEditing(null);
      fetchData();
    } else alert('❌ ' + res.error);
  };

  const handleDelete = async (d: District) => {
    if (!confirm(`Supprimer "${d.nom}" ?`)) return;
    const res = await deleteEntity('districts', d.id_district);
    if (res.success) fetchData();
    else alert('❌ ' + res.error);
  };

  const handleEdit = (d: District) => {
    setEditing(d);
    setFormData({ nom: d.nom, code: d.code, province_id: d.province_id });
    setShowSingleForm(true);
  };

  const columns: Column<District>[] = [
    {
      key: 'nom', label: 'District',
      render: (d) => <span className="font-bold text-gray-800">{d.nom}</span>
    },
    {
      key: 'code', label: 'Code',
      render: (d) => (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">{d.code}</span>
      )
    },
    {
      key: 'province_nom', label: 'Province',
      render: (d) => <span className="text-sm text-gray-600">📍 {d.province_nom || 'N/A'}</span>
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filterProvince}
            onChange={(e) => setFilterProvince(e.target.value ? Number(e.target.value) : '')}
            className="pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">Toutes les provinces</option>
            {provinces.map((p) => (
              <option key={p.id_province} value={p.id_province}>{p.nom}</option>
            ))}
          </select>
        </div>

        <button onClick={fetchData} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200">
          <RefreshCw size={16} />
        </button>

        <button
          onClick={() => {
            setCascade({ pays_id: null, province_id: null, ville_id: null, district_id: null });
            setShowBulkForm(true);
          }}
          className="px-3 sm:px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 flex items-center gap-2"
        >
          <Layers size={16} />
          <span className="hidden sm:inline">Ajouter plusieurs</span>
          <span className="sm:hidden">Bulk</span>
        </button>

        <button
          onClick={() => {
            setEditing(null);
            setFormData({ nom: '', code: '', province_id: filterProvince || '' });
            setShowSingleForm(true);
          }}
          disabled={provinces.length === 0}
          className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter un district</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {provinces.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
          ⚠️ Créez d'abord une province
        </div>
      )}

      <p className="text-xs text-gray-500 font-bold">{filtered.length} district(s)</p>

      <div className="hidden md:block">
        <LocalisationTable
          data={filtered}
          columns={columns}
          loading={loading}
          keyExtractor={(d) => d.id_district}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Aucun district"
        />
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((d) => (
          <div key={d.id_district} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{d.nom}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">{d.code}</span>
                  <span className="text-xs text-gray-500">📍 {d.province_nom}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(d)} className="p-2 rounded-lg bg-blue-50 text-blue-600">✏️</button>
                <button onClick={() => handleDelete(d)} className="p-2 rounded-lg bg-red-50 text-red-600">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSingleForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-800">
              {editing ? 'Modifier le district' : 'Ajouter un district'}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Province *</label>
              <select
                value={formData.province_id}
                onChange={(e) => setFormData({ ...formData, province_id: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choisir --</option>
                {provinces.map((p) => (
                  <option key={p.id_province} value={p.id_province}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Funa"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="FUN"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setShowSingleForm(false); setEditing(null); }} className="flex-1 py-2.5 bg-gray-200 rounded-xl font-bold">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold disabled:opacity-50">
                {saving ? '...' : editing ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-5 space-y-4 my-auto max-h-[95vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-gray-800">Ajouter plusieurs districts</h3>
              <p className="text-sm text-gray-500">Sélectionnez d'abord la province parent</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <CascadeSelector value={cascade} onChange={setCascade} showDistrict={false} />
            </div>

            {cascade.province_id ? (
              <MultipleRowsForm
                title=""
                fields={[
                  { key: 'nom', label: 'Nom', placeholder: 'Funa', required: true },
                  { key: 'code', label: 'Code', placeholder: 'FUN', required: true },
                ]}
                onSubmit={async (rows) => {
                  const res = [];
                  for (const r of rows) {
                    const result = await createDistrict({ nom: r.nom, code: r.code, province_id: cascade.province_id! });
                    res.push({ success: result.success, nom: r.nom, error: result.error });
                  }
                  fetchData();
                  return res;
                }}
                onCancel={() => {
                  setShowBulkForm(false);
                  setCascade({ pays_id: null, province_id: null, ville_id: null, district_id: null });
                }}
              />
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold text-center">
                ⚠️ Sélectionnez d'abord une province
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}