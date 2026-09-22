// src/app/dashboard/commercial/types/commercial.types.ts

// ============================================
// TYPES COMMERCIAUX
// ============================================

export type Profil =
  | 'SUPER_ADMIN'
  | 'ADMIN_SYSTEM'
  | 'DG'
  | 'PDG'
  | 'CHEF_COMMERCIAL'
  | 'COMMERCIAL'
  | 'SUPERVISEUR'
  | 'CAISSIER'
  | 'COMPTABLE';

export interface UserFeatures {
  canManageAgents: boolean;
  canValidateReservations: boolean;
  canViewReports: boolean;
  canViewPredictions: boolean;
  canManagePanneaux: boolean;
  canViewAllStats: boolean;
  canExportReports: boolean;
  canManageTeam: boolean;
  canModifyReservations: boolean;
}

// ============================================
// ✅ FONCTION : FEATURES PAR PROFIL (CORRIGÉE)
// ============================================
export const getFeaturesByProfil = (profil?: string | null): UserFeatures => {
  const baseFeatures: UserFeatures = {
    canManageAgents: false,
    canValidateReservations: false,
    canViewReports: false,
    canViewPredictions: false,
    canManagePanneaux: false,
    canViewAllStats: false,
    canExportReports: false,
    canManageTeam: false,
    canModifyReservations: false,
  };

  switch (profil || '') {
    case 'SUPER_ADMIN':
    case 'ADMIN_SYSTEM':
      return {
        ...baseFeatures,
        canManageAgents: true,
        canValidateReservations: true,
        canViewReports: true,
        canViewPredictions: true,
        canManagePanneaux: true,
        canViewAllStats: true,
        canExportReports: true,
        canManageTeam: true,
        canModifyReservations: true,
      };

    case 'DG':
    case 'PDG':
      return {
        ...baseFeatures,
        canViewReports: true,
        canViewPredictions: true,
        canViewAllStats: true,
        canExportReports: true,
        canValidateReservations: true,
        canManageTeam: true,           // ✅ Ajouté
        canModifyReservations: false,
      };

    case 'CHEF_COMMERCIAL':
      return {
        ...baseFeatures,
        canManageAgents: true,
        canValidateReservations: true,
        canViewReports: true,
        canExportReports: true,
        canManageTeam: true,           // ✅
        canModifyReservations: true,
        canViewAllStats: true,
      };

    case 'COMMERCIAL':
      return {
        ...baseFeatures,
        canManageTeam: false,           // ✅ CORRIGÉ : Le commercial gère son équipe
        canViewReports: false,
        canExportReports: false,
        canModifyReservations: false,
        canValidateReservations: false,
      };

    case 'SUPERVISEUR':
      return {
        ...baseFeatures,
        canViewReports: true,
        canViewAllStats: true,
        canManagePanneaux: true,
      };

    case 'CAISSIER':
      return {
        ...baseFeatures,
        canViewReports: false,
        canManageAgents: false,
      };

    case 'COMPTABLE':
      return {
        ...baseFeatures,
        canViewReports: true,
        canViewAllStats: true,
      };

    default:
      return baseFeatures;
  }
};

// ============================================
// INTERFACE FACE - Correspond à la BD
// ============================================
export interface Face {
  id: string;
  id_face: number;
  id_panneau?: number;
  id_type_face?: number;
  libelle?: string;
  orientation: string;
  sens?: string;
  hauteur?: number;
  largeur?: number;
  hauteur_cm?: number;
  largeur_cm?: number;
  est_active?: number;
  a_probleme?: number;
  date_probleme?: string;
  raison_probleme?: string;
  created_at?: string;
  updated_at?: string;
  type_face?: {
    id_type_face: number;
    libelle: string;
    hauteur_cm: number;
    largeur_cm: number;
    est_scroller: number;
  };
  type_face_libelle?: string;      // ✅ Ajouté
  reservations?: Reservation[];
  societeLocatrice?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  statut?: 'Libre' | 'Occupé' | 'Réservé';
  reservationsFutures?: number;
  prochaineReservation?: string | null;
  statutPaiement?: string;
}

// ============================================
// INTERFACE PANNEAU - Correspond à la BD
// ============================================
export interface Panneau {
  id: string;
  idPan: string;
  id_panneau?: number;
  nom: string;
  adresse: string;
  type?: string;
  dimension?: string;
  etat?: string;
  etatPanneau?: string;
  latitude?: number;
  longitude?: number;
  coords?: { lat: number; lng: number };
  gps_raw?: { lat: number; lng: number };
  precision_gps?: number;
  commune?: string;
  province?: string;
  ville?: string;
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
  commune_id?: number;
  faces: Face[];
  reservations?: Reservation[];
  historique?: any[];
  nbFaces?: number;
  created_at?: string;
  updated_at?: string;
  date_creation?: string;
  dateModification?: string;
  createdAt?: string;
  updatedAt?: string;
  created_by?: number;
}

// ============================================
// INTERFACE COMMERCIAL (pour l'API)
// ============================================
export interface CommercialPanneau {
  id: string;
  nom: string;
  adresse: string;
  idPan: string;
  type: string;
  dimension: string;
  etatPanneau: string;
  faces: CommercialFace[];
}

