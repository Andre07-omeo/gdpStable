import { NextResponse } from 'next/server';
import pool from '@/lib/db';        // ✅ Correct
export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id_panneau, nom, adresse, etat
       FROM panneau
       ORDER BY nom ASC`
    );
    return NextResponse.json({ panneaux: rows });
  } catch (error: any) {
    console.error('Erreur list panneaux:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}