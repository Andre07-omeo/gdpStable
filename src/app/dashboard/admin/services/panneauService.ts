// ============================================
// SERVICE PANNEAU - LOGIQUE MÉTIER
// ============================================

import { prisma } from '@/lib/db';
import { Panneau, Face, Statistiques } from '../types/panneau';

export class PanneauService {
  // Récupérer tous les panneaux
  static async getAll(): Promise<Panneau[]> {
    try {
      const panneaux = await prisma.panneau.findMany({
        include: {
          faces: {
            include: {
              typeFace: true, // ✅ Correction : type_face → typeFace
              ligneReservations: {
                include: {
                  reservation: {
                    include: {
                      client: true,
                      commercial: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          nom: 'asc'
        }
      });

      return panneaux.map((p: any) => ({
        id: p.id_panneau.toString(),
        idPan: p.id_panneau.toString(),
        nom: p.nom || 'Sans nom',
        adresse: p.adresse || 'Adresse non définie',
        latitude: p.latitude ? Number(p.latitude) : 0,
        longitude: p.longitude ? Number(p.longitude) : 0,
        province: p.province || '',
        ville: p.ville || '',
        commune: p.commune || '',
        type: 'Standard',
        dimension: '',
        nbFaces: p.faces?.length || 0,
        etat: (p.etat as 'Actif' | 'EnMaintenance' | 'Desactive') || 'Actif',
        faces: (p.faces || []).map((f: any) => ({
          id: f.id_face?.toString() || '',
          sens: f.orientation || 'Indéfini',
          orientation: f.orientation || 'Indifferent',
          statut: 'Libre',
          reservations: (f.ligneReservations || []).map((lr: any) => ({
            id: lr.id_reservation?.toString() || '',
            client: lr.reservation?.client?.raison_sociale || 'Client inconnu',
            commercial: lr.reservation?.commercial?.nom 
              ? `${lr.reservation.commercial.prenom || ''} ${lr.reservation.commercial.nom}`.trim() 
              : 'Commercial inconnu',
            date_debut: lr.date_debut,
            date_fin: lr.date_fin,
            statut: lr.reservation?.statut || 'En attente'
          }))
        })),
        createdAt: p.created_at || new Date(),
        updatedAt: p.updated_at || new Date()
      }));
    } catch (error) {
      console.error('❌ Erreur PanneauService.getAll:', error);
      throw error;
    }
  }

  // Récupérer un panneau par ID
  static async getById(id: string): Promise<Panneau | null> {
    try {
      const panneau = await prisma.panneau.findUnique({
        where: { id_panneau: parseInt(id) },
        include: {
          faces: {
            include: {
              typeFace: true, // ✅ Correction : type_face → typeFace
              ligneReservations: {
                include: {
                  reservation: {
                    include: {
                      client: true,
                      commercial: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!panneau) return null;

      return {
        id: panneau.id_panneau.toString(),
        idPan: panneau.id_panneau.toString(),
        nom: panneau.nom || 'Sans nom',
        adresse: panneau.adresse || 'Adresse non définie',
        latitude: panneau.latitude ? Number(panneau.latitude) : 0,
        longitude: panneau.longitude ? Number(panneau.longitude) : 0,
        province: panneau.province || '',
        ville: panneau.ville || '',
        commune: panneau.commune || '',
        type: 'Standard',
        dimension: '',
        nbFaces: panneau.faces?.length || 0,
        etat: (panneau.etat as 'Actif' | 'EnMaintenance' | 'Desactive') || 'Actif',
        faces: (panneau.faces || []).map((f: any) => ({
          id: f.id_face?.toString() || '',
          sens: f.orientation || 'Indéfini',
          orientation: f.orientation || 'Indifferent',
          statut: 'Libre',
          reservations: (f.ligneReservations || []).map((lr: any) => ({
            id: lr.id_reservation?.toString() || '',
            client: lr.reservation?.client?.raison_sociale || 'Client inconnu',
            commercial: lr.reservation?.commercial?.nom 
              ? `${lr.reservation.commercial.prenom || ''} ${lr.reservation.commercial.nom}`.trim() 
              : 'Commercial inconnu',
            date_debut: lr.date_debut,
            date_fin: lr.date_fin,
            statut: lr.reservation?.statut || 'En attente'
          }))
        })),
        createdAt: panneau.created_at || new Date(),
        updatedAt: panneau.updated_at || new Date()
      };
    } catch (error) {
      console.error('❌ Erreur PanneauService.getById:', error);
      throw error;
    }
  }

  // Récupérer les panneaux par commercial
  static async getByCommercial(commercialId: string): Promise<Panneau[]> {
    try {
      const panneaux = await prisma.panneau.findMany({
        where: {
          faces: {
            some: {
              ligneReservations: {
                some: {
                  reservation: {
                    id_commercial: parseInt(commercialId)
                  }
                }
              }
            }
          }
        },
        include: {
          faces: {
            include: {
              typeFace: true, // ✅ Correction : type_face → typeFace
              ligneReservations: {
                include: {
                  reservation: {
                    include: {
                      client: true,
                      commercial: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          nom: 'asc'
        }
      });

      return panneaux.map((p: any) => ({
        id: p.id_panneau.toString(),
        idPan: p.id_panneau.toString(),
        nom: p.nom || 'Sans nom',
        adresse: p.adresse || 'Adresse non définie',
        latitude: p.latitude ? Number(p.latitude) : 0,
        longitude: p.longitude ? Number(p.longitude) : 0,
        province: p.province || '',
        ville: p.ville || '',
        commune: p.commune || '',
        type: 'Standard',
        dimension: '',
        nbFaces: p.faces?.length || 0,
        etat: (p.etat as 'Actif' | 'EnMaintenance' | 'Desactive') || 'Actif',
        faces: (p.faces || []).map((f: any) => ({
          id: f.id_face?.toString() || '',
          sens: f.orientation || 'Indéfini',
          orientation: f.orientation || 'Indifferent',
          statut: 'Libre',
          reservations: (f.ligneReservations || []).map((lr: any) => ({
            id: lr.id_reservation?.toString() || '',
            client: lr.reservation?.client?.raison_sociale || 'Client inconnu',
            commercial: lr.reservation?.commercial?.nom 
              ? `${lr.reservation.commercial.prenom || ''} ${lr.reservation.commercial.nom}`.trim() 
              : 'Commercial inconnu',
            date_debut: lr.date_debut,
            date_fin: lr.date_fin,
            statut: lr.reservation?.statut || 'En attente'
          }))
        })),
        createdAt: p.created_at || new Date(),
        updatedAt: p.updated_at || new Date()
      }));
    } catch (error) {
      console.error('❌ Erreur PanneauService.getByCommercial:', error);
      throw error;
    }
  }

  // Créer un panneau
  static async create(data: any): Promise<Panneau> {
    try {
      const panneau = await prisma.panneau.create({
        data: {
          nom: data.nom || `PAN-${Date.now()}`,
          adresse: data.adresse || 'Adresse non définie',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          province: data.province || '',
          ville: data.ville || '',
          commune: data.commune || null,
          etat: 'Actif',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Créer les faces si spécifiées
      if (data.faces && data.faces.length > 0) {
        for (const faceData of data.faces) {
          await prisma.face.create({
            data: {
              id_panneau: panneau.id_panneau,
              id_type_face: faceData.id_type_face || 1,
              orientation: faceData.orientation || 'Indifferent',
              est_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }

      return (await this.getById(panneau.id_panneau.toString())) as Panneau;
    } catch (error) {
      console.error('❌ Erreur PanneauService.create:', error);
      throw error;
    }
  }

  // Mettre à jour un panneau
  static async update(id: string, data: any): Promise<Panneau> {
    try {
      await prisma.panneau.update({
        where: { id_panneau: parseInt(id) },
        data: {
          nom: data.nom,
          adresse: data.adresse,
          latitude: data.latitude,
          longitude: data.longitude,
          province: data.province,
          ville: data.ville,
          commune: data.commune || null,
          updated_at: new Date()
        }
      });

      return (await this.getById(id)) as Panneau;
    } catch (error) {
      console.error('❌ Erreur PanneauService.update:', error);
      throw error;
    }
  }

  // Supprimer un panneau
  static async delete(id: string): Promise<void> {
    try {
      // Vérifier si le panneau existe
      const panneau = await prisma.panneau.findUnique({
        where: { id_panneau: parseInt(id) },
        include: {
          faces: {
            include: {
              ligneReservations: true
            }
          }
        }
      });

      if (!panneau) {
        throw new Error(`Panneau avec l'ID ${id} non trouvé`);
      }

      // Supprimer les faces et leurs réservations associées
      for (const face of panneau.faces) {
        // Supprimer les lignes de réservation associées
        if (face.ligneReservations.length > 0) {
          await prisma.ligneReservation.deleteMany({
            where: { id_face: face.id_face }
          });
        }
        // Supprimer la face
        await prisma.face.delete({
          where: { id_face: face.id_face }
        });
      }

      // Supprimer le panneau
      await prisma.panneau.delete({
        where: { id_panneau: parseInt(id) }
      });
    } catch (error) {
      console.error('❌ Erreur PanneauService.delete:', error);
      throw error;
    }
  }

  // Obtenir les statistiques
  static async getStats(): Promise<Statistiques> {
    try {
      const [panneaux, users, reservations] = await Promise.all([
        prisma.panneau.findMany({
          include: {
            faces: {
              include: {
                ligneReservations: {
                  include: {
                    reservation: true
                  }
                }
              }
            }
          }
        }),
        prisma.user.findMany(),
        prisma.reservation.findMany({
          where: {
            statut: {
              in: ['Confirmée', 'En cours', 'En attente']
            }
          }
        })
      ]);

      let totalFaces = 0;
      let facesLibres = 0;
      let facesOccupees = 0;
      let facesReservees = 0;
      let facesMaintenance = 0;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      panneaux.forEach((p: any) => {
        const faces = p.faces || [];
        totalFaces += faces.length;

        faces.forEach((face: any) => {
          const ligneReservations = face.ligneReservations || [];
          
          // Trouver la réservation active
          const activeRes = ligneReservations.find((lr: any) => {
            if (!lr.date_debut || !lr.date_fin) return false;
            const debut = new Date(lr.date_debut);
            const fin = new Date(lr.date_fin);
            debut.setHours(0, 0, 0, 0);
            fin.setHours(0, 0, 0, 0);
            return now >= debut && now <= fin && 
                   lr.reservation?.statut !== 'Annulée' &&
                   lr.reservation?.statut !== 'Expirée';
          });

          // Trouver la réservation future
          const futureRes = ligneReservations.find((lr: any) => {
            if (!lr.date_debut) return false;
            const debut = new Date(lr.date_debut);
            debut.setHours(0, 0, 0, 0);
            return debut > now && 
                   lr.reservation?.statut !== 'Annulée' &&
                   lr.reservation?.statut !== 'Expirée';
          });

          // Trouver la réservation en attente
          const pendingRes = ligneReservations.find((lr: any) => {
            return lr.reservation?.statut === 'En attente' || 
                   lr.reservation?.statut === 'En attente de validation';
          });

          if (face.a_probleme === 1) {
            facesMaintenance++;
          } else if (activeRes) {
            facesOccupees++;
          } else if (futureRes) {
            facesReservees++;
          } else if (pendingRes) {
            facesReservees++;
          } else {
            facesLibres++;
          }
        });
      });

      // Calculer les réservations en cours, futures et passées
      const reservationsEnCours = reservations.filter((r: any) => {
        const debut = new Date(r.date_debut_campagne);
        const fin = new Date(r.date_fin_campagne);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(0, 0, 0, 0);
        return now >= debut && now <= fin && 
               r.statut !== 'Annulée' && 
               r.statut !== 'Expirée';
      }).length;

      const reservationsFutures = reservations.filter((r: any) => {
        const debut = new Date(r.date_debut_campagne);
        debut.setHours(0, 0, 0, 0);
        return debut > now && 
               r.statut !== 'Annulée' && 
               r.statut !== 'Expirée';
      }).length;

      const reservationsPassees = reservations.filter((r: any) => {
        const fin = new Date(r.date_fin_campagne);
        fin.setHours(0, 0, 0, 0);
        return fin < now;
      }).length;

      return {
        panneaux: panneaux.length,
        faces: {
          total: totalFaces,
          libres: facesLibres,
          occupees: facesOccupees,
          reservees: facesReservees,
          maintenance: facesMaintenance
        },
        users: users.length,
        societes: users.filter((u: any) => u.role === 'visiteur' || u.role === 'client').length,
        reservations: {
          enCours: reservationsEnCours,
          futures: reservationsFutures,
          passees: reservationsPassees
        }
      };
    } catch (error) {
      console.error('❌ Erreur PanneauService.getStats:', error);
      throw error;
    }
  }

  // Rechercher des panneaux
  static async search(query: string): Promise<Panneau[]> {
    try {
      const panneaux = await prisma.panneau.findMany({
        where: {
          OR: [
            { nom: { contains: query } },
            { adresse: { contains: query } },
            { ville: { contains: query } },
            { province: { contains: query } },
            { commune: { contains: query } }
          ]
        },
        include: {
          faces: {
            include: {
              typeFace: true, // ✅ Correction : type_face → typeFace
              ligneReservations: {
                include: {
                  reservation: {
                    include: {
                      client: true,
                      commercial: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          nom: 'asc'
        }
      });

      return panneaux.map((p: any) => ({
        id: p.id_panneau.toString(),
        idPan: p.id_panneau.toString(),
        nom: p.nom || 'Sans nom',
        adresse: p.adresse || 'Adresse non définie',
        latitude: p.latitude ? Number(p.latitude) : 0,
        longitude: p.longitude ? Number(p.longitude) : 0,
        province: p.province || '',
        ville: p.ville || '',
        commune: p.commune || '',
        type: 'Standard',
        dimension: '',
        nbFaces: p.faces?.length || 0,
        etat: (p.etat as 'Actif' | 'EnMaintenance' | 'Desactive') || 'Actif',
        faces: (p.faces || []).map((f: any) => ({
          id: f.id_face?.toString() || '',
          sens: f.orientation || 'Indéfini',
          orientation: f.orientation || 'Indifferent',
          statut: 'Libre',
          reservations: (f.ligneReservations || []).map((lr: any) => ({
            id: lr.id_reservation?.toString() || '',
            client: lr.reservation?.client?.raison_sociale || 'Client inconnu',
            commercial: lr.reservation?.commercial?.nom 
              ? `${lr.reservation.commercial.prenom || ''} ${lr.reservation.commercial.nom}`.trim() 
              : 'Commercial inconnu',
            date_debut: lr.date_debut,
            date_fin: lr.date_fin,
            statut: lr.reservation?.statut || 'En attente'
          }))
        })),
        createdAt: p.created_at || new Date(),
        updatedAt: p.updated_at || new Date()
      }));
    } catch (error) {
      console.error('❌ Erreur PanneauService.search:', error);
      throw error;
    }
  }
}