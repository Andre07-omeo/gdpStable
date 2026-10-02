// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/auth/checkAdminAccess';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const FOUNDER_EMAIL = 'omeongaandre2@gmail.com';

// ============================================
// GET : liste des users
// ============================================
export async function GET(request: NextRequest) {
  const auth = checkAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const users = await query(
    `SELECT u.*, p.code as profil_code, p.libelle as profil_libelle
     FROM user u
     LEFT JOIN profil p ON u.id_profil = p.id_profil
     ORDER BY u.nom ASC`
  );

  return NextResponse.json(users);
}

// ============================================
// POST : créer un user
// ============================================
export async function POST(request: NextRequest) {
  const auth = checkAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();

  // ✅ auth.email et auth.profil (pas auth.decoded.xxx)
  const isFounder = String(auth.email || '').toLowerCase() === FOUNDER_EMAIL;
  const isSuperAdmin = String(auth.profil || '').toUpperCase() === 'SUPER_ADMIN';

  const roleRows = (await query(
    `SELECT code FROM profil WHERE id_profil = ? LIMIT 1`,
    [body.id_profil]
  )) as any[];

  const roleCode = roleRows[0]?.code;

  // Règles :
  // - Seul le fondateur peut attribuer SUPER_ADMIN
  // - Un ADMIN ne peut pas attribuer SUPER_ADMIN ni ADMIN
  if (roleCode === 'SUPER_ADMIN' && !isFounder) {
    return NextResponse.json(
      { error: 'Seul le fondateur peut attribuer le rôle SUPER_ADMIN.' },
      { status: 403 }
    );
  }
  if (roleCode === 'ADMIN' && !isSuperAdmin && !isFounder) {
    return NextResponse.json(
      { error: 'Seul un SUPER_ADMIN peut attribuer le rôle ADMIN.' },
      { status: 403 }
    );
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  await query(
    `INSERT INTO user (nom, prenom, email, telephone, fonction, adresse, code_postal,
      ville_nom, departement, sexe, id_profil, mot_de_passe_hash,
      zone_travail, zone_niveau, actif, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      body.nom, body.prenom, body.email, body.telephone || '',
      body.fonction || 'Agent', body.adresse || '', body.code_postal || '',
      body.ville || '', body.departement || '', body.sexe || 'Non spécifié',
      body.id_profil, hashedPassword,
      body.zone_travail || null, body.zone_niveau || 'National',
      body.actif !== false ? 1 : 0,
    ]
  );

  return NextResponse.json({ success: true });
}

// ============================================
// PUT : modifier
// ============================================
export async function PUT(request: NextRequest) {
  const auth = checkAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  const targetRows = (await query(
    `SELECT u.email, p.code as profil_code
     FROM user u LEFT JOIN profil p ON u.id_profil = p.id_profil
     WHERE u.id_user = ? LIMIT 1`,
    [id]
  )) as any[];

  const target = targetRows[0];
  if (!target) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  // ✅ auth.email (pas auth.decoded.email)
  const isFounder = String(auth.email || '').toLowerCase() === FOUNDER_EMAIL;
  const targetIsFounder = String(target.email || '').toLowerCase() === FOUNDER_EMAIL;
  const targetIsSuperAdmin = target.profil_code === 'SUPER_ADMIN';

  if (targetIsFounder && !isFounder) {
    return NextResponse.json(
      { error: 'Ce compte fondateur est protégé.' },
      { status: 403 }
    );
  }
  if (targetIsSuperAdmin && !isFounder) {
    return NextResponse.json(
      { error: 'Seul le fondateur peut modifier un SUPER_ADMIN.' },
      { status: 403 }
    );
  }

  // ... ta logique de mise à jour
  return NextResponse.json({ success: true });
}

// ============================================
// DELETE
// ============================================
export async function DELETE(request: NextRequest) {
  const auth = checkAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const targetRows = (await query(
    `SELECT u.email, p.code as profil_code
     FROM user u LEFT JOIN profil p ON u.id_profil = p.id_profil
     WHERE u.id_user = ? LIMIT 1`,
    [id]
  )) as any[];

  const target = targetRows[0];
  if (!target) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  // ✅ auth.email (pas auth.decoded.email)
  const isFounder = String(auth.email || '').toLowerCase() === FOUNDER_EMAIL;
  const targetIsFounder = String(target.email || '').toLowerCase() === FOUNDER_EMAIL;
  const targetIsSuperAdmin = target.profil_code === 'SUPER_ADMIN';

  if (targetIsFounder && !isFounder) {
    return NextResponse.json({ error: 'Fondateur protégé.' }, { status: 403 });
  }
  if (targetIsSuperAdmin && !isFounder) {
    return NextResponse.json({ error: 'SUPER_ADMIN protégé.' }, { status: 403 });
  }

  await query(`DELETE FROM user WHERE id_user = ?`, [id]);
  return NextResponse.json({ success: true });
}