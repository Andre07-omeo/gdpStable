// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Token invalide (id manquant)' },
        { status: 401 }
      );
    }

    // ✅ SELECT complet avec jointures
    const users = await query(
      `SELECT 
        u.id_user,
        u.id_profil,
        u.id_manager,
        u.nom,
        u.prenom,
        u.sexe,
        u.adresse,
        u.code_postal,
        u.telephone,
        u.departement,
        u.fonction,
        u.email,
        u.actif,
        u.derniere_connexion,
        u.created_at,
        u.updated_at,
        u.zone_niveau,
        u.zone_travail,
        u.ville_nom,
        p.code as profil_code,
        p.libelle as profil_libelle,
        p.niveauHierarchique as profil_niveau,
        pr.nom as province_nom,
        pr.code as province_code,
        v.nom as ville_nom_rel,
        v.code as ville_code,
        c.nom as commune_nom,
        c.code as commune_code,
        m.nom as manager_nom,
        m.prenom as manager_prenom,
        m.email as manager_email
      FROM user u
      LEFT JOIN profil p ON u.id_profil = p.id_profil
      LEFT JOIN province pr ON u.province_id = pr.id_province
      LEFT JOIN ville v ON u.ville_id = v.id_ville
      LEFT JOIN commune c ON u.commune_id = c.id_commune
      LEFT JOIN user m ON u.id_manager = m.id_user
      WHERE u.id_user = ?`,
      [userId]
    );

    const user = (users as any[])[0];

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      // Identifiants
      id: user.id_user,
      id_user: user.id_user,
      id_manager: user.id_manager,

      // Identité
      nom: user.nom,
      prenom: user.prenom,
      sexe: user.sexe,
      email: user.email,
      telephone: user.telephone,

      // Adresse
      adresse: user.adresse,
      code_postal: user.code_postal,
      ville_nom: user.ville_nom,

      // Poste
      departement: user.departement,
      fonction: user.fonction,

      // Zone
      zone_travail: user.zone_travail,
      zone_niveau: user.zone_niveau,

      // Rôle / Profil
      profil: user.profil_code || 'VISITEUR',
      profilLibelle: user.profil_libelle || 'Visiteur',
      id_profil: user.id_profil,
      profil_niveau: user.profil_niveau,

      // Statut
      actif: user.actif,
      derniere_connexion: user.derniere_connexion,
      created_at: user.created_at,
      updated_at: user.updated_at,

      // Relations géographiques (objets imbriqués pour ProfileView)
      province: user.province_nom
        ? { nom: user.province_nom, code: user.province_code }
        : null,
      ville: user.ville_nom_rel
        ? { nom: user.ville_nom_rel, code: user.ville_code }
        : null,
      commune: user.commune_nom
        ? { nom: user.commune_nom, code: user.commune_code }
        : null,

      // Manager
      manager: user.manager_nom
        ? {
            nom: user.manager_nom,
            prenom: user.manager_prenom,
            email: user.manager_email,
          }
        : null,
    });
  } catch (error) {
    console.error('❌ Erreur /api/auth/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}