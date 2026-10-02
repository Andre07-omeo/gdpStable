// src/app/api/admin-system/server-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAdminAccess } from '@/lib/auth/checkAdminAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ✅ GET : liste des accès (ADMIN + SUPER_ADMIN)
export async function GET(req: NextRequest) {
  try {
    const auth = checkAdminAccess(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM server_access WHERE is_active = TRUE ORDER BY service_type ASC`
    );

    const grouped = rows.reduce((acc: any, item: any) => {
      if (!acc[item.service_type]) acc[item.service_type] = [];
      acc[item.service_type].push(item);
      return acc;
    }, {});

    return NextResponse.json({
      access: rows,
      grouped,
      adminEmail: auth.email,
      profil: auth.profil,
    });
  } catch (error) {
    console.error('❌ Erreur server-access GET:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ POST : Ajouter un accès (ADMIN + SUPER_ADMIN)
export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminAccess(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      service_type, service_name, url, host, port,
      username, email, provider, notes,
    } = body;

    const [result]: any = await db.query(
      `INSERT INTO server_access 
       (service_type, service_name, url, host, port, username, email, provider, notes, admin_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [service_type, service_name, url, host, port, username, email, provider, notes, auth.email]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('❌ Erreur server-access POST:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}