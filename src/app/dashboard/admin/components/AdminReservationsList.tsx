'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface Reservation {
  id: string;
  societeLocatrice: string;
  panneau: string;
  panneauId: string;
  faceId: string;
  dateDebut: string;
  dateFin: string;
  prix: number;
  statut: string;
  statutPaiement: string;
  validationComptable: boolean;
  agentNom?: string;
  agentEmail?: string;
  createdAt: string;
}

interface AdminReservationsListProps {
  panneaux?: any[];
}

export function AdminReservationsList({ panneaux = [] }: AdminReservationsListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enCours');

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/reservations');
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Réservations reçues:', data);
          
          // Transformer les données pour s'assurer que les dates sont valides
          const formattedData = data.map((r: any) => ({
            ...r,
            dateDebut: r.dateDebut ? new Date(r.dateDebut).toISOString().split('T')[0] : '',
            dateFin: r.dateFin ? new Date(r.dateFin).toISOString().split('T')[0] : ''
          }));
          
          console.log('📊 Réservations formatées:', formattedData);
          setReservations(formattedData);
        }
      } catch (error) {
        console.error('Erreur chargement réservations:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReservations();
  }, []);

  // Fonction pour comparer les dates correctement
  const compareDates = (dateStr: string, referenceDate: Date): number => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    referenceDate.setHours(0, 0, 0, 0);
    
    if (d.getTime() === referenceDate.getTime()) return 0;
    if (d < referenceDate) return -1;
    return 1;
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filtrer les réservations
  const enCours = reservations.filter(r => {
    if (!r.dateDebut || !r.dateFin) return false;
    const debut = new Date(r.dateDebut);
    const fin = new Date(r.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return now >= debut && now <= fin;
  });

  const futures = reservations.filter(r => {
    if (!r.dateDebut) return false;
    const debut = new Date(r.dateDebut);
    debut.setHours(0, 0, 0, 0);
    return now < debut;
  });

  const passees = reservations.filter(r => {
    if (!r.dateFin) return false;
    const fin = new Date(r.dateFin);
    fin.setHours(0, 0, 0, 0);
    return now > fin;
  });

  console.log('📊 En cours:', enCours.length, 'Futures:', futures.length, 'Passées:', passees.length);

  const tabs = [
    { id: 'enCours', label: 'En cours', count: enCours.length, icon: Clock },
    { id: 'futures', label: 'Futures', count: futures.length, icon: Calendar },
    { id: 'passees', label: 'Passées', count: passees.length, icon: CheckCircle2 },
  ];

  const getData = () => {
    if (activeTab === 'enCours') return enCours;
    if (activeTab === 'futures') return futures;
    return passees;
  };

  const data = getData();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des réservations...</p>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Réservations</h2>
            <p className="text-sm text-gray-500">Suivi des locations</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <p className="text-2xl font-bold text-emerald-600">0</p>
            <p className="text-xs text-gray-500">En cours</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
            <p className="text-2xl font-bold text-amber-600">0</p>
            <p className="text-xs text-gray-500">Futures</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-600">0</p>
            <p className="text-xs text-gray-500">Passées</p>
          </div>
        </div>
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Calendar size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune réservation trouvée</p>
          <p className="text-sm text-gray-400 mt-1">Vérifiez que des réservations existent dans la base de données</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Réservations</h2>
          <p className="text-sm text-gray-500">Suivi des locations</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
          <p className="text-2xl font-bold text-emerald-600">{enCours.length}</p>
          <p className="text-xs text-gray-500">En cours</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
          <p className="text-2xl font-bold text-amber-600">{futures.length}</p>
          <p className="text-xs text-gray-500">Futures</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
          <p className="text-2xl font-bold text-gray-600">{passees.length}</p>
          <p className="text-xs text-gray-500">Passées</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ' + (
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className={'px-2 py-0.5 rounded-full text-xs ' + (
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste des réservations */}
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Calendar size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune réservation dans cette catégorie</p>
          </div>
        ) : (
          data.map((res: Reservation, idx: number) => {
            const statusClass = activeTab === 'enCours'
              ? 'bg-emerald-100 text-emerald-700'
              : activeTab === 'futures'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600';

            const statusLabel = activeTab === 'enCours'
              ? 'En cours'
              : activeTab === 'futures'
              ? 'À venir'
              : 'Terminée';

            return (
              <motion.div
                key={res.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {res.societeLocatrice || 'Société inconnue'}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <MapPin size={14} />
                      {res.panneau} - Face {res.faceId}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Calendar size={14} />
                      {res.dateDebut ? new Date(res.dateDebut).toLocaleDateString('fr-FR') : 'N/A'} → {res.dateFin ? new Date(res.dateFin).toLocaleDateString('fr-FR') : 'N/A'}
                    </p>
                    {res.prix > 0 && (
                      <p className="text-sm font-bold text-blue-600">
                        {res.prix.toLocaleString()} $
                      </p>
                    )}
                    {res.agentNom && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={12} />
                        Agent: {res.agentNom}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={'px-3 py-1 rounded-full text-xs font-bold ' + statusClass}>
                      {statusLabel}
                    </span>
                    <span className={'px-2 py-0.5 rounded-full text-xs ' + (
                      res.statutPaiement === 'Payé' ? 'bg-green-100 text-green-700' :
                      res.statutPaiement === 'En attente' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {res.statutPaiement || 'En attente'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
