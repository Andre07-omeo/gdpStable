// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.profil !== "SUPER_ADMIN" && auth.profil !== "ADMIN_SYSTEM")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // ✅ Utiliser des requêtes SQL avec mysql2
    const totalPanneaux = await query(`SELECT COUNT(*) as count FROM panneau`);
    const totalFaces = await query(`SELECT COUNT(*) as count FROM face`);
    const totalUsers = await query(`SELECT COUNT(*) as count FROM user WHERE actif = 1`);
    const totalClients = await query(`SELECT COUNT(*) as count FROM client`);
    const totalReservations = await query(`SELECT COUNT(*) as count FROM ligne_reservation`);

    const reservationsEnCours = await query(`
      SELECT COUNT(*) as count 
      FROM ligne_reservation 
      WHERE date_debut <= CURDATE() AND date_fin >= CURDATE()
    `);

    const facesOccupees = await query(`
      SELECT COUNT(DISTINCT f.id_face) as count
      FROM face f
      JOIN ligne_reservation lr ON f.id_face = lr.id_face
      WHERE lr.date_debut <= CURDATE() AND lr.date_fin >= CURDATE()
    `);

    const facesReservees = await query(`
      SELECT COUNT(DISTINCT f.id_face) as count
      FROM face f
      JOIN ligne_reservation lr ON f.id_face = lr.id_face
      WHERE lr.date_debut > CURDATE()
    `);

    const totalPanneauxCount = Number((totalPanneaux as any[])[0]?.count || 0);
    const totalFacesCount = Number((totalFaces as any[])[0]?.count || 0);
    const totalUsersCount = Number((totalUsers as any[])[0]?.count || 0);
    const totalClientsCount = Number((totalClients as any[])[0]?.count || 0);
    const totalReservationsCount = Number((totalReservations as any[])[0]?.count || 0);
    const reservationsEnCoursCount = Number((reservationsEnCours as any[])[0]?.count || 0);
    const facesOccupeesCount = Number((facesOccupees as any[])[0]?.count || 0);
    const facesReserveesCount = Number((facesReservees as any[])[0]?.count || 0);

    const facesLibres = totalFacesCount - facesOccupeesCount - facesReserveesCount;
    const tauxOccupation = totalFacesCount > 0 ? Math.round(((facesOccupeesCount + facesReserveesCount) / totalFacesCount) * 100) : 0;

    const stats = {
      totalPanneaux: totalPanneauxCount,
      totalFaces: totalFacesCount,
      facesLibres,
      facesOccupees: facesOccupeesCount,
      facesReservees: facesReserveesCount,
      totalUsers: totalUsersCount,
      totalClients: totalClientsCount,
      totalReservations: totalReservationsCount,
      reservationsEnCours: reservationsEnCoursCount,
      reservationsFutures: 0,
      reservationsPassees: 0,
      totalRevenue: 0,
      tauxOccupation
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("❌ Erreur GET /api/admin/stats:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des statistiques" },
      { status: 500 }
    );
  }
}