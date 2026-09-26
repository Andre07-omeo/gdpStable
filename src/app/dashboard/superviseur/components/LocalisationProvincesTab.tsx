'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationProvincesTab.tsximport { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Layers, Filter } from 'lucide-react';
import { useLocalisationData, Province, Pays } from '../hooks/useLocalisationData';
import LocalisationTable, { Column } from './LocalisationTable';
import MultipleRowsForm from './MultipleRowsForm';
import CascadeSelector, { CascadeValue } from './CascadeSelector';

export default function LocalisationProvincesTab() {
  const { loadProvinces, loadPays, createProvince, updateProvince, deleteEntity, loading } = useLocalisationData();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [paysList, setPaysList] = useState<Pays[]>([]);
  const [filterPays, setFilterPays] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<Province | null>(null);
  const [formData, setFormData] = useState({ nom: '', code: '', pays_id: '' as number | '' });
  const [saving, setSaving] = useState(false);
  const [cascade, setCascade] = useState<CascadeValue>({
    pays_id: null,
    province_id: null,
    ville_id: null,
    district_id: null,
  });

  const fetchData = async () => {
    const [provs, pays] = await Promise.all([
      loadProvinces(filterPays || undefined),
      loadPays()
    ]);
    setProvinces(provs);
    setPaysList(pays);
  };

  useEffect(() => { fetchData(); }, [filterPays]);

  const filtered = provinces.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    (p.pays_nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.nom.trim() || !formData.code.trim() || !formData.pays_id) {
      alert('Tous les champs sont obligatoires');
      return;
    }
    setSaving(true);
    const payload = { nom: formData.nom, code: formData.code, pays_id: Number(formData.pays_id) };
    const res = editing
      ? await updateProvince(editing.id_province, payload)
      : await createProvince(payload);
    setSaving(false);

    if (res.success) {
      setFormData({ nom: '', code: '', pays_id: '' });
      setShowSingleForm(false);
      setEditing(null);
      fetchData();
    } else {
      alert('❌ ' + res.error);
    }
  };

  const handleDelete = async (p: Province) => {
    if (!confirm(`Supprimer "${p.nom}" ?\n⚠️ Impossible si districts/villes dépendent.`)) return;
    const res = await deleteEntity('provinces', p.id_province);
    if (res.success) fetchData();
    else alert('❌ ' + res.error);
  };

  const handleEdit = (p: Province) => {
    setEditing(p);
    setFormData({ nom: p.nom, code: p.code, pays_id: p.pays_id });
    setShowSingleForm(true);
  };

  const columns: Column<Province>[] = [
    { key: 'nom', label: 'Province', render: (p) => <span className="font-bold text-gray-800">{p.nom}</span> },
    {
      key: 'code', label: 'Code',
      render: (p) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold">
          {p.code}
        </span>
      )
    },
    {
      key: 'pays_nom', label: 'Pays',
      render: (p) => <span className="text-sm text-gray-600">🌍 {p.pays_nom || 'N/A'}</span>
    },
  ];

  return (
    <div className="space-y-4">
      {/* BARRE D'ACTIONS */}
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
            value={filterPays}
            onChange={(e) => setFilterPays(e.target.value ? Number(e.target.value) : '')}
            className="pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">Tous les pays</option>
            {paysList.map((p) => (
              <option key={p.id_pays} value={p.id_pays}>{p.nom}</option>
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
          disabled={paysList.length === 0}
          className="px-3 sm:px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 disabled:opacity-50 flex items-center gap-2"
        >
          <Layers size={16} />
          <span className="hidden sm:inline">Ajouter plusieurs</span>
          <span className="sm:hidden">Bulk</span>
        </button>

        <button
          onClick={() => {
            setEditing(null);
            setFormData({ nom: '', code: '', pays_id: filterPays || '' });
            setShowSingleForm(true);
          }}
          disabled={paysList.length === 0}
          className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter une province</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {paysList.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
          ⚠️ Créez d'abord un pays avant d'ajouter des provinces
        </div>
      )}

      <p className="text-xs text-gray-500 font-bold">{filtered.length} province(s)</p>

      <div className="hidden md:block">
        <LocalisationTable
          data={filtered}
          columns={columns}
          loading={loading}
          keyExtractor={(p) => p.id_province}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Aucune province"
        />
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((p) => (
          <div key={p.id_province} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{p.nom}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">{p.code}</span>
                  <span className="text-xs text-gray-500">🌍 {p.pays_nom || 'N/A'}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(p)} className="p-2 rounded-lg bg-blue-50 text-blue-600">✏️</button>
                <button onClick={() => handleDelete(p)} className="p-2 rounded-lg bg-red-50 text-red-600">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FORMULAIRE SIMPLE */}
      {showSingleForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-gray-800">
              {editing ? 'Modifier la province' : 'Ajouter une province'}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Pays *</label>
              <select
                value={formData.pays_id}
                onChange={(e) => setFormData({ ...formData, pays_id: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Sélectionner --</option>
                {paysList.map((p) => (
                  <option key={p.id_pays} value={p.id_pays}>{p.nom} ({p.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Kinshasa"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="KIN"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowSingleForm(false); setEditing(null); }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {saving ? '...' : editing ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAIRE BULK AVEC CASCADE */}
      {showBulkForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-5 space-y-4 my-auto max-h-[95vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-gray-800">Ajouter plusieurs provinces</h3>
              <p className="text-sm text-gray-500">Sélectionnez d'abord le pays parent</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <CascadeSelector value={cascade} onChange={setCascade} showDistrict={false} />
            </div>

            {cascade.pays_id ? (
              <MultipleRowsForm
                title=""
                fields={[
                  { key: 'nom', label: 'Nom', placeholder: 'Kinshasa', required: true },
                  { key: 'code', label: 'Code', placeholder: 'KIN', required: true },
                ]}
                onSubmit={async (rows) => {
                  const res = [];
                  for (const r of rows) {
                    const result = await createProvince({ nom: r.nom, code: r.code, pays_id: cascade.pays_id! });
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
                ⚠️ Sélectionnez d'abord un pays
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}