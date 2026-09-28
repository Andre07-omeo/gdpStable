// src/app/dashboard/comptable/factures/page.tsx

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, FileText, PackageOpen } from 'lucide-react';
import {
  FactureStatsBar,
  FactureFilters,
  FacturePagination,
  FactureValidationModal,
} from '../components';
import { FactureCardRow } from '../components/FactureCardRow';

interface Facture {
  id_facture: number;
  numero_facture: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  commercial_nom: string;
  commercial_prenom: string;
  commercial_email: string;
  statut: string;
  total_ttc: number;
  total_ht: number;
  montant_paye: number;
  created_at: string;
  date_facture: string;
  date_echeance: string;
  date_creation: string;
  motif_rejet?: string;
  mode_paiement: string;
  nombre_tranches: number;
  montant_par_tranche: number;
  lignes?: any[];
  tranches?: any[];
  conditions_paiement: string;
}

export default function ComptableFacturesPage() {
  const searchParams = useSearchParams();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [modalMode, setModalMode] = useState<'details' | 'valider' | 'rejeter'>('details');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'TOUS');

  const [stats, setStats] = useState({
    total: 0, en_attente: 0, validees: 0, rejetees: 0, payees: 0, total_ttc: 0,
  });

  // ─── FETCH ───────────────────────────────────────────
  const fetchFactures = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/facture?limit=100', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        let list: Facture[] = Array.isArray(data.data) ? data.data : [data.data].filter(Boolean);
        list = list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFactures(list);

        setStats({
          total: list.length,
          en_attente: list.filter(f => f.statut === 'EN_ATTENTE').length,
          validees: list.filter(f => f.statut === 'VALIDE').length,
          rejetees: list.filter(f => f.statut === 'REJETEE').length,
          payees: list.filter(f => f.statut === 'PAYEE').length,
          total_ttc: list.reduce((s, f) => s + Number(f.total_ttc || f.total_ht || 0), 0),
        });
      } else {
        setError(data.message || 'Erreur de chargement');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFactures(); }, []);

  // ─── FILTRAGE ────────────────────────────────────────
  const filteredFactures = useMemo(() => {
    let f = [...factures];
    if (statusFilter !== 'TOUS') f = f.filter(x => x.statut === statusFilter);
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase().trim();
      f = f.filter(x =>
        x.numero_facture.toLowerCase().includes(s) ||
        (x.client_nom || '').toLowerCase().includes(s) ||
        (x.commercial_nom || '').toLowerCase().includes(s) ||
        (x.commercial_prenom || '').toLowerCase().includes(s)
      );
    }
    return f;
  }, [factures, statusFilter, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm]);

  // Compteurs pour les filtres
  const counts = useMemo(() => ({
    TOUS: factures.length,
    EN_ATTENTE: factures.filter(f => f.statut === 'EN_ATTENTE').length,
    VALIDE: factures.filter(f => f.statut === 'VALIDE').length,
    REJETEE: factures.filter(f => f.statut === 'REJETEE').length,
    PAYEE: factures.filter(f => f.statut === 'PAYEE').length,
  }), [factures]);

  // ─── ACTIONS ─────────────────────────────────────────
  const handleValidate = async (
    id_facture: number, montant: number, modePaiement: string, nombreTranches: number
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/facture/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_facture, action: 'valider',
          montant_recu: montant, mode_paiement: modePaiement, nombre_tranches: nombreTranches,
        }),
      });
      const r = await res.json();
      if (r.success) {
        alert(`✅ ${r.message}`);
        fetchFactures();
        setShowValidationModal(false);
        setSelectedFacture(null);
      } else alert(`❌ ${r.message}`);
    } catch { alert('❌ Erreur lors de la validation'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (id_facture: number, motif: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/facture/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id_facture, action: 'rejeter', motif_rejet: motif }),
      });
      const r = await res.json();
      if (r.success) {
        alert(`✅ ${r.message}`);
        fetchFactures();
        setShowValidationModal(false);
        setSelectedFacture(null);
      } else alert(`❌ ${r.message}`);
    } catch { alert('❌ Erreur lors du rejet'); }
    finally { setActionLoading(false); }
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    const url = new URL(window.location.href);
    if (newStatus === 'TOUS') url.searchParams.delete('status');
    else url.searchParams.set('status', newStatus);
    window.history.pushState({}, '', url.toString());
  };

  // ─── FORMATTERS ──────────────────────────────────────
  const formatDate = (d: string | null) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return d; }
  };

  const formatPrice = (p: number) => {
    if (typeof p !== 'number' || isNaN(p)) return '0 FC';
    return p.toLocaleString('fr-FR') + ' FC';
  };

  const getStatusBadge = (statut: string) => {
    const n = (statut || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const styles: Record<string, { color: string; label: string; dot: string }> = {
      EN_ATTENTE: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'En attente', dot: 'bg-amber-500' },
      VALIDE: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Validée', dot: 'bg-emerald-500' },
      REJETEE: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Rejetée', dot: 'bg-red-500' },
      PAYEE: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Payée', dot: 'bg-blue-500' },
    };
    const s = styles[n] || { color: 'bg-gray-50 text-gray-700 border-gray-200', label: statut || 'Inconnu', dot: 'bg-gray-400' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap ${s.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  // ─── PAGINATION ──────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredFactures.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentFactures = filteredFactures.slice(startIndex, startIndex + itemsPerPage);

  // ─── LOADING ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <FileText className="absolute inset-0 m-auto text-blue-600" size={24} />
        </div>
        <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium">
          Chargement des factures...
        </p>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div className="w-full space-y-4 sm:space-y-5 animate-fadeIn">

      {/* Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
            Gestion des factures
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Consulter, valider, rejeter et encaisser les factures
          </p>
        </div>
      </div>

      {/* Bandeau stats */}
      <FactureStatsBar stats={stats} formatPrice={formatPrice} />

      {/* Filtres */}
      <FactureFilters
        statusFilter={statusFilter}
        setStatusFilter={handleStatusFilterChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onRefresh={fetchFactures}
        loading={loading}
        counts={counts}
      />

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {currentFactures.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PackageOpen size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-bold text-base sm:text-lg">
              Aucune facture trouvée
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 text-center">
              {statusFilter === 'TOUS'
                ? 'Aucune facture dans la liste'
                : statusFilter === 'EN_ATTENTE'
                ? 'Aucune facture en attente'
                : statusFilter === 'VALIDE'
                ? 'Aucune facture validée'
                : statusFilter === 'REJETEE'
                ? 'Aucune facture rejetée'
                : 'Aucune facture payée'}
            </p>
          </div>
        ) : (
          currentFactures.map((facture) => (
            <FactureCardRow
              key={facture.id_facture}
              facture={facture}
              onViewDetail={(f) => {
                setSelectedFacture(f);
                setModalMode('details');
                setShowValidationModal(true);
              }}
              onValidate={(f) => {
                setSelectedFacture(f);
                setModalMode('valider');
                setShowValidationModal(true);
              }}
              onPayment={(f) => {
                setSelectedFacture(f);
                setModalMode('valider');
                setShowValidationModal(true);
              }}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <FacturePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredFactures.length}
        onPageChange={setCurrentPage}
      />

      {/* Modal */}
      {showValidationModal && selectedFacture && (
        <FactureValidationModal
          facture={selectedFacture}
          mode={modalMode}
          onClose={() => {
            setShowValidationModal(false);
            setSelectedFacture(null);
            setModalMode('details');
          }}
          onConfirm={handleValidate}
          onReject={handleReject}
          loading={actionLoading}
          formatPrice={formatPrice}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}