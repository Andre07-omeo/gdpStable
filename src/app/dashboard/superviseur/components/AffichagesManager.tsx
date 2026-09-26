'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/AffichagesManager.tsximport { useMemo, useState } from 'react';
import {
  RefreshCw, Search, Filter, Calendar, Clock, CheckCircle,
  XCircle, AlertCircle, MapPin, User, Building, Image as ImageIcon,
  ChevronDown, ChevronUp, Eye, X, Download, ExternalLink,
  Printer, CheckSquare, Square, ShieldCheck, Loader2
} from 'lucide-react';
import { useAffichages, AffichageReservation } from '../hooks/useAffichages';

interface AffichagesManagerProps {
  user?: any;
}

type StatutFilter = 'all' | 'a_valider' | 'valide' | 'en_cours' | 'termine';

export default function AffichagesManager({ user }: AffichagesManagerProps) {
  const {
    affichages, loading, error, isRefreshing, isValidating,
    refresh, validerReservations,
  } = useAffichages();

  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [notesValidation, setNotesValidation] = useState('');

  // ─── Filtrage ───
  const filtered = useMemo(() => {
    let list = affichages;
    if (statutFilter === 'a_valider') list = list.filter((a) => !a.validation_superviseur);
    if (statutFilter === 'valide') list = list.filter((a) => a.validation_superviseur);
    if (statutFilter === 'en_cours') list = list.filter((a) => {
      const s = (a.statut || '').toLowerCase();
      return s.includes('cours') || s.includes('actif');
    });
    if (statutFilter === 'termine') list = list.filter((a) => {
      const s = (a.statut || '').toLowerCase();
      return s.includes('termin') || s.includes('fin');
    });

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) =>
        String(a.id_reservation).includes(q) ||
        (a.numero_commande || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q) ||
        (a.client?.nom || '').toLowerCase().includes(q) ||
        (a.client?.raison_sociale || '').toLowerCase().includes(q) ||
        (a.commercial?.nom || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [affichages, statutFilter, searchTerm]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = affichages.length;
    const aValider = affichages.filter((a) => !a.validation_superviseur).length;
    const validees = affichages.filter((a) => a.validation_superviseur).length;
    const avecPhoto = affichages.filter((a) => !!a.photoCampagneUrl).length;
    return { total, aValider, validees, avecPhoto };
  }, [affichages]);

  // ─── Sélection ───
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const nonValidees = filtered.filter((a) => !a.validation_superviseur).map((a) => a.id_reservation);
    setSelectedIds(nonValidees);
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedReservations = useMemo(
    () => affichages.filter((a) => selectedIds.includes(a.id_reservation)),
    [affichages, selectedIds]
  );

  // ─── Formatage ───
  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  };

  const formatDateTime = (d?: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return '—'; }
  };

  const getStatutBadge = (statut?: string | null, validee?: boolean) => {
    if (validee) return { label: 'Validée superviseur', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: ShieldCheck };
    const s = (statut || '').toLowerCase();
    if (s.includes('cours') || s.includes('actif'))
      return { label: 'En cours', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: Clock };
    if (s.includes('termin') || s.includes('fin'))
      return { label: 'Terminé', cls: 'bg-blue-100 text-blue-700 border-blue-200', Icon: CheckCircle };
    if (s.includes('expir'))
      return { label: 'Expiré', cls: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle };
    return { label: statut || 'À valider', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertCircle };
  };

  // ─── Validation ───
  const handleValider = async () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une réservation');
      return;
    }
    const ok = confirm(
      `Valider ${selectedIds.length} réservation(s) ?\n\n` +
      `Une fois validées, elles seront verrouillées et pourront être imprimées comme preuve d'affichage.`
    );
    if (!ok) return;

    const success = await validerReservations(selectedIds, notesValidation || undefined);
    if (success) {
      alert(`✅ ${selectedIds.length} réservation(s) validée(s)`);
      clearSelection();
      setNotesValidation('');
    }
  };

  // ─── Impression de la preuve ───
  const handlePrint = () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une réservation');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer');
      return;
    }

    const rows = selectedReservations
      .map((a, idx) => {
        const commercialFull = a.commercial
          ? `${a.commercial.nom} ${a.commercial.prenom || ''}`.trim()
          : `ID ${a.id_commercial ?? '—'}`;
        const chefFull = a.chef ? `${a.chef.nom} ${a.chef.prenom || ''}`.trim() : '—';
        const supFull = a.superviseur
          ? `${a.superviseur.nom} ${a.superviseur.prenom || ''}`.trim()
          : (user ? `${user.nom || ''} ${user.prenom || ''}`.trim() : '—');

        return `
          <tr>
            <td>${idx + 1}</td>
            <td>#${a.id_reservation}${a.numero_commande ? `<br><small>${a.numero_commande}</small>` : ''}</td>
            <td>${a.client?.raison_sociale || a.client?.nom || `ID ${a.id_client}`}</td>
            <td>${formatDate(a.date_debut_campagne)} → ${formatDate(a.date_fin_campagne)}</td>
            <td>${commercialFull}</td>
            <td>${chefFull}${a.date_validation_chef ? `<br><small>${formatDate(a.date_validation_chef)}</small>` : ''}</td>
            <td>${supFull}${a.date_validation_superviseur ? `<br><small>${formatDate(a.date_validation_superviseur)}</small>` : ''}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Preuve d'affichage - GDP</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0; padding: 24px;
            color: #1e293b; background: #fff;
          }
          .header {
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px;
          }
          .header .logo { display: flex; align-items: center; gap: 12px; }
          .header .logo img { width: 60px; height: 60px; object-fit: contain; }
          .header h1 { margin: 0; font-size: 22px; color: #1e40af; }
          .header h2 { margin: 4px 0 0; font-size: 14px; color: #64748b; font-weight: 500; }
          .meta { font-size: 11px; color: #64748b; text-align: right; }
          .title {
            text-align: center; font-size: 18px; font-weight: 700;
            margin: 16px 0; color: #0f172a;
            text-transform: uppercase; letter-spacing: 1px;
          }
          table {
            width: 100%; border-collapse: collapse; font-size: 11px;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;
            vertical-align: top;
          }
          th {
            background: #1e40af; color: white; font-weight: 600;
            text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          small { color: #64748b; font-size: 9px; }
          .signatures {
            display: flex; justify-content: space-around;
            margin-top: 50px; page-break-inside: avoid;
          }
          .signature-box {
            width: 40%; text-align: center;
          }
          .signature-box .line {
            border-top: 1px solid #1e293b; margin-top: 70px; padding-top: 6px;
            font-size: 11px; font-weight: 600;
          }
          .signature-box .role {
            font-size: 10px; color: #64748b; margin-top: 2px;
          }
          .footer {
            margin-top: 24px; text-align: center;
            font-size: 9px; color: #94a3b8;
            border-top: 1px solid #e2e8f0; padding-top: 8px;
          }
          @media print {
            body { padding: 12px; }
            @page { margin: 12mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${window.location.origin}/icons/icon-192x192.png" alt="GDP" />
            <div>
              <h1>GDP — Gestion des Panneaux</h1>
              <h2>Preuve d'affichage de campagne publicitaire</h2>
            </div>
          </div>
          <div class="meta">
            <div><strong>Date d'impression :</strong> ${new Date().toLocaleString('fr-FR')}</div>
            <div><strong>Superviseur :</strong> ${user ? `${user.nom || ''} ${user.prenom || ''}`.trim() : '—'}</div>
            <div><strong>Total :</strong> ${selectedReservations.length} affichage(s)</div>
          </div>
        </div>

        <div class="title">Bon d'affichage — Campagnes validées</div>

        <table>
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th style="width:90px">Réservation</th>
              <th style="width:110px">Client</th>
              <th style="width:110px">Période</th>
              <th style="width:100px">Commercial vendeur</th>
              <th style="width:110px">Chef commercial (validation)</th>
              <th style="width:110px">Superviseur (validation)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-box">
            <div class="line">Chef Commercial</div>
            <div class="role">Nom & Signature</div>
          </div>
          <div class="signature-box">
            <div class="line">Superviseur</div>
            <div class="role">Nom & Signature</div>
          </div>
        </div>

        <div class="footer">
          Document généré automatiquement par GDP — Toute reproduction non autorisée est interdite.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ─── États ───
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-bold uppercase tracking-wider text-sm">
            Chargement des affichages...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-6 sm:p-10 text-center">
        <div className="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 text-sm mb-6">{error}</p>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4 sm:space-y-6 pb-32">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon size={22} className="text-purple-600" />
            📸 Affichages — Campagnes validées
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Réservations validées par le chef commercial — {filtered.length} résultat(s)
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="px-3 sm:px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition flex items-center gap-2 disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total" value={stats.total} Icon={ImageIcon} color="purple" />
        <StatCard label="À valider" value={stats.aValider} Icon={AlertCircle} color="amber" />
        <StatCard label="Validées" value={stats.validees} Icon={ShieldCheck} color="emerald" />
        <StatCard label="Avec photo" value={stats.avecPhoto} Icon={Eye} color="blue" />
      </div>

      {/* Barre d'actions principale */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (ID, n° commande, client, commercial...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as StatutFilter)}
              className="w-full sm:w-52 pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="a_valider">À valider</option>
              <option value="valide">Validées</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Actions sélection */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={selectAllFiltered}
            className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1.5"
          >
            <CheckSquare size={13} /> Tout sélectionner (non validées)
          </button>
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition inline-flex items-center gap-1.5"
              >
                <X size={13} /> Effacer ({selectedIds.length})
              </button>
              <span className="text-xs text-gray-500">
                {selectedIds.length} sélectionnée(s)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon size={36} className="text-purple-300" />
          </div>
          <p className="font-bold text-gray-700 text-base">Aucun affichage trouvé</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm || statutFilter !== 'all'
              ? 'Essayez de modifier vos filtres'
              : 'Aucune réservation validée par le chef commercial'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const badge = getStatutBadge(a.statut, a.validation_superviseur);
            const BadgeIcon = badge.Icon;
            const isOpen = expandedId === a.id_reservation;
            const isSelected = selectedIds.includes(a.id_reservation);
            const canSelect = !a.validation_superviseur;

            return (
              <div
                key={a.id_reservation}
                className={`bg-white rounded-2xl shadow border overflow-hidden transition ${
                  isSelected ? 'border-purple-400 ring-2 ring-purple-200' : 'border-gray-100 hover:shadow-lg'
                }`}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Case à cocher */}
                      <button
                        onClick={() => canSelect && toggleSelect(a.id_reservation)}
                        disabled={!canSelect}
                        className={`mt-1 shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition ${
                          !canSelect
                            ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed'
                            : isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={canSelect ? 'Sélectionner' : 'Déjà validée'}
                      >
                        {!canSelect ? <ShieldCheck size={14} /> : isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                      </button>

                      {/* Photo miniature */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        {a.photoCampagneUrl ? (
                          <img
                            src={a.photoCampagneUrl}
                            alt={`Affichage #${a.id_reservation}`}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setPhotoModal(a.photoCampagneUrl!)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={20} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                            #{a.id_reservation}
                            {a.numero_commande && (
                              <span className="text-gray-400 font-normal"> · {a.numero_commande}</span>
                            )}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                            <BadgeIcon size={10} />
                            {badge.label}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={11} /> {a.client?.raison_sociale || a.client?.nom || `Client ${a.id_client}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(a.date_debut_campagne)} → {formatDate(a.date_fin_campagne)}
                          </span>
                          {a.commercial && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Building size={11} /> Commercial : {a.commercial.nom} {a.commercial.prenom}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.validation_chef_commercial
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}>
                            {a.validation_chef_commercial ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            Chef commercial
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.validation_superviseur
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {a.validation_superviseur ? <ShieldCheck size={10} /> : <Clock size={10} />}
                            Superviseur {a.validation_superviseur ? '' : '(en attente)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {a.photoCampagneUrl && (
                        <button
                          onClick={() => setPhotoModal(a.photoCampagneUrl!)}
                          className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition"
                          title="Voir la photo"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isOpen ? null : a.id_reservation)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                        title={isOpen ? 'Réduire' : 'Détails'}
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Détails */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-3 sm:p-5 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <DetailCard title="Identifiants">
                        <Row label="ID réservation" value={`#${a.id_reservation}`} />
                        <Row label="ID client" value={a.id_client} />
                        <Row label="ID commercial" value={a.id_commercial ?? '—'} />
                        <Row label="ID chef commercial" value={a.id_chef_commercial ?? '—'} />
                        <Row label="ID superviseur" value={a.id_superviseur ?? '—'} />
                      </DetailCard>

                      <DetailCard title="Campagne">
                        <Row label="N° commande" value={a.numero_commande || '—'} />
                        <Row label="Statut" value={a.statut || '—'} />
                        <Row label="Début" value={formatDate(a.date_debut_campagne)} />
                        <Row label="Fin" value={formatDate(a.date_fin_campagne)} />
                        <Row label="Expiration" value={formatDate(a.date_expiration)} />
                        <Row label="Créée le" value={formatDate(a.date_creation)} />
                      </DetailCard>

                      <DetailCard title="Validation">
                        <Row label="Chef commercial" value={a.validation_chef_commercial ? '✅ Validée' : '❌ Non'} />
                        <Row label="Date validation chef" value={formatDateTime(a.date_validation_chef)} />
                        <Row label="Superviseur" value={a.validation_superviseur ? '✅ Validée' : '⏳ En attente'} />
                        <Row label="Date validation sup." value={formatDateTime(a.date_validation_superviseur)} />
                        <Row label="Verrouillé" value={a.est_verrouille ? '🔒 Oui' : '🔓 Non'} />
                        <Row label="Photo uploadée le" value={formatDateTime(a.date_upload_photo)} />
                      </DetailCard>
                    </div>

                    {a.notes && (
                      <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Notes
                        </h4>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap">{a.notes}</p>
                      </div>
                    )}

                    {a.photo_latitude != null && a.photo_longitude != null && (
                      <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-blue-800">GPS photo :</span>
                            <span className="text-xs text-blue-700">
                              {a.photo_latitude.toFixed(6)}, {a.photo_longitude.toFixed(6)}
                            </span>
                          </div>
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${a.photo_latitude}&mlon=${a.photo_longitude}#map=18/${a.photo_latitude}/${a.photo_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1"
                          >
                            <ExternalLink size={11} /> Voir sur la carte
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barre d'action flottante (validation + impression) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[900] bg-white border-t-2 border-purple-500 shadow-2xl p-3 sm:p-4 animate-slideUp">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                  {selectedIds.length}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {selectedIds.length} réservation(s) sélectionnée(s)
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedReservations.map((r) => `#${r.id_reservation}`).join(', ')}
                  </p>
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder="Notes de validation (optionnel)"
              value={notesValidation}
              onChange={(e) => setNotesValidation(e.target.value)}
              className="sm:w-64 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                disabled={isValidating}
                className="px-4 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Imprimer la preuve</span>
                <span className="sm:hidden">Imprimer</span>
              </button>
              <button
                onClick={handleValider}
                disabled={isValidating}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {isValidating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span className="hidden sm:inline">
                  {isValidating ? 'Validation...' : 'Valider la sélection'}
                </span>
                <span className="sm:hidden">Valider</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Photo */}
      {photoModal && (
        <div
          className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPhotoModal(null)}
        >
          <button
            onClick={() => setPhotoModal(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-4xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photoModal}
              alt="Photo de campagne"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
            <a
              href={photoModal}
              download
              className="absolute bottom-4 right-4 px-4 py-2 bg-white text-gray-800 rounded-xl font-bold hover:bg-gray-100 transition inline-flex items-center gap-2 text-sm shadow-lg"
            >
              <Download size={16} /> Télécharger
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────
function StatCard({
  label, value, Icon, color,
}: {
  label: string;
  value: number;
  Icon: any;
  color: 'purple' | 'amber' | 'emerald' | 'blue';
}) {
  const colors: Record<string, string> = {
    purple: 'border-purple-100 text-purple-700 bg-purple-100',
    amber: 'border-amber-100 text-amber-700 bg-amber-100',
    emerald: 'border-emerald-100 text-emerald-700 bg-emerald-100',
    blue: 'border-blue-100 text-blue-700 bg-blue-100',
  };
  const [border, text, bg] = colors[color].split(' ');
  return (
    <div className={`bg-white rounded-2xl shadow border ${border} p-3 sm:p-4`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase truncate">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold ${text}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon size={18} className={text} />
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
      <dl className="space-y-1.5 text-xs">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium text-right truncate max-w-[60%]">{String(value ?? '—')}</dd>
    </div>
  );
}