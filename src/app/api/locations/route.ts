// src/app/api/localisation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type');
        const parentId = searchParams.get('parentId');

        let query = '';
        let params: any[] = [];

        switch (type) {
            case 'pays':
                // ✅ Utiliser id_pays
                query = 'SELECT id_pays as id, code, nom FROM pays ORDER BY nom';
                break;
            case 'provinces':
                // ✅ Utiliser id_province et pays_id
                query = 'SELECT id_province as id, code, nom, pays_id FROM province WHERE pays_id = ? ORDER BY nom';
                params = [parentId];
                break;
            case 'villes':
                // ✅ Utiliser id_ville et province_id
                query = 'SELECT id_ville as id, code, nom, province_id FROM ville WHERE province_id = ? ORDER BY nom';
                params = [parentId];
                break;
            case 'communes':
                // ✅ Utiliser id_commune et ville_id
                query = 'SELECT id_commune as id, code, nom, ville_id FROM commune WHERE ville_id = ? ORDER BY nom';
                params = [parentId];
                break;
            default:
                return NextResponse.json(
                    { error: 'Type de localisation non valide' },
                    { status: 400 }
                );
        }

        const connection = await pool.getConnection();
        const [rows] = await connection.query(query, params);
        connection.release();

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Erreur API localisation:', error);
        return NextResponse.json(
            { error: 'Erreur lors du chargement des données' },
            { status: 500 }
        );
    }
}