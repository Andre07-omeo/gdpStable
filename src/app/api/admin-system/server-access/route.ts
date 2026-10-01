// src/app/api/admin-system/server-access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '../../../../lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // 🔒 UNIQUEMENT pour omeongaandre2@gmail.com
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM server_access WHERE is_active = TRUE ORDER BY service_type ASC`
    );

    // Grouper par type
    const grouped = rows.reduce((acc: any, item: any) => {
      if (!acc[item.service_type]) acc[item.service_type] = [];
      acc[item.service_type].push(item);
      return acc;
    }, {});

    return NextResponse.json({
      access: rows,
      grouped,
      superAdminEmail: authCheck.email,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ POST : Ajouter un accès
export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
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
      [service_type, service_name, url, host, port, username, email, provider, notes, authCheck.email]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}