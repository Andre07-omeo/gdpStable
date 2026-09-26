'use client';

// src/app/dashboard/comptable/paiements/page.tsxexport const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Loader2, CreditCard, Calendar, User, Building2, CheckCircle, XCircle, Search, Filter, DollarSign } from 'lucide-react';

interface Paiement {
  id_paiement: number;
  id_facture: number;
  numero_facture: string;
  client_nom: string;
  commercial_nom: string;
  commercial_prenom: string;
  montant: number;
  date_paiement: string;
  mode_paiement: string;
  statut: string;
  reference: string;
  notes?: string;
}

export default function ComptablePaiementsPage() {
  const [loading, setLoading] = useState(true);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('TOUS');

  useEffect(() => {
    const fetchPaiements = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        setPaiements([]);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPaiements();
  }, []);

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0 FC';
    return price.toLocaleString() + ' FC';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statut: string) => {
    const styles: Record<string, { color: string; label: string }> = {
      'paye': { color: 'bg-green-100 text-green-700', label: '✅ Payé' },
      'en_attente': { color: 'bg-amber-100 text-amber-700', label: '⏳ En attente' },
      'echoue': { color: 'bg-red-100 text-red-700', label: '❌ Échoué' },
    };
    const style = styles[statut] || styles['en_attente'];
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${style.color}`}>{style.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500">Chargement des paiements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des paiements</h1>
          <p className="text-sm text-gray-500">Suivre les paiements des clients</p>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500">Total encaissé</p>
          <p className="text-2xl font-bold text-green-600">{formatPrice(0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500">Nombre de paiements</p>
          <p className="text-2xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-200 bg-amber-50 shadow-sm">
          <p className="text-xs text-amber-600">En attente</p>
          <p className="text-2xl font-bold text-amber-600">0</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-purple-200 bg-purple-50 shadow-sm">
          <p className="text-xs text-purple-600">Taux de recouvrement</p>
          <p className="text-2xl font-bold text-purple-600">0%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Statut:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['TOUS', 'paye', 'en_attente', 'echoue'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatut(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                  filterStatut === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'TOUS' ? '📋 Tous' :
                 f === 'paye' ? '✅ Payés' :
                 f === 'en_attente' ? '⏳ En attente' :
                 '❌ Échoués'}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un paiement..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Liste scrollable des paiements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 480px)', minHeight: '300px' }}>
          {paiements.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💳</div>
              <p className="text-gray-500 font-bold text-lg">Aucun paiement enregistré</p>
              <p className="text-gray-400 text-sm mt-1">Les paiements apparaîtront ici une fois les factures encaissées</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paiements.map((paiement) => (
                <div key={paiement.id_paiement} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-sm text-gray-800">{paiement.numero_facture}</span>
                        {getStatusBadge(paiement.statut)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Building2 size={14} className="text-gray-400" />
                          {paiement.client_nom || 'Client'}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          {paiement.commercial_prenom || ''} {paiement.commercial_nom || 'Commercial'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatPrice(paiement.montant)}</p>
                        <p className="text-xs text-gray-400">{formatDate(paiement.date_paiement)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{paiement.mode_paiement || 'Comptant'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
