'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, X, Loader2,
  AlertCircle, Building2,
  ChevronDown, Trash2, Plus,
  Phone, Info, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ============================================
// TYPES
// ============================================

interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  etat: string;
}

interface Face {
  id_face: number;
  id_panneau: number;
  orientation: string;
  est_active: number;
  reservations_actives: number;
}

interface Client {
  id_client: number;
  raison_sociale: string;
  telephone?: string;
  email_facturation?: string;
  ville?: string;
}

interface ReservationLine {
  tempId: string;
  id_face: number | '';
  clientMode: 'existant' | 'nouveau';
  id_client: number | '';
  new_client: {
    raison_sociale: string;
    telephone: string;
    email_facturation: string;
    ville: string;
    adresse: string;
  };
  date_debut: string;
  date_fin: string;
  notes: string;
}

// ============================================
// HELPERS
// ============================================

const makeEmptyLine = (): ReservationLine => ({
  tempId: `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  id_face: '',
  clientMode: 'existant',
  id_client: '',
  new_client: {
    raison_sociale: '',
    telephone: '',
    email_facturation: '',
    ville: '',
    adresse: '',
  },
  date_debut: '',
  date_fin: '',
  notes: '',
});

// ✅ Une ligne est complète quand : face + client + dates valides
const isLineComplete = (l: ReservationLine): boolean => {
  if (!l.id_face) return false;
  if (l.clientMode === 'existant' && !l.id_client) return false;
  if (l.clientMode === 'nouveau' && !l.new_client.raison_sociale.trim())
    return false;
  if (!l.date_debut || !l.date_fin) return false;
  if (new Date(l.date_fin) <= new Date(l.date_debut)) return false;
  return true;
};

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function ParametresPage() {
  const router = useRouter();
  const { user } = useAuth();

  const rawUserId = user?.id_user ?? null;

  // Panneau
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [loadingPanneaux, setLoadingPanneaux] = useState(true);
  const [selectedPanneauId, setSelectedPanneauId] = useState<number | ''>('');

  // Faces
  const [faces, setFaces] = useState<Face[]>([]);
  const [loadingFaces, setLoadingFaces] = useState(false);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Lignes
  const [lines, setLines] = useState<ReservationLine[]>([]);

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdList, setCreatedList] = useState<
    { numero_commande: string; id_face: number }[] | null
  >(null);

  // ============================================
  // CHARGEMENT INITIAL
  // ============================================

  useEffect(() => {
    fetch('/api/panneaux/list')
      .then((r) => r.json())
      .then((data) => setPanneaux(data.panneaux || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingPanneaux(false));

    fetch('/api/clients/list')
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingClients(false));
  }, []);

  useEffect(() => {
    if (!selectedPanneauId) {
      setFaces([]);
      setLines([]);
      return;
    }
    setLoadingFaces(true);
    setLines([]);
    fetch(`/api/panneaux/faces?id_panneau=${selectedPanneauId}`)
      .then((r) => r.json())
      .then((data) => setFaces(data.faces || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingFaces(false));
  }, [selectedPanneauId]);

  // ============================================
  // FACES DISPONIBLES
  // ============================================

  const usedFaceIds = useMemo(
    () =>
      new Set(
        lines.map((l) => l.id_face).filter((id): id is number => id !== '')
      ),
    [lines]
  );

  const availableFaces = useMemo(
    () => faces.filter((f) => !usedFaceIds.has(f.id_face)),
    [faces, usedFaceIds]
  );

  const panneauSelectionne = useMemo(
    () => panneaux.find((p) => p.id_panneau === selectedPanneauId),
    [panneaux, selectedPanneauId]
  );

  // ============================================
  // ✅ VALIDATION GLOBALE : bouton bleu si tout est prêt
  // ============================================

  const canSubmit = useMemo(() => {
    if (!rawUserId) return false;
    if (!selectedPanneauId) return false;
    if (lines.length === 0) return false;
    return lines.every(isLineComplete);
  }, [rawUserId, selectedPanneauId, lines]);

  const hasEmptyLine = useMemo(
    () => lines.some((l) => !isLineComplete(l)),
    [lines]
  );

  // ============================================
  // GESTION DES LIGNES
  // ============================================

  const addLine = () => {
    setLines((prev) => [...prev, makeEmptyLine()]);
  };

  const removeLine = (tempId: string) => {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  const updateLine = (tempId: string, patch: Partial<ReservationLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l))
    );
  };

  const updateNewClient = (
    tempId: string,
    patch: Partial<ReservationLine['new_client']>
  ) => {
    setLines((prev) =>
      prev.map((l) =>
        l.tempId === tempId
          ? { ...l, new_client: { ...l.new_client, ...patch } }
          : l
      )
    );
  };

  const resetAll = () => {
    setLines([]);
    setCreatedList(null);
    setError(null);
    if (selectedPanneauId) {
      fetch(`/api/panneaux/faces?id_panneau=${selectedPanneauId}`)
        .then((r) => r.json())
        .then((data) => setFaces(data.faces || []));
    }
  };

  // ============================================
  // SOUMISSION
  // ============================================

  const handleSubmitAll = async () => {
    setError(null);
    setCreatedList(null);

    if (!rawUserId) {
      setError('Utilisateur non identifié. Reconnectez-vous.');
      return;
    }
    if (!selectedPanneauId) {
      setError('Sélectionnez un panneau');
      return;
    }
    if (lines.length === 0) {
      setError('Ajoutez au moins une ligne de réservation');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!isLineComplete(lines[i])) {
        setError(`Ligne ${i + 1} : informations incomplètes`);
        return;
      }
    }

    setSaving(true);
    const created: { numero_commande: string; id_face: number }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      try {
        const body: any = {
          id_panneau: selectedPanneauId,
          face_ids: [l.id_face],
          date_debut: l.date_debut,
          date_fin: l.date_fin,
          notes: l.notes,
          id_commercial: rawUserId,
        };

        if (l.clientMode === 'existant') {
          body.id_client = l.id_client;
        } else {
          body.new_client = l.new_client;
        }

        const res = await fetch('/api/reservations/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');

        if (data.reservations && data.reservations.length > 0) {
          for (const r of data.reservations) {
            created.push({
              numero_commande: r.numero_commande,
              id_face: r.id_face,
            });
          }
        }
      } catch (err: any) {
        errors.push(`Ligne ${i + 1} : ${err.message}`);
      }
    }

    setSaving(false);

    if (errors.length > 0) {
      setError(
        `${created.length} réservation(s) créée(s).\n${errors.length} erreur(s) :\n${errors.join('\n')}`
      );
    }

    if (created.length > 0) {
      setCreatedList(created);
      setLines([]);
      if (selectedPanneauId) {
        fetch(`/api/panneaux/faces?id_panneau=${selectedPanneauId}`)
          .then((r) => r.json())
          .then((data) => setFaces(data.faces || []));
      }
    }
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 xl:px-10 py-2.5 sm:py-4 flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-gray-100 text-gray-600 transition flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm xs:text-base sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
              Import de réservations
            </h1>
            <p className="text-[9px] xs:text-[10px] sm:text-sm text-gray-500 truncate">
              Ajoutez plusieurs réservations dans un même panneau
            </p>
          </div>
        </div>
      </header>

      <main className="w-full max-w-screen-2xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 xl:px-10 py-3 sm:py-6 space-y-2.5 sm:space-y-4 lg:space-y-5">

        {/* Erreur */}
        {error && (
          <div className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] xs:text-xs sm:text-sm text-red-800 flex-1 whitespace-pre-line break-words">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 flex-shrink-0 p-0.5"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Succès */}
        {createdList && createdList.length > 0 && (
          <div className="rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs xs:text-sm font-bold text-emerald-900">
                  ✅ {createdList.length} réservation
                  {createdList.length > 1 ? 's' : ''} créée
                  {createdList.length > 1 ? 's' : ''} !
                </p>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg bg-white/60 border border-emerald-200 p-1.5 space-y-0.5">
                  {createdList.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 py-1 px-1.5 rounded text-[10px] xs:text-[11px]"
                    >
                      <span className="font-mono font-bold text-emerald-700">
                        {r.numero_commande}
                      </span>
                      <span className="text-emerald-600 truncate">
                        face #{r.id_face}
                      </span>
                      <Check size={12} className="text-emerald-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={resetAll}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] xs:text-xs font-semibold transition"
                  >
                    <Plus size={11} />
                    Ajouter d'autres
                  </button>
                  <button
                    onClick={() => setCreatedList(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 text-[10px] xs:text-xs font-semibold transition hover:bg-emerald-50"
                  >
                    <X size={11} />
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 1 : Panneau */}
        <section className="bg-white rounded-lg sm:rounded-2xl border border-gray-200 p-2.5 sm:p-5 lg:p-6">
          <SectionHeader number={1} title="Sélectionner le panneau" />

          {loadingPanneaux ? (
            <div className="flex items-center justify-center py-3 sm:py-6">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedPanneauId}
                onChange={(e) =>
                  setSelectedPanneauId(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
                className="
                  w-full appearance-none 
                  px-2.5 xs:px-3 sm:px-4 
                  py-2 xs:py-2.5 sm:py-3 
                  pr-8 xs:pr-9 sm:pr-10
                  rounded-lg sm:rounded-xl 
                  border border-gray-200 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  outline-none 
                  text-[11px] xs:text-xs sm:text-base 
                  transition bg-white font-medium
                "
              >
                <option value="">— Choisir un panneau —</option>
                {panneaux.map((p) => (
                  <option key={p.id_panneau} value={p.id_panneau}>
                    {p.nom} — {p.adresse}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 xs:right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}

          {panneauSelectionne && (
            <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
              <Building2
                size={14}
                className="text-blue-600 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] xs:text-xs sm:text-sm font-bold text-blue-900 truncate">
                  {panneauSelectionne.nom}
                </p>
                <p className="text-[9px] xs:text-[10px] sm:text-xs text-blue-700 break-words">
                  {panneauSelectionne.adresse} · {faces.length} face(s)
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ÉTAPE 2 : Lignes */}
        {selectedPanneauId && !loadingFaces && (
          <section className="bg-white rounded-lg sm:rounded-2xl border border-gray-200 p-2.5 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] xs:text-[10px] sm:text-xs font-bold flex-shrink-0">
                  2
                </div>
                <h2 className="text-[11px] xs:text-xs sm:text-base font-bold text-gray-900 truncate">
                  Réservations ({lines.length})
                </h2>
              </div>
              <div className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                {availableFaces.length} dispo
              </div>
            </div>

            {/* Info */}
            <div className="mb-2.5 sm:mb-3 p-2 sm:p-3 rounded-lg bg-blue-50/50 border border-blue-100 flex items-start gap-1.5 sm:gap-2 text-[9px] xs:text-[10px] sm:text-xs text-blue-800">
              <Info size={12} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p>
                Ajoutez une ligne par réservation. Chaque ligne utilise une
                face différente. Les faces déjà prises n'apparaissent plus.
              </p>
            </div>

            {/* Lignes */}
            {lines.length === 0 ? (
              <div className="text-center py-5 sm:py-8 border-2 border-dashed border-gray-200 rounded-lg sm:rounded-xl">
                <p className="text-[11px] xs:text-xs sm:text-sm text-gray-500 mb-2.5">
                  Aucune réservation ajoutée
                </p>
                <button
                  onClick={addLine}
                  disabled={availableFaces.length === 0}
                  className="
                    inline-flex items-center gap-1.5 
                    px-3 sm:px-4 py-1.5 sm:py-2 
                    rounded-lg 
                    bg-blue-600 hover:bg-blue-700 text-white 
                    text-[11px] xs:text-xs sm:text-sm font-semibold 
                    transition 
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <Plus size={12} />
                  Ajouter une réservation
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {lines.map((line, idx) => (
                  <LineCard
                    key={line.tempId}
                    index={idx}
                    line={line}
                    faces={faces}
                    usedFaceIds={usedFaceIds}
                    clients={clients}
                    loadingClients={loadingClients}
                    onUpdate={(patch) => updateLine(line.tempId, patch)}
                    onUpdateNewClient={(patch) =>
                      updateNewClient(line.tempId, patch)
                    }
                    onRemove={() => removeLine(line.tempId)}
                  />
                ))}
              </div>
            )}

            {/* Bouton + Ajouter */}
            {lines.length > 0 && (
              <button
                onClick={addLine}
                disabled={
                  availableFaces.length === 0 ||
                  lines.some((l) => l.id_face === '')
                }
                className="
                  mt-2.5 sm:mt-3 w-full 
                  flex items-center justify-center gap-1.5 
                  px-3 sm:px-4 py-2 sm:py-2.5 
                  rounded-lg 
                  border-2 border-dashed border-blue-300 
                  text-blue-600 hover:bg-blue-50 hover:border-blue-400 
                  text-[11px] xs:text-xs sm:text-sm font-semibold 
                  transition 
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                <Plus size={12} />
                {availableFaces.length === 0
                  ? 'Plus de faces disponibles'
                  : 'Ajouter une autre réservation'}
              </button>
            )}
          </section>
        )}

        {/* ✅ ACTIONS avec bouton BLEU si valide */}
        {selectedPanneauId && lines.length > 0 && (
          <div className="flex flex-col-reverse xs:flex-row xs:items-center xs:justify-end gap-2 xs:gap-3 pb-6 sm:pb-8">
            <button
              onClick={() => router.back()}
              disabled={saving}
              className="
                w-full xs:w-auto 
                px-3 sm:px-4 py-2 sm:py-2.5 
                rounded-lg sm:rounded-xl 
                border border-gray-200 text-gray-700 
                font-semibold text-[11px] xs:text-xs sm:text-sm 
                hover:bg-gray-50 transition 
                disabled:opacity-50
              "
            >
              Annuler
            </button>

            {/* ✅ Le bouton change de couleur selon canSubmit */}
            <button
              onClick={handleSubmitAll}
              disabled={saving || !canSubmit}
              title={
                !canSubmit
                  ? 'Remplissez toutes les lignes (face, client, dates)'
                  : ''
              }
              className={`
                w-full xs:w-auto 
                flex items-center justify-center gap-1.5 sm:gap-2 
                px-3 sm:px-5 py-2 sm:py-2.5 
                rounded-lg sm:rounded-xl 
                font-semibold text-[11px] xs:text-xs sm:text-sm 
                transition active:scale-95 
                disabled:cursor-not-allowed
                ${
                  canSubmit && !saving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-70'
                    : 'bg-gray-300 text-gray-500'
                }
              `}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span className="truncate">
                {saving
                  ? 'Création...'
                  : `Créer ${lines.length} réservation${
                      lines.length > 1 ? 's' : ''
                    }`}
              </span>
            </button>
          </div>
        )}

        {/* Message d'aide si ligne(s) incomplète(s) */}
        {lines.length > 0 && hasEmptyLine && (
          <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-amber-50 border border-amber-200 text-[10px] xs:text-[11px] sm:text-xs text-amber-800">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Remplissez <strong>toutes les lignes</strong> (face, client et dates) pour activer le bouton <strong>Créer</strong>.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// COMPOSANT : Ligne de réservation
// ============================================

function LineCard({
  index,
  line,
  faces,
  usedFaceIds,
  clients,
  loadingClients,
  onUpdate,
  onUpdateNewClient,
  onRemove,
}: {
  index: number;
  line: ReservationLine;
  faces: Face[];
  usedFaceIds: Set<number>;
  clients: Client[];
  loadingClients: boolean;
  onUpdate: (patch: Partial<ReservationLine>) => void;
  onUpdateNewClient: (patch: Partial<ReservationLine['new_client']>) => void;
  onRemove: () => void;
}) {
  const clientSelectionne = clients.find((c) => c.id_client === line.id_client);
  const faceOptions = faces.filter(
    (f) => !usedFaceIds.has(f.id_face) || f.id_face === line.id_face
  );

  // ✅ La ligne est-elle complète ?
  const isComplete = isLineComplete(line);

  return (
    <div
      className={`
        border-2 rounded-lg sm:rounded-xl overflow-hidden 
        transition-colors
        ${isComplete ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50'}
      `}
    >
      {/* Header ligne */}
      <div
        className={`
          flex items-center justify-between 
          px-2 sm:px-3 py-1.5 sm:py-2 
          border-b
          ${isComplete ? 'bg-emerald-100 border-emerald-200' : 'bg-gray-100 border-gray-200'}
        `}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`
              w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white
              ${isComplete ? 'bg-emerald-600' : 'bg-blue-600'}
            `}
          >
            {isComplete ? <Check size={11} /> : index + 1}
          </div>
          <span className="text-[10px] xs:text-[11px] sm:text-xs font-bold text-gray-700">
            Réservation #{index + 1}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1 sm:p-1.5 rounded-md hover:bg-red-100 text-red-600 transition"
          title="Supprimer cette ligne"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="p-2 sm:p-3 space-y-2.5 sm:space-y-3">
        {/* Face */}
        <div>
          <label className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-gray-600 mb-0.5 sm:mb-1 block">
            Face <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={line.id_face}
              onChange={(e) =>
                onUpdate({
                  id_face: e.target.value ? Number(e.target.value) : '',
                })
              }
              className="
                w-full appearance-none 
                px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-9 
                rounded-lg 
                border border-gray-200 
                focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                outline-none 
                text-[11px] xs:text-xs sm:text-sm 
                bg-white
              "
            >
              <option value="">— Choisir une face —</option>
              {faceOptions.map((f) => (
                <option key={f.id_face} value={f.id_face}>
                  {f.orientation} (#{f.id_face})
                  {f.reservations_actives > 0
                    ? ` — ${f.reservations_actives} active(s)`
                    : ''}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Client */}
        <div>
          <label className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-gray-600 mb-0.5 sm:mb-1 block">
            Client <span className="text-red-500">*</span>
          </label>

          <div className="flex gap-0.5 sm:gap-1 p-0.5 bg-gray-200 rounded-lg mb-1.5 sm:mb-2">
            <button
              onClick={() => onUpdate({ clientMode: 'existant' })}
              className={`
                flex-1 px-1.5 sm:px-2 py-1 rounded-md 
                text-[9px] xs:text-[10px] sm:text-xs font-semibold transition
                ${
                  line.clientMode === 'existant'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600'
                }
              `}
            >
              Existant
            </button>
            <button
              onClick={() => onUpdate({ clientMode: 'nouveau' })}
              className={`
                flex-1 px-1.5 sm:px-2 py-1 rounded-md 
                text-[9px] xs:text-[10px] sm:text-xs font-semibold transition
                ${
                  line.clientMode === 'nouveau'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600'
                }
              `}
            >
              Nouveau
            </button>
          </div>

          {line.clientMode === 'existant' && (
            <>
              {loadingClients ? (
                <div className="flex justify-center py-2">
                  <Loader2 size={14} className="text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={line.id_client}
                    onChange={(e) =>
                      onUpdate({
                        id_client: e.target.value
                          ? Number(e.target.value)
                          : '',
                      })
                    }
                    className="
                      w-full appearance-none 
                      px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-9 
                      rounded-lg 
                      border border-gray-200 
                      focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                      outline-none 
                      text-[11px] xs:text-xs sm:text-sm 
                      bg-white
                    "
                  >
                    <option value="">— Choisir un client —</option>
                    {clients.map((c) => (
                      <option key={c.id_client} value={c.id_client}>
                        {c.raison_sociale}
                        {c.telephone ? ` — ${c.telephone}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              )}

              {clientSelectionne && (
                <div className="mt-1.5 p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200 text-[9px] xs:text-[10px] sm:text-xs">
                  <p className="font-bold text-slate-900 truncate">
                    {clientSelectionne.raison_sociale}
                  </p>
                  {clientSelectionne.telephone && (
                    <p className="text-slate-600 flex items-center gap-1 mt-0.5">
                      <Phone size={9} />
                      {clientSelectionne.telephone}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {line.clientMode === 'nouveau' && (
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
              {/* ✅ Placeholder modifié : "Nom client" */}
              <input
                type="text"
                placeholder="Nom client *"
                value={line.new_client.raison_sociale}
                onChange={(e) =>
                  onUpdateNewClient({ raison_sociale: e.target.value })
                }
                className="
                  w-full px-2.5 sm:px-3 py-1.5 sm:py-2 
                  rounded-lg 
                  border border-gray-200 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                  outline-none 
                  text-[11px] xs:text-xs sm:text-sm 
                  bg-white
                "
              />
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={line.new_client.telephone}
                  onChange={(e) =>
                    onUpdateNewClient({ telephone: e.target.value })
                  }
                  className="
                    w-full px-2.5 sm:px-3 py-1.5 sm:py-2 
                    rounded-lg 
                    border border-gray-200 
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                    outline-none 
                    text-[11px] xs:text-xs sm:text-sm 
                    bg-white
                  "
                />
                <input
                  type="text"
                  placeholder="Ville"
                  value={line.new_client.ville}
                  onChange={(e) =>
                    onUpdateNewClient({ ville: e.target.value })
                  }
                  className="
                    w-full px-2.5 sm:px-3 py-1.5 sm:py-2 
                    rounded-lg 
                    border border-gray-200 
                    focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                    outline-none 
                    text-[11px] xs:text-xs sm:text-sm 
                    bg-white
                  "
                />
              </div>
            </div>
          )}
        </div>

        {/* ✅ Dates : TOUJOURS 2 colonnes même sur phone */}
        <div>
          <label className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-gray-600 mb-0.5 sm:mb-1 block">
            Dates <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <div>
              <span className="text-[8px] xs:text-[9px] text-gray-400 block mb-0.5">
                Début
              </span>
              <input
                type="date"
                value={line.date_debut}
                onChange={(e) => onUpdate({ date_debut: e.target.value })}
                className="
                  w-full px-1.5 xs:px-2 sm:px-3 
                  py-1.5 sm:py-2 
                  rounded-lg 
                  border border-gray-200 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                  outline-none 
                  text-[10px] xs:text-[11px] sm:text-sm 
                  bg-white
                  min-w-0
                "
              />
            </div>
            <div>
              <span className="text-[8px] xs:text-[9px] text-gray-400 block mb-0.5">
                Fin
              </span>
              <input
                type="date"
                value={line.date_fin}
                onChange={(e) => onUpdate({ date_fin: e.target.value })}
                className="
                  w-full px-1.5 xs:px-2 sm:px-3 
                  py-1.5 sm:py-2 
                  rounded-lg 
                  border border-gray-200 
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                  outline-none 
                  text-[10px] xs:text-[11px] sm:text-sm 
                  bg-white
                  min-w-0
                "
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <input
          type="text"
          placeholder="Notes (optionnel)"
          value={line.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          className="
            w-full px-2.5 sm:px-3 py-1.5 sm:py-2 
            rounded-lg 
            border border-gray-200 
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
            outline-none 
            text-[11px] xs:text-xs sm:text-sm 
            bg-white
          "
        />
      </div>
    </div>
  );
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-2.5 sm:mb-4">
      <div className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] xs:text-[10px] sm:text-xs font-bold flex-shrink-0">
        {number}
      </div>
      <h2 className="text-[11px] xs:text-xs sm:text-base font-bold text-gray-900 truncate">
        {title}
      </h2>
    </div>
  );
}