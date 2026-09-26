'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationPaysTab.tsximport { useState, useEffect } from 'react';
import { Plus, RefreshCw, Search, Layers } from 'lucide-react';
import { useLocalisationData, Pays } from '../hooks/useLocalisationData';
import LocalisationTable, { Column } from './LocalisationTable';
import MultipleRowsForm from './MultipleRowsForm';

export default function LocalisationPaysTab() {
  const { loadPays, createPays, updatePays, deleteEntity, loading } = useLocalisationData();
  const [pays, setPays] = useState<Pays[]>([]);
  const [search, setSearch] = useState('');
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editing, setEditing] = useState<Pays | null>(null);
  const [formData, setFormData] = useState({ nom: '', code: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const data = await loadPays();
    setPays(data);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = pays.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.nom.trim() || !formData.code.trim()) {
      alert('Nom et code obligatoires');
      return;
    }
    setSaving(true);
    const res = editing
      ? await updatePays(editing.id_pays, formData)
      : await createPays(formData);
    setSaving(false);

    if (res.success) {
      setFormData({ nom: '', code: '' });
      setShowSingleForm(false);
      setEditing(null);
      fetchData();
    } else {
      alert('❌ ' + res.error);
    }
  };

  const handleDelete = async (p: Pays) => {
    if (!confirm(`Supprimer le pays "${p.nom}" ?\n\n⚠️ Impossible si des provinces dépendent.`)) return;
    const res = await deleteEntity('pays', p.id_pays);
    if (res.success) fetchData();
    else alert('❌ ' + res.error);
  };

  const handleEdit = (p: Pays) => {
    setEditing(p);
    setFormData({ nom: p.nom, code: p.code });
    setShowSingleForm(true);
  };

  const columns: Column<Pays>[] = [
    { key: 'id_pays', label: 'ID', className: 'w-16' },
    { 
      key: 'nom', 
      label: 'Nom',
      render: (p) => <span className="font-bold text-gray-800">{p.nom}</span>
    },
    { 
      key: 'code', 
      label: 'Code',
      render: (p) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">
          {p.code}
        </span>
      )
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
            placeholder="Rechercher un pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition"
          title="Rafraîchir"
        >
          <RefreshCw size={16} />
        </button>
        <button
          onClick={() => setShowBulkForm(true)}
          className="px-3 sm:px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-200 transition flex items-center gap-2"
        >
          <Layers size={16} />
          <span className="hidden sm:inline">Ajouter plusieurs</span>
          <span className="sm:hidden">Bulk</span>
        </button>
        <button
          onClick={() => {
            setEditing(null);
            setFormData({ nom: '', code: '' });
            setShowSingleForm(true);
          }}
          className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter un pays</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* COMPTEUR */}
      <p className="text-xs text-gray-500 font-bold">
        {filtered.length} pays {search && `(filtré sur ${pays.length})`}
      </p>

      {/* TABLEAU DESKTOP / CARTES MOBILE */}
      <div className="hidden md:block">
        <LocalisationTable
          data={filtered}
          columns={columns}
          loading={loading}
          keyExtractor={(p) => p.id_pays}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage="Aucun pays enregistré"
        />
      </div>

      {/* CARTES MOBILE */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Aucun pays</div>
        ) : (
          filtered.map((p) => (
            <div key={p.id_pays} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{p.nom}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                    {p.code}
                  </span>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-2 rounded-lg bg-red-50 text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FORMULAIRE SIMPLE */}
      {showSingleForm && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-lg font-black text-gray-800">
              {editing ? 'Modifier le pays' : 'Ajouter un pays'}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Nom *</label>
              <input
                autoFocus
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Congo"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="CD"
                maxLength={10}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowSingleForm(false); setEditing(null); setFormData({ nom: '', code: '' }); }}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAIRE BULK */}
      {showBulkForm && (
        <MultipleRowsForm
          title="Ajouter plusieurs pays"
          fields={[
            { key: 'nom', label: 'Nom', placeholder: 'Congo', required: true },
            { key: 'code', label: 'Code', placeholder: 'CD', required: true },
          ]}
          onSubmit={async (rows) => {
            const res = [];
            for (const r of rows) {
              const result = await createPays({ nom: r.nom, code: r.code });
              res.push({ success: result.success, nom: r.nom, error: result.error });
            }
            fetchData();
            return res;
          }}
          onCancel={() => setShowBulkForm(false)}
        />
      )}
    </div>
  );
}