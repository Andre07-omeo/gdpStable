'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/MultipleRowsForm.tsximport { useState } from 'react';
import { Plus, X, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export interface RowField {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  width?: string;
}

export interface FormRow {
  id: string;
  [key: string]: any;
}

interface MultipleRowsFormProps {
  fields: RowField[];
  parentLabel?: string;
  parentValue?: string;
  onSubmit: (rows: Array<{ [key: string]: any }>) => Promise<
    Array<{ success: boolean; nom: string; error?: string }>
  >;
  onCancel: () => void;
  title?: string;
}

export default function MultipleRowsForm({
  fields,
  parentLabel,
  parentValue,
  onSubmit,
  onCancel,
  title = 'Ajouter plusieurs éléments',
}: MultipleRowsFormProps) {
  const [rows, setRows] = useState<FormRow[]>([createEmptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{ success: boolean; nom: string; error?: string }> | null>(null);

  function createEmptyRow(): FormRow {
    const row: FormRow = { id: Math.random().toString(36).slice(2) };
    fields.forEach((f) => { row[f.key] = ''; });
    return row;
  }

  const addRow = () => setRows([...rows, createEmptyRow()]);

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, key: string, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const handleSubmit = async () => {
    // Validation
    const validRows = rows.filter((r) =>
      fields.filter((f) => f.required).every((f) => r[f.key]?.trim())
    );
    if (validRows.length === 0) {
      alert('❌ Remplissez au moins une ligne complète');
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      const payload = validRows.map(({ id, ...rest }) => rest);
      const res = await onSubmit(payload);
      setResults(res);

      const allOk = res.every((r) => r.success);
      if (allOk) {
        setTimeout(() => {
          onCancel();
        }, 1500);
      }
    } catch (err: any) {
      alert('❌ Erreur : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-5 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-white">{title}</h2>
            {parentLabel && parentValue && (
              <p className="text-sm text-blue-200 mt-1">
                {parentLabel} : <span className="font-bold text-white">{parentValue}</span>
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-2 bg-white/15 hover:bg-red-500 rounded-lg text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPS */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type="text"
                      value={row[field.key] || ''}
                      onChange={(e) => updateRow(row.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title="Supprimer cette ligne"
              >
                <X size={16} />
              </button>
            </div>
          ))}

          <button
            onClick={addRow}
            className="w-full py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Ajouter une ligne
          </button>

          {/* RÉSULTATS */}
          {results && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <p className="font-bold text-sm text-gray-700 mb-2">Résultats :</p>
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                    r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {r.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span className="font-bold">{r.nom}</span>
                  {r.error && <span className="text-xs">— {r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-500 font-bold">
            {rows.length} ligne{rows.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer tout
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}