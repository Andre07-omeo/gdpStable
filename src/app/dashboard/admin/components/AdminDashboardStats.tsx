'use client';

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, MapPin, Users, Calendar, Layers, TrendingUp, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/shared/StatCard';

interface DashboardStats {
  totalPanneaux: number;
  totalFaces: number;
  facesLibres: number;
  facesOccupees: number;
  facesReservees: number;
  totalUsers: number;
  totalClients: number;
  totalReservations: number;
  reservationsEnCours: number;
  reservationsFutures: number;
  reservationsPassees: number;
  totalRevenue: number;
  tauxOccupation: number;
}

interface AdminDashboardStatsProps {
  stats?: DashboardStats;
  loading?: boolean;
}

export function AdminDashboardStats({ stats: propStats, loading = false }: AdminDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPanneaux: 0,
    totalFaces: 0,
    facesLibres: 0,
    facesOccupees: 0,
    facesReservees: 0,
    totalUsers: 0,
    totalClients: 0,
    totalReservations: 0,
    reservationsEnCours: 0,
    reservationsFutures: 0,
    reservationsPassees: 0,
    totalRevenue: 0,
    tauxOccupation: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propStats) {
      console.log('📊 Stats reçues en props:', propStats);
      setStats(propStats);
      setIsLoading(false);
      return;
    }

    const loadStats = async () => {
      console.log('📊 Chargement des statistiques...');
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/stats');
        console.log('📊 Réponse API:', res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Données reçues:', data);
          setStats(data);
        } else {
          const errorData = await res.json();
          console.error('❌ Erreur API:', errorData);
          setError(errorData.error || 'Erreur de chargement');
        }
      } catch (error) {
        console.error('❌ Erreur:', error);
        setError('Erreur de connexion');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [propStats]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">❌ Erreur: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (isLoading || loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  console.log('📊 Affichage des stats:', stats);

  const cards = [
    { 
      label: 'Panneaux', 
      value: stats.totalPanneaux, 
      icon: <LayoutDashboard size={20} />, 
      color: 'blue' as const,
      subtitle: stats.facesOccupees + ' faces occupées'
    },
    { 
      label: 'Faces', 
      value: stats.totalFaces, 
      icon: <Layers size={20} />, 
      color: 'indigo' as const 
    },
    { 
      label: 'Libres', 
      value: stats.facesLibres, 
      icon: <CheckCircle2 size={20} />, 
      color: 'emerald' as const 
    },
    { 
      label: 'Occupées', 
      value: stats.facesOccupees, 
      icon: <Users size={20} />, 
      color: 'blue' as const 
    },
    { 
      label: 'Réservées', 
      value: stats.facesReservees, 
      icon: <Calendar size={20} />, 
      color: 'amber' as const 
    },
    { 
      label: 'Utilisateurs', 
      value: stats.totalUsers, 
      icon: <Users size={20} />, 
      color: 'purple' as const 
    },
    { 
      label: 'Réservations', 
      value: stats.totalReservations, 
      icon: <Calendar size={20} />, 
      color: 'cyan' as const,
      subtitle: stats.reservationsEnCours + ' en cours'
    },
    { 
      label: 'Taux occupation', 
      value: stats.tauxOccupation + '%', 
      icon: <TrendingUp size={20} />, 
      color: 'emerald' as const 
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="flex flex-col">
            <StatCard
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
            {card.subtitle && (
              <p className="text-xs text-gray-500 mt-1 text-center">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            Répartition des faces
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Libres</span>
              <div className="flex-1 mx-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: stats.totalFaces > 0 ? ((stats.facesLibres / stats.totalFaces) * 100) + '%' : '0%' }} />
              </div>
              <span className="text-sm font-bold text-emerald-600">{stats.facesLibres}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Occupées</span>
              <div className="flex-1 mx-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: stats.totalFaces > 0 ? ((stats.facesOccupees / stats.totalFaces) * 100) + '%' : '0%' }} />
              </div>
              <span className="text-sm font-bold text-blue-600">{stats.facesOccupees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Réservées</span>
              <div className="flex-1 mx-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: stats.totalFaces > 0 ? ((stats.facesReservees / stats.totalFaces) * 100) + '%' : '0%' }} />
              </div>
              <span className="text-sm font-bold text-amber-600">{stats.facesReservees}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Réservations
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{stats.reservationsEnCours}</p>
              <p className="text-xs text-gray-500">En cours</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-2xl font-bold text-amber-600">{stats.reservationsFutures}</p>
              <p className="text-xs text-gray-500">Futures</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-gray-600">{stats.reservationsPassees}</p>
              <p className="text-xs text-gray-500">Passées</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PieChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      <path d="M12 3v9l7 4" />
    </svg>
  );
}