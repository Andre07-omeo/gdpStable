// src/app/api/commercials/team/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// ============================================
// CONFIGURATION DB
// ============================================
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Mot de passe par défaut
const DEFAULT_PASSWORD = '1234567890';

// ============================================
// HELPER : DÉCODER LE TOKEN
// ============================================
function getUserFromToken(request: NextRequest): {
  userId: number;
  profil: string;
  id_profil: number;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;

    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
      id_profil: decoded.id_profil,
    };
  } catch {
    return null;
  }
}

// ============================================
// GET : LISTER L'ÉQUIPE SELON LE PROFIL
// ============================================
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 Utilisateur connecté:', currentUser);

    const connection = await pool.getConnection();

    let query = '';
    let params: any[] = [];

    // ✅ COMMERCIAL / CHEF_COMMERCIAL → uniquement COMMERCIAL et CHEF_COMMERCIAL
    if (
      currentUser.profil === 'COMMERCIAL' ||
      currentUser.profil === 'CHEF_COMMERCIAL'
    ) {
      query = `
        SELECT 
          u.id_user,
          u.id_profil,
          u.id_manager,
          u.nom,
          u.prenom,
          u.email,
          u.telephone,
          u.sexe,
          u.fonction,
          u.departement,
          u.actif,
          u.derniere_connexion,
          u.zone_travail,
          u.zone_niveau,
          u.created_at,
          p.code AS profil_code,
          p.libelle AS profil_libelle,
          p.niveauHierarchique
        FROM user u
        INNER JOIN profil p ON p.id_profil = u.id_profil
        WHERE p.code IN ('COMMERCIAL', 'CHEF_COMMERCIAL')
        ORDER BY 
          p.niveauHierarchique DESC,
          u.nom ASC,
          u.prenom ASC
      `;
    }
    // ✅ SUPER_ADMIN / ADMIN / DG / PDG → voit tout le monde
    else if (
      currentUser.profil === 'SUPER_ADMIN' ||
      currentUser.profil === 'ADMIN_SYSTEM' ||
      currentUser.profil === 'DG' ||
      currentUser.profil === 'PDG'
    ) {
      query = `
        SELECT 
          u.id_user,
          u.id_profil,
          u.id_manager,
          u.nom,
          u.prenom,
          u.email,
          u.telephone,
          u.sexe,
          u.fonction,
          u.departement,
          u.actif,
          u.derniere_connexion,
          u.zone_travail,
          u.zone_niveau,
          u.created_at,
          p.code AS profil_code,
          p.libelle AS profil_libelle,
          p.niveauHierarchique
        FROM user u
        INNER JOIN profil p ON p.id_profil = u.id_profil
        ORDER BY 
          p.niveauHierarchique DESC,
          u.nom ASC,
          u.prenom ASC
      `;
    }
    // ✅ Autres → uniquement leur propre profil
    else {
      query = `
        SELECT 
          u.id_user,
          u.id_profil,
          u.id_manager,
          u.nom,
          u.prenom,
          u.email,
          u.telephone,
          u.sexe,
          u.fonction,
          u.departement,
          u.actif,
          u.derniere_connexion,
          u.zone_travail,
          u.zone_niveau,
          u.created_at,
          p.code AS profil_code,
          p.libelle AS profil_libelle,
          p.niveauHierarchique
        FROM user u
        INNER JOIN profil p ON p.id_profil = u.id_profil
        WHERE u.id_profil = ?
        ORDER BY 
          u.nom ASC,
          u.prenom ASC
      `;
      params = [currentUser.id_profil];
    }

    const [rows] = await connection.query(query, params);
    connection.release();

    const users = Array.isArray(rows) ? rows : [];

    console.log(`✅ ${users.length} membre(s) trouvé(s)`);

    return NextResponse.json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error: any) {
    console.error('❌ Erreur GET /api/commercials/team:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST : AJOUTER UN MEMBRE
// ============================================
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      nom,
      prenom,
      email,
      telephone,
      sexe,
      fonction,
      departement,
      id_profil,
      adresse,
      zone_travail,
      zone_niveau,
      password, // ✅ Optionnel : reçu depuis le formulaire
    } = body;

    console.log('📥 Données reçues:', {
      nom,
      prenom,
      email,
      telephone,
      sexe,
      fonction,
      departement,
      id_profil,
      password: password ? '***' : '(par défaut)',
    });

    // ✅ Validation
    if (!nom || !prenom || !email) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Nom, prénom et email requis' },
        { status: 400 }
      );
    }

    // ✅ Si COMMERCIAL / CHEF_COMMERCIAL
    // → il ne peut créer QUE des COMMERCIAL ou CHEF_COMMERCIAL
    if (
      currentUser.profil === 'COMMERCIAL' ||
      currentUser.profil === 'CHEF_COMMERCIAL'
    ) {
      const [profilCheck] = await connection.query(
        `SELECT id_profil, code FROM profil 
         WHERE id_profil = ? AND code IN ('COMMERCIAL', 'CHEF_COMMERCIAL')`,
        [id_profil]
      );

      if ((profilCheck as any[]).length === 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          {
            success: false,
            error:
              'Vous ne pouvez créer que des COMMERCIAL ou CHEF_COMMERCIAL',
          },
          { status: 403 }
        );
      }
    }

    // ✅ Vérifier si l'email existe déjà
    const [existing] = await connection.query(
      'SELECT id_user FROM user WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if ((existing as any[]).length > 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    // ============================================
    // ✅ HACHAGE DU MOT DE PASSE
    // ============================================
    const passwordToUse = password || DEFAULT_PASSWORD;

    console.log('🔐 Mot de passe utilisé (avant hash):', passwordToUse);

    // ✅ Hash avec bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    console.log(
      '🔐 Hash généré (début):',
      hashedPassword.substring(0, 30) + '...'
    );
    console.log('🔐 Longueur du hash:', hashedPassword.length);

    // ✅ Vérification immédiate (optionnelle mais utile pour débug)
    const verifyHash = await bcrypt.compare(passwordToUse, hashedPassword);
    console.log('✅ Vérification du hash:', verifyHash ? 'OK' : 'ERREUR');

    if (!verifyHash) {
      throw new Error('Erreur lors du hachage du mot de passe');
    }

    // ============================================
    // ✅ INSERTION DANS LA BASE
    // ============================================
    const [result] = await connection.query(
      `INSERT INTO user (
        id_profil,
        nom,
        prenom,
        sexe,
        adresse,
        code_postal,
        telephone,
        departement,
        fonction,
        email,
        mot_de_passe_hash,
        actif,
        zone_travail,
        zone_niveau,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
      [
        id_profil || 3,
        nom.trim(),
        prenom.trim(),
        sexe || 'Non spécifié',
        adresse || '',
        '0000',
        telephone || '',
        departement || 'Commercial',
        fonction || 'Agent commercial',
        email.toLowerCase().trim(),
        hashedPassword, // ✅ Hash bcrypt, PAS le mot de passe brut
        zone_travail || null,
        zone_niveau || 'National',
      ]
    );

    const newUserId = (result as any).insertId;

    await connection.commit();
    connection.release();

    console.log('✅ Nouveau membre créé avec succès:');
    console.log('   ID:', newUserId);
    console.log('   Email:', email);
    console.log('   Mot de passe:', passwordToUse);

    return NextResponse.json({
      success: true,
      message: `Membre créé avec succès. Mot de passe par défaut : ${passwordToUse}`,
      data: {
        id_user: newUserId,
        email: email,
        password: passwordToUse, // ✅ Renvoyé pour information
      },
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur POST team:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}