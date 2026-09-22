// src/app/dashboard/comptable/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FileText, Clock, CheckCircle, XCircle, CreditCard, 
  DollarSign, TrendingUp, ArrowUp, ArrowDown, Calendar,
  Loader2, RefreshCw, Eye, Building2, User
} from 'lucide-react';

interface Facture {
  id_facture: number;
  numero_facture: string;
  client_nom: string;
  commercial_nom: string;
  commercial_prenom: string;
  statut: string;
  total_ttc: number;
  total_ht: number;
  montant_paye: number;
  created_at: string;
  date_echeance: string;
  motif_rejet?: string;
}

export default function ComptableDashboard() {
  const router = useRouter();
  const { getUserName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    validees: 0,
    rejetees: 0,
    payees: 0,
    total_ttc: 0,
    total_paye: 0,
    total_restant: 0
  });
  const [recentFactures, setRecentFactures] = useState<Facture[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/facture?limit=50', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        let factures: Facture[] = Array.isArray(data.data) ? data.data : [data.data].filter(Boolean);
        
        // ✅ Trier par date de création (plus récent d'abord)
        factures = factures.sort((a: Facture, b: Facture) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        // ✅ Récupérer les 5 dernières factures (48h)
        const now = new Date();
        const quaranteHuitHeures = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const factures48h = factures.filter((f: Facture) => {
          const dateCreation = new Date(f.created_at);
          return dateCreation >= quaranteHuitHeures;
        });
        
        setRecentFactures(factures48h.slice(0, 5));
        
        // Calculer les stats
        const totalFactures = factures.length;
        const enAttente = factures.filter((f: Facture) => f.statut === 'EN_ATTENTE').length;
        const validees = factures.filter((f: Facture) => f.statut === 'VALIDE').length;
        const rejetees = factures.filter((f: Facture) => f.statut === 'REJETEE').length;
        const payees = factures.filter((f: Facture) => f.statut === 'PAYEE').length;
        
        let totalTTC = 0;
        let totalPaye = 0;
        factures.forEach((f: Facture) => {
          const ttc = f.total_ttc || f.total_ht || 0;
          totalTTC += ttc;
          totalPaye += f.montant_paye || 0;
        });

        setStats({
          total: totalFactures,
          en_attente: enAttente,
          validees: validees,
          rejetees: rejetees,
          payees: payees,
          total_ttc: totalTTC,
          total_paye: totalPaye,
          total_restant: totalTTC - totalPaye
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0 FC';
    return price.toLocaleString() + ' FC';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statut: string) => {
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${style.color}`}>
      {style.label}
    </span>
  );
};

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
          <p className="text-sm text-gray-500">Vue d'ensemble de la comptabilité</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {/* Statistiques - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText size={18} className="text-gray-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 truncate">Total factures</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.en_attente}</p>
          <p className="text-xs text-amber-600 truncate">En attente</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-green-200 bg-green-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.validees}</p>
          <p className="text-xs text-green-600 truncate">Validées</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-red-200 bg-red-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <XCircle size={18} className="text-red-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.rejetees}</p>
          <p className="text-xs text-red-600 truncate">Rejetées</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-200 bg-blue-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.payees}</p>
          <p className="text-xs text-blue-600 truncate">Payées</p>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-purple-200 bg-purple-50 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={18} className="text-purple-600" />
          </div>
          <p className="text-base sm:text-lg font-bold text-purple-600 truncate">{formatPrice(stats.total_ttc)}</p>
          <p className="text-xs text-purple-600 truncate">Montant total</p>
        </div>
      </div>

      {/* Détails financiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Total encaissé</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(stats.total_paye)}</p>
          <p className="text-xs text-gray-400">{stats.payees} factures payées</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Reste à encaisser</p>
          <p className="text-2xl font-bold text-orange-600">{formatPrice(stats.total_restant)}</p>
          <p className="text-xs text-gray-400">{stats.en_attente + stats.validees} factures en attente</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500">Taux d'encaissement</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.total_ttc > 0 ? Math.round((stats.total_paye / stats.total_ttc) * 100) : 0}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.total_ttc > 0 ? (stats.total_paye / stats.total_ttc) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dernières factures (48h) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-gray-800">📋 Dernières factures (48h)</h3>
            <p className="text-xs text-gray-400">Factures émises dans les dernières 48 heures</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard/comptable/factures?status=TOUS')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Voir tout →
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {recentFactures.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Aucune facture récente</div>
          ) : (
            recentFactures.map((facture) => (
              <div key={facture.id_facture} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-50 transition gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{facture.numero_facture}</span>
                    {getStatusBadge(facture.statut)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Building2 size={14} className="text-gray-400" />
                      {facture.client_nom || 'Client'}
                    </span>
                    <span className="text-gray-300 hidden sm:inline">|</span>
                    <span className="flex items-center gap-1">
                      <User size={14} className="text-gray-400" />
                      {facture.commercial_nom || 'Commercial'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{formatPrice(facture.total_ttc || facture.total_ht || 0)}</p>
                    <p className="text-xs text-gray-400">{formatDate(facture.created_at)}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/comptable/factures?status=TOUS`)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

