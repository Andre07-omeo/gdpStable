// src/types/panneau.ts
export interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  province: string;
  ville: string;
  nb_faces: number;
  etat: string;
}