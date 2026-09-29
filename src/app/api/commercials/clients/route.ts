// src/app/api/commercials/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// ============================================
// Helpers
// ============================================

function generateSiret(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SIRET-${timestamp}${random}`;
}

// ✅ INSERT avec created_at et updated_at remplis par NOW()
const INSERT_CLIENT_SQL = `
  INSERT INTO client 
    (raison_sociale, siret, adresse, code_postal, ville, telephone, email_facturation, province, created_at, updated_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
`;

function buildClientParams(raison_sociale: string, siret: string, telephone?: string) {
  return [
    raison_sociale.trim(),
    siret,
    'Adresse non renseignée',
    '0000',
    'Ville non renseignée',
    telephone || '',
    'email@exemple.com',
    'Province non renseignée',
  ];
}

// ============================================
// GET
// ============================================
export async function GET(request: NextRequest) {
  let connection;
  try {
    const search = request.nextUrl.searchParams.get('search');
    console.log('🔍 Recherche clients:', search);

    let sql = `SELECT id_client, raison_sociale, telephone FROM client`;
    const params: any[] = [];

    if (search && search.trim()) {
      sql += ` WHERE LOWER(raison_sociale) LIKE LOWER(?)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY raison_sociale LIMIT 50`;

    connection = await pool.getConnection();
    const [rows] = await connection.query(sql, params);

    console.log(`✅ ${(rows as any[]).length} clients trouvés`);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Erreur récupération clients:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clients: ' + (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// ============================================
// POST — Créer OU retourner le client existant
// ============================================
export async function POST(request: NextRequest) {
  let connection;

  try {
    const body = await request.json();
    console.log('📝 Corps de la requête:', JSON.stringify(body, null, 2));

    const { raison_sociale, telephone } = body;

    if (!raison_sociale || !raison_sociale.trim()) {
      return NextResponse.json(
        { error: 'Le nom du client est requis' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 1) Le client existe-t-il déjà ?
    const [existing] = await connection.query(
      `SELECT id_client, raison_sociale, telephone 
       FROM client 
       WHERE LOWER(TRIM(raison_sociale)) = LOWER(TRIM(?))`,
      [raison_sociale.trim()]
    );

    if ((existing as any[]).length > 0) {
      const client = (existing as any[])[0];
      console.log(`✅ Client déjà existant: ${client.raison_sociale} (ID: ${client.id_client})`);
      return NextResponse.json({
        success: true,
        id_client: client.id_client,
        message: 'Client déjà existant',
        client,
      });
    }

    // 2) Sinon, on crée (avec NOW() pour created_at + updated_at)
    const siret = generateSiret();
    console.log(`🆕 Création du client: "${raison_sociale.trim()}" avec SIRET: ${siret}`);

    const [result] = await connection.query(
      INSERT_CLIENT_SQL,
      buildClientParams(raison_sociale, siret, telephone)
    );

    const id_client = (result as any).insertId;
    console.log(`✅ Client créé avec ID: ${id_client}`);

    return NextResponse.json({
      success: true,
      id_client,
      message: 'Client créé avec succès',
      client: {
        id_client,
        raison_sociale: raison_sociale.trim(),
        telephone: telephone || '',
      },
    });

  } catch (error: any) {
    console.error('❌ Erreur création client:', error);

    // Retry si duplication SIRET
    if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage?.includes('siret')) {
      console.log('⚠️ Duplication SIRET, nouvelle tentative');

      try {
        const { raison_sociale, telephone } = await request.json();
        connection = await pool.getConnection();
        const newSiret = generateSiret();

        const [result] = await connection.query(
          INSERT_CLIENT_SQL,
          buildClientParams(raison_sociale, newSiret, telephone)
        );

        const id_client = (result as any).insertId;
        return NextResponse.json({
          success: true,
          id_client,
          message: 'Client créé avec succès',
          client: {
            id_client,
            raison_sociale: raison_sociale.trim(),
            telephone: telephone || '',
          },
        });
      } catch (retryError) {
        console.error('❌ Erreur lors de la retentative:', retryError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du client' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du client: ' + (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}