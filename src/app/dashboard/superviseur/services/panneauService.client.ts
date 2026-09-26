'use client';

// src/app/dashboard/superviseur/services/panneauService.client.tsimport { Panneau, ReservationWithDetails } from '../types/panneau.types';

// ✅ Service utilisant les API routes (qui utilisent les requêtes SQL brutes)
export class PanneauServiceClient {
  
  // Récupérer tous les panneaux
  static async getAllPanneaux(): Promise<Panneau[]> {
    try {
      const res = await fetch('/api/map-panneaux');
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des panneaux');
      }
      const data = await res.json();
      console.log('📊 Panneaux reçus:', data);
      return data;
    } catch (error) {
      console.error('Erreur getAllPanneaux:', error);
      throw error;
    }
  }

  // Récupérer les réservations d'un panneau
  static async getActiveReservationsForPanneau(panneauId: number): Promise<ReservationWithDetails[]> {
    try {
      const res = await fetch(`/api/superviseur/reservations?panneauId=${panneauId}`);
      if (!res.ok) {
        throw new Error('Erreur lors du chargement des réservations');
      }
      return await res.json();
    } catch (error) {
      console.error('Erreur getActiveReservationsForPanneau:', error);
      throw error;
    }
  }

  // Mettre à jour le statut d'une réservation
  static async updateReservationStatus(
    ligneId: number,
    nouveauStatut: string,
    photoFile?: File | null
  ): Promise<{ success: boolean; photoUrl?: string }> {
    try {
      const formData = new FormData();
      formData.append('ligneId', String(ligneId));
      formData.append('statut', nouveauStatut);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await fetch('/api/superviseur/reservations', {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const data = await res.json();
      return { success: true, photoUrl: data.photoUrl };
    } catch (error) {
      console.error('Erreur updateReservationStatus:', error);
      return { success: false };
    }
  }
}