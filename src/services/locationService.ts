// ============================================
// SERVICE - LOCALISATIONS
// ============================================

import { prisma } from '@/lib/db';

export class LocationService {
  static async getPays() {
    try {
      return await prisma.pays.findMany({
        orderBy: {
          nom: 'asc'
        }
      });
    } catch (error) {
      console.error('Erreur LocationService.getPays:', error);
      throw error;
    }
  }

  static async getProvinces(paysId?: number) {
    try {
      const where = paysId ? { pays_id: paysId } : {};
      return await prisma.province.findMany({
        where,
        orderBy: {
          nom: 'asc'
        }
      });
    } catch (error) {
      console.error('Erreur LocationService.getProvinces:', error);
      throw error;
    }
  }

  static async getVilles(provinceId?: number) {
    try {
      const where = provinceId ? { province_id: provinceId } : {};
      return await prisma.ville.findMany({
        where,
        orderBy: {
          nom: 'asc'
        }
      });
    } catch (error) {
      console.error('Erreur LocationService.getVilles:', error);
      throw error;
    }
  }

  static async getCommunes(villeId?: number) {
    try {
      const where = villeId ? { ville_id: villeId } : {};
      return await prisma.commune.findMany({
        where,
        orderBy: {
          nom: 'asc'
        }
      });
    } catch (error) {
      console.error('Erreur LocationService.getCommunes:', error);
      throw error;
    }
  }
}