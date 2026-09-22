// src/app/dashboard/comptable/factures/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Eye,
  Check,
  Loader2,
  X,
  Building2,
  User,
  Calendar,
  CreditCard,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  StatsCards,
  FactureFilters,
  FacturePagination,
  FactureValidationModal,
} from '../components';

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
  const [modalMode, setModalMode] = useState<'details' | 'valider' | 'rejeter'>(
    'details'
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || 'TOUS'
  );
  const [filteredFactures, setFilteredFactures] = useState<Facture[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    validees: 0,
    rejetees: 0,
    payees: 0,
    total_ttc: 0,
  });

  const fetchFactures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/facture?limit=100', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        let facturesData: Facture[] = Array.isArray(data.data)
          ? data.data
          : [data.data].filter(Boolean);

        facturesData = facturesData.sort(
          (a: Facture, b: Facture) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setFactures(facturesData);

        const totalFactures = facturesData.length;
        const enAttente = facturesData.filter(
          (f: Facture) => f.statut === 'EN_ATTENTE'
        ).length;
        const validees = facturesData.filter(
          (f: Facture) => f.statut === 'VALIDE'
        ).length;
        const rejetees = facturesData.filter(
          (f: Facture) => f.statut === 'REJETEE'
        ).length;
        const payees = facturesData.filter(
          (f: Facture) => f.statut === 'PAYEE'
        ).length;

        let totalTTC = 0;
        facturesData.forEach((f: Facture) => {
          totalTTC += Number(f.total_ttc || f.total_ht || 0);
        });

        setStats({
          total: totalFactures,
          en_attente: enAttente,
          validees,
          rejetees,
          payees,
          total_ttc: totalTTC,
        });

        appliquerFiltre(facturesData, statusFilter, searchTerm);
      } else {
        setError(data.message || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const appliquerFiltre = (
    data: Facture[],
    statut: string,
    recherche: string
  ) => {
    let filtered = data || factures;

    if (statut !== 'TOUS') {
      filtered = filtered.filter((f: Facture) => f.statut === statut);
    }

    if (recherche.trim() !== '') {
      const search = recherche.toLowerCase().trim();
      filtered = filtered.filter(
        (f: Facture) =>
          f.numero_facture.toLowerCase().includes(search) ||
          (f.client_nom || '').toLowerCase().includes(search) ||
          (f.commercial_nom || '').toLowerCase().includes(search) ||
          (f.commercial_prenom || '').toLowerCase().includes(search)
      );
    }

    setFilteredFactures(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchFactures();
  }, []);

  useEffect(() => {
    if (factures.length > 0) {
      appliquerFiltre(factures, statusFilter, searchTerm);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (factures.length > 0) {
      appliquerFiltre(factures, statusFilter, searchTerm);
    }
  }, [searchTerm]);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    const url = new URL(window.location.href);
    if (newStatus === 'TOUS') {
      url.searchParams.delete('status');
    } else {
      url.searchParams.set('status', newStatus);
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleValidate = async (
    id_facture: number,
    montant: number,
    modePaiement: string,
    nombreTranches: number
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/facture/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_facture,
          action: 'valider',
          montant_recu: montant,
          mode_paiement: modePaiement,
          nombre_tranches: nombreTranches,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchFactures();
        setShowValidationModal(false);
        setSelectedFacture(null);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la validation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id_facture: number, motif: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/facture/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_facture,
          action: 'rejeter',
          motif_rejet: motif,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchFactures();
        setShowValidationModal(false);
        setSelectedFacture(null);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors du rejet');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0 FC';
    return price.toLocaleString() + ' FC';
  };

 const getStatusBadge = (statut: string) => {
  // ✅ Normalisation : majuscules, sans accents
  const normalized = (statut || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const styles: Record<string, { color: string; label: string }> = {
    EN_ATTENTE: { color: 'bg-amber-100 text-amber-700', label: '⏳ En attente' },
    VALIDE: { color: 'bg-green-100 text-green-700', label: '✅ Validée' },
    REJETEE: { color: 'bg-red-100 text-red-700', label: '❌ Rejetée' },
    PAYEE: { color: 'bg-blue-100 text-blue-700', label: '💰 Payée' },
  };

  const style = styles[normalized] || {
    color: 'bg-gray-100 text-gray-700',
    label: statut || 'Inconnu',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.color}`}>
      {style.label}
    </span>
  );
};
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFactures.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentFactures = filteredFactures.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500">Chargement des factures...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <StatsCards stats={stats} formatPrice={formatPrice} />
        <FactureFilters
          statusFilter={statusFilter}
          setStatusFilter={handleStatusFilterChange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRefresh={fetchFactures}
          loading={loading}
        />
      </div>

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0 mt-4">
        <div className="flex-1 overflow-y-auto min-h-0">
          {currentFactures.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 font-bold text-lg">
                Aucune facture trouvée
              </p>
              <p className="text-gray-400 text-sm mt-1">
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
            <div className="divide-y divide-gray-100">
              {currentFactures.map((facture) => {
                const montantPaye = Number(facture.montant_paye || 0);
                const montantTotal = Number(
                  facture.total_ttc || facture.total_ht || 0
                );
                const montantRestant = montantTotal - montantPaye;
                const nomComplet =
                  `${facture.commercial_prenom || ''} ${
                    facture.commercial_nom || ''
                  }`.trim() || 'N/A';

                return (
                  <div
                    key={facture.id_facture}
                    className="p-4 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0 w-full lg:w-auto">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-base text-gray-800">
                            {facture.numero_facture}
                          </span>
                          {getStatusBadge(facture.statut)}
                          <span className="text-xs text-gray-400">
                            {formatDate(facture.created_at)}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                            <Building2
                              size={14}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="font-medium">Client:</span>
                            <span className="truncate font-semibold text-gray-800">
                              {facture.client_nom || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                            <User
                              size={14}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="font-medium">Commercial:</span>
                            <span className="truncate font-semibold text-gray-800">
                              {nomComplet}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                            <Calendar
                              size={14}
                              className="text-gray-400 flex-shrink-0"
                            />
                            <span className="font-medium">Échéance:</span>
                            <span className="truncate font-semibold text-gray-800">
                              {formatDate(facture.date_echeance)}
                            </span>
                          </div>
                        </div>

                        {facture.motif_rejet && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle size={14} />
                            <span>Motif de rejet: {facture.motif_rejet}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-shrink-0">
                        <div className="bg-gray-50 rounded-lg p-3 min-w-[120px] w-full sm:w-auto">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500">Total</p>
                              <p className="font-bold text-blue-600 text-sm">
                                {formatPrice(montantTotal)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Payé</p>
                              <p className="font-bold text-green-600 text-sm">
                                {formatPrice(montantPaye)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Reste</p>
                              <p
                                className={`font-bold text-sm ${
                                  montantRestant > 0
                                    ? 'text-orange-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {formatPrice(montantRestant)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  montantTotal > 0
                                    ? (montantPaye / montantTotal) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                          {/* Bouton Détails */}
                          <button
                            onClick={() => {
                              setSelectedFacture(facture);
                              setModalMode('details');
                              setShowValidationModal(true);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Détails</span>
                          </button>

                          {/* Bouton Valider */}
                          {facture.statut === 'EN_ATTENTE' && (
                            <button
                              onClick={() => {
                                setSelectedFacture(facture);
                                setModalMode('valider');
                                setShowValidationModal(true);
                              }}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Check size={14} />
                              <span className="hidden sm:inline">Valider</span>
                            </button>
                          )}

                          {/* Bouton Encaisser */}
                          {(facture.statut === 'VALIDE' ||
                            facture.statut === 'EN_ATTENTE') &&
                            montantRestant > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedFacture(facture);
                                  setModalMode('valider');
                                  setShowValidationModal(true);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                              >
                                <CreditCard size={14} />
                                <span className="hidden sm:inline">
                                  Encaisser
                                </span>
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 mt-4">
        <FacturePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredFactures.length}
          onPageChange={setCurrentPage}
        />
      </div>

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
    </div>
  );
}