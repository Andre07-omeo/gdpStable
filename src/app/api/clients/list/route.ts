import { NextResponse } from 'next/server';
import pool from '@/lib/db';        // ✅ Correct
export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id_client, raison_sociale, telephone, email_facturation, ville
       FROM client
       ORDER BY raison_sociale ASC`
    );
    return NextResponse.json({ clients: rows });
  } catch (error: any) {
    console.error('Erreur list clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}