// ============================================
// TYPES PANNEAU
// ============================================

export interface Panneau {
  id: string;
  idPan?: string;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  province: string;
  ville: string;
  commune?: string;
  type: string;
  dimension: string;
  nbFaces: number;
  faces: Face[];
  etat: 'Actif' | 'EnMaintenance' | 'Desactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Face {
  id?: string;
  sens: string;
  orientation: 'Nord' | 'Sud' | 'Est' | 'Ouest' | 'Indifferent';
  statut: 'Libre' | 'Occupe' | 'Reserve' | 'Maintenance';
  reservations: Reservation[];
  historique?: Historique[];
}

export interface Reservation {
  id: string;
  faceId: string;
  societeLocatrice: string;
  dateDebut: string;
  dateFin: string;
  statut: 'EnCours' | 'Future' | 'Terminee';
  agentNom?: string;
  agentId?: string;
}

export interface Historique {
  date: string;
  action: string;
  utilisateur: string;
}

export interface Statistiques {
  panneaux: number;
  faces: {
    total: number;
    libres: number;
    occupees: number;
    reservees: number;
    maintenance: number;
  };
  users: number;
  societes: number;
  reservations: {
    enCours: number;
    futures: number;
    passees: number;
  };
}