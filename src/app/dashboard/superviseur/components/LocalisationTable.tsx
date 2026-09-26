'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationTable.tsximport { Pencil, Trash2, Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface LocalisationTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  emptyMessage?: string;
  keyExtractor: (item: T) => string | number;
}

export default function LocalisationTable<T>({
  data,
  columns,
  loading,
  onEdit,
  onDelete,
  emptyMessage = 'Aucune donnée',
  keyExtractor,
}: LocalisationTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
        <p className="font-bold">Chargement...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-4xl mb-2">📭</p>
        <p className="font-bold text-gray-500">{emptyMessage}</p>
        <p className="text-sm text-gray-400 mt-1">
          Utilisez le bouton "Ajouter" pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  text-left px-4 py-3 font-bold text-gray-700 
                  uppercase text-xs tracking-wider
                  ${col.className || ''}
                `}
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="text-right px-4 py-3 font-bold text-gray-700 uppercase text-xs tracking-wider w-32">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="hover:bg-blue-50/50 transition"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className || ''}`}>
                  {col.render
                    ? col.render(item)
                    : String((item as any)[col.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}