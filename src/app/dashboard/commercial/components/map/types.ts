// src/app/dashboard/commercial/components/map/types.ts

export interface FaceReservation {
  id_reservation: number;
  id_face: number;
  date_debut: string;
  date_fin: string;
  statut: string;
  numero_commande?: string;      // ✅ AJOUTÉ (utilisé dans ReservationCard)
  client_nom?: string;           // ✅ AJOUTÉ (utilisé dans ReservationCard)
  photoCampagneUrl?: string | null;
  photo_metadata?: string | null;
}

export interface FaceMap {
  id_face: number;
  id_panneau: number;
  id_type_face?: number;
  orientation: string;
  est_active: number;
  a_probleme: number;
  date_probleme?: string | null;
  raison_probleme?: string | null;
  type_face?: string;
  status?: 'Libre' | 'Occupé' | 'Réservé' | 'En attente' | 'Problème';
  reservations?: FaceReservation[];
  reservation?: FaceReservation | null;   // ✅ compatibilité ancien code
  date_debut?: string | null;
  date_fin?: string | null;
  remaining_time?: {
    expired: boolean;
    label: string;
    hours: number;
    minutes: number;
  } | null;
}

export interface PanneauMap {
  id_panneau: number;
  idPan?: string;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: 'Actif' | 'EnMaintenance' | 'Desactive' | 'En panne';
  etatPanneau?: string;
  a_probleme?: boolean;
  date_probleme?: string | null;
  raison_probleme?: string | null;
  faces: FaceMap[];
  commune?: string;
  province?: string;
  ville?: string;
}

// ✅ Réservation telle qu'affichée sur la carte / popup / liste
export interface ReservationMap {
  id_reservation: number;
  numero_commande: string;
  id_client?: number;
  client_nom?: string;
  id_commercial?: number;
  commercial_nom?: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  notes?: string | null;
  montant_total?: number | null;

  // Infos panneau / face (utiles pour popup + carte)
  id_panneau?: number;
  id_face?: number;
  panneau_nom?: string;
  panneau_adresse?: string;
  latitude?: number;
  longitude?: number;
  orientation?: string;
  type_face?: string;

  // Photo éventuelle
  photoCampagneUrl?: string | null;
  photo_metadata?: string | null;

  // Statut calculé pour l'affichage
  status?: 'Libre' | 'Occupé' | 'Réservé' | 'En attente' | 'Problème';
}

export type MarkerColor = 
  | 'red'      // Panneau en panne
  | 'yellow'   // Toutes faces occupées, sans image
  | 'blue'     // Toutes faces occupées, avec image
  | 'green'    // Faces libres
  | 'gray';    // Aucune face

export type MarkerStatus = 'Libre' | 'Occupé' | 'Réservé' | 'En attente' | 'Problème';