export interface CommercialFace {
  id_face: string | number;
  id_panneau: string | number;
  id_type_face: string | number;
  orientation: string;
  est_active: number;
  a_probleme: number;
  date_probleme: string | null;
  raison_probleme: string | null;
  type_face: string;
  status: 'Libre' | 'Occupé' | 'Réservé' | 'En attente' | 'Problème';
  reservation: CommercialReservation | null;
  reservation_active: CommercialReservation | null;
  reservation_future: CommercialReservation | null;
  reservation_attente: CommercialReservation | null;
  reservations: CommercialReservation[];
  client_nom: string | null;
  client_prenom: string | null;
  commercial_nom: string | null;
  commercial_prenom: string | null;
  date_debut: string | null;
  date_fin: string | null;
  remaining_time: {
    expired: boolean;
    label: string;
    hours: number;
    minutes: number;
  } | null;
}

export interface CommercialReservation {
  id_reservation: string | number;
  id_client: string | number | null;
  id_commercial: string | number | null;
  numero_commande: string;
  date_creation: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: string;
  est_verrouille: number;
  date_expiration: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  client_email: string | null;
  client_telephone: string | null;
  commercial_nom: string | null;
  commercial_prenom: string | null;
  commercial_email: string | null;
}

export interface CommercialPanneauxResponse {
  success: boolean;
  data: CommercialPanneau[];
  total: number;
  timestamp: string;
}

// ============================================
// INTERFACE RESERVATION
// ============================================
export interface Reservation {
  id?: string;
  id_reservation?: number;
  id_ligne?: number;
  id_face?: number;
  id_client?: number;
  id_commercial?: number;
  id_chef_validation?: number;
  numero_commande?: string;
  resUniqueId?: string;
  societeLocatrice: string;
  client_nom?: string;
  raison_sociale?: string;
  agentEmail?: string;
  agentNom?: string;
  commercial?: string;
  commercial_nom?: string;
  dateDebut: string;
  dateFin: string;
  date_creation?: string;
  date_debut_campagne?: string;
  date_fin_campagne?: string;
  createdAt?: string;
  dateModification?: string;
  dateValidationComptable?: string;
  statut: string;
  statut_diffusion?: string;
  statutPaiement?: string;
  validationComptable?: boolean;
  est_verrouille?: number;
  date_verrouillage?: string;
  montant?: number;
  prix_vente_net?: number;
  modePaiement?: string;
  nombreTranches?: number;
  facturee?: string;
  face?: string;
  faceLabel?: string;
  panneauId?: string;
  panneauIdPan?: string;
  panneauAdresse?: string;
  panneauType?: string;
  orientation?: string;
  photoCampagneUrl?: string;
  dureeMois?: number;
  notes?: string;
}

// ============================================
// INTERFACE STATS
// ============================================
export interface Stats {
  totalPanneaux: number;
  totalFaces: number;
  totalLibres: number;
  totalOccupes: number;
  totalReserves: number;
  totalReservationsFutures: number;
  totalRevenue: number;
}

export interface GeoFilter {
  pays: string;
  province: string;
  district: string;
  commune: string;
}

export interface DateFilter {
  startDate: string;
  endDate: string;
}

export interface TypeFace {
  id_type_face: number;
  libelle: string;
  hauteur_cm: number;
  largeur_cm: number;
  est_scroller: number;
  created_at?: string;
}

export interface Client {
  id_client: number;
  raison_sociale: string;
  siret?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  telephone?: string;
  email_facturation?: string;
  province?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LigneReservation {
  id_ligne: number;
  id_reservation: number;
  id_face: number;
  date_debut: string;
  date_fin: string;
  prix_vente_net: number;
  statut_diffusion: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// INTERFACE MEMBRE D'ÉQUIPE
// ============================================
export interface TeamMember {
  id_user: number;
  id_profil: number;
  id_manager?: number | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sexe: string;
  fonction: string;
  departement: string;
  actif: number;
  derniere_connexion: string | null;
  zone_travail: string | null;
  zone_niveau: string;
  created_at: string;
  profil_code: string;
  profil_libelle: string;
  niveauHierarchique: number;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

export const getFaceStatus = (face: Face): 'Libre' | 'Occupé' | 'Réservé' => {
  if (face.statut) return face.statut;

  const activeReservation = face.reservations?.find((r) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!r.dateDebut || !r.dateFin) return false;
    const debut = new Date(r.dateDebut);
    const fin = new Date(r.dateFin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return today >= debut && today <= fin && r.statut !== 'Expirée';
  });

  if (activeReservation) return 'Occupé';

  const futureReservation = face.reservations?.find((r) => {
    if (!r.dateDebut) return false;
    const debut = new Date(r.dateDebut);
    debut.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return debut > today && r.statut !== 'Expirée';
  });

  if (futureReservation) return 'Réservé';

  return 'Libre';
};

export const getFaceDimensionM2 = (face: Face): string => {
  const hauteur = face.hauteur || face.hauteur_cm || 0;
  const largeur = face.largeur || face.largeur_cm || 0;

  if (hauteur > 0 && largeur > 0) {
    const m2 = (hauteur * largeur) / 10000;
    return m2.toFixed(2) + ' m²';
  }
  return 'N/A';
};

export const getReservationCommercial = (reservation: Reservation): string => {
  if (!reservation) return '-';
  return (
    reservation.commercial_nom ||
    reservation.commercial ||
    reservation.agentNom ||
    'Commercial inconnu'
  );
};

export const getReservationStatus = (reservation: Reservation): string => {
  if (!reservation) return 'Aucune';
  return reservation.statut || reservation.statut_diffusion || 'En attente';
};

export const getReservationClient = (reservation: Reservation): string => {
  if (!reservation) return 'S/N';
  return (
    reservation.societeLocatrice ||
    reservation.client_nom ||
    reservation.raison_sociale ||
    'S/N'
  );
};