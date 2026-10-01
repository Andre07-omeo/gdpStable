// src/app/dashboard/admin/types.ts

export interface DashboardStats {
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

export interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: string;
  commune: string;
  province: string;
  ville: string;
  created_at: string;
  updated_at: string;
  faces?: any[];
  nbFaces?: number;
}

export interface Reservation {
  id: string;
  societeLocatrice: string;
  panneau: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
}