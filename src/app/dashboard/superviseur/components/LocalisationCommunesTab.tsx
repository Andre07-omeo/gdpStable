'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationCommunesTab.tsximport { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Layers, Filter } from 'lucide-react';
import { useLocalisationData, Commune, Ville, District } from '../hooks/useLocalisationData';
import LocalisationTable, { Column } from './LocalisationTable';
import MultipleRowsForm from './MultipleRowsForm';
import CascadeSelector, { CascadeValue } from './CascadeSelector';

export default function LocalisationCommunesTab() {
  const { loadCommunes, loadVilles, loadDistricts, createCommune, updateCommune, deleteEntity, loading } = useLocalisationData();
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [villes, setVilles] = useState<Ville[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filterVille, setFilterVille] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<Commune | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    ville_id: '' as number | '',
    district_id: '' as number | '',
  });
  const [saving, setSaving] = useState(false);
  const [cascade, setCascade] = useState<CascadeValue>({
    pays_id: null,
    province_id: null,
    ville_id: null,
    district_id: null,
  });

  const fetchData = async () => {
    const [c, v, d] = await Promise.all([
      loadCommunes({ ville_id: filterVille || undefined }),
      loadVilles(),
      loadDistricts()
    ]);
    setCommunes(c);
    setVilles(v);
    setDistricts(d);
  };

  useEffect(() => { fetchData(); }, [filterVille]);

  const filtered = communes.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.ville_nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.district_nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.nom.trim() || !formData.code.trim() || !formData.ville_id) {
      alert('Nom, code et ville obligatoires');
      return;
    }
    setSaving(true);
    const payload = {
      nom: formData.nom,
      code: formData.code,
      ville_id: Number(formData.ville_id),
      district_id: formData.district_id ? Number(formData.district_id) : null,
    };
    const res = editing
      ? await updateCommune(editing.id_commune, payload)
      : await createCommune(payload);
    setSaving(false);

    if (res.success) {
      setFormData({ nom: '', code: '', ville_id: '', district_id: '' });
      setShowSingleForm(false);
      setEditing(null);
      fetchData();
    } else alert('❌ ' + res.error);
  };

  const handleDelete = async (c: Commune) => {
    if (!confirm(`Supprimer "${c.nom}" ?`)) return;
    const res = await deleteEntity('communes', c.id_commune);
    if (res.success) fetchData();
    else alert('❌ ' + res.error);
  };

  const handleEdit = (c: Commune) => {
    setEditing(c);
    setFormData({
      nom: c.nom,
      code: c.code,
      ville_id: c.ville_id,
      district_id: c.district_id || '',
    });
    setShowSingleForm(true);
  };

  const columns: Column<Commune>[] = [
    { key: 'nom', label: 'Commune/Tronçon', render: (c) => <span className="font-bold text-gray-800">{c.nom}</span> },
    {
      key: 'code', label: 'Code',
      render: (c) => <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold">{c.code}</span>
    },
    { key: 'ville_nom', label: 'Ville', render: (c) => <span className="text-sm text-gray-600">🏙️ {c.ville_nom || '—'}</span> },
    {
      key: 'district_nom', label: 'District',
      render: (c) => c.district_nom
        ? <span className="text-sm text-gray-600">📍 {c.district_nom}</span>
        : <span className="text-xs text-gray-400 italic">Non assigné</span>
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
            value={filterVille}
            onChange={(e) => setFilterVille(e.target.value ? Number(e.target.value) : '')}
            className="pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl appearance-none bg-white"
          >
            <option value="">Toutes les villes</option>
            {villes.map((v) => <option key={v.id_ville} value={v.id_ville}>{v.nom}</option>)}
          </select>
        </div>

        <button onClick={fetchData} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200"><RefreshCw size={16} /></button>

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
            setFormData({ nom: '', code: '', ville_id: filterVille || '', district_id: '' });
            setShowSingleForm(true);
          }}
          disabled={villes.length === 0}
          className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter un tronçon</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {villes.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-bold">
          ⚠️ Créez d'abord une ville
        </div>
      )}

      <p className="text-xs text-gray-500 font-bold">{filtered.length} commune(s) / tronçon(s)</p>

      <div className="hidden md:block">
        <LocalisationTable
          data={filtered}
          columns={columns}
          loading={loading}
          keyExtractor={(c) => c.id_commune}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Aucune commune"
        />
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((c) => (
          <div key={c.id_commune} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{c.nom}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold">{c.code}</span>
                  <span className="text-xs text-gray-500">🏙️ {c.ville_nom}</span>
                  {c.district_nom && <span className="text-xs text-gray-500">📍 {c.district_nom}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(c)} className="p-2 rounded-lg bg-blue-50 text-blue-600">✏️</button>
                <button onClick={() => handleDelete(c)} className="p-2 rounded-lg bg-red-50 text-red-600">🗑️</button>
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
              {editing ? 'Modifier' : 'Ajouter un tronçon'}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Ville *</label>
              <select
                value={formData.ville_id}
                onChange={(e) => setFormData({ ...formData, ville_id: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="">-- Choisir --</option>
                {villes.map((v) => <option key={v.id_ville} value={v.id_ville}>{v.nom} ({v.province_nom})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">
                District (optionnel)
              </label>
              <select
                value={formData.district_id}
                onChange={(e) => setFormData({ ...formData, district_id: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white"
              >
                <option value="">-- Non assigné --</option>
                {districts.map((d) => <option key={d.id_district} value={d.id_district}>{d.nom} ({d.province_nom})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Gombe"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="GOM"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl"
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

      {/* FORMULAIRE BULK AVEC CASCADE COMPLÈTE */}
      {showBulkForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-3xl p-5 space-y-4 my-auto max-h-[95vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-gray-800">Ajouter plusieurs tronçons</h3>
              <p className="text-sm text-gray-500">
                Sélectionnez : Pays → Province → Ville → (District optionnel)
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <CascadeSelector value={cascade} onChange={setCascade} showDistrict={true} />
            </div>

            {cascade.ville_id ? (
              <MultipleRowsForm
                title=""
                fields={[
                  { key: 'nom', label: 'Nom du tronçon', placeholder: 'Gombe', required: true },
                  { key: 'code', label: 'Code', placeholder: 'GOM', required: true },
                ]}
                onSubmit={async (rows) => {
                  const res = [];
                  for (const r of rows) {
                    const result = await createCommune({
                      nom: r.nom,
                      code: r.code,
                      ville_id: cascade.ville_id!,
                      district_id: cascade.district_id || null,
                    });
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
                ⚠️ Sélectionnez d'abord une ville pour ajouter des tronçons
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}