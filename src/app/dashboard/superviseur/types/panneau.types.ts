// src/app/dashboard/superviseur/types/panneau.types.ts

export interface Panneau {
  id_panneau: number;
  idPan?: string;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: 'Actif' | 'Inactif' | 'En panne';
  type?: string;
  dimension?: string;
  nbFaces?: number;
  commune: string;
  province: string;
  ville: string;
  created_at: string;
  updated_at: string;
  faces?: Face[];
  // ✅ AJOUTÉS pour la gestion des problèmes
  raison_probleme?: string | null;
  date_probleme?: string | null;
}

export interface Face {
  id_face: number;
  id_panneau: number;
  id_type_face: number;
  orientation: string;
  est_active: boolean;
  created_at: string;
  updated_at: string;
  type_libelle?: string;
  hauteur_cm?: number;
  largeur_cm?: number;
  est_scroller?: boolean;
  type_face?: TypeFace;
  reservations?: LigneReservation[];
  // ✅ AJOUTÉS pour la gestion des problèmes
  a_probleme?: boolean;
  raison_probleme?: string | null;
  date_probleme?: string | null;
}

export interface TypeFace {
  id_type_face: number;
  libelle: string;
  hauteur_cm: number;
  largeur_cm: number;
  est_scroller: boolean;
}

export interface LigneReservation {
  id_ligne: number;
  id_reservation: number;
  id_face: number;
  date_debut: string;
  date_fin: string;
  prix_vente_net: number;
  statut_diffusion: 'Diffusée' | 'En attente' | 'Terminée' | 'Annulée';
  created_at: string;
  updated_at: string;
  photo_campagne_url?: string;
  reservation?: Reservation;
}

export interface Reservation {
  id_reservation: number;
  id_client: number;
  id_commercial: number;
  numero_commande: string;
  date_creation: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: 'Confirmée' | 'En attente' | 'Annulée' | 'Terminée';
  client_nom?: string;
  commercial_nom?: string;
}

export interface ReservationWithDetails extends LigneReservation {
  panneau_id: number;
  panneau_idPan: string;
  panneau_adresse: string;
  face_orientation: string;
  client_nom: string;
  commercial_nom: string;
  joursRestants: number;
  estEnCours: boolean;
  photo_campagne_url?: string;
}