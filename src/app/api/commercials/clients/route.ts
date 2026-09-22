// src/app/api/commercials/clients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// GET: Récupérer tous les clients ou rechercher par nom
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    console.log('🔍 Recherche clients:', search);

    let query = `SELECT id_client, raison_sociale, telephone FROM client`;
    const params: any[] = [];

    if (search && search.trim()) {
      query += ` WHERE LOWER(raison_sociale) LIKE LOWER(?)`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY raison_sociale LIMIT 50`;

    const connection = await pool.getConnection();
    const [rows] = await connection.query(query, params);
    connection.release();

    console.log(`✅ ${(rows as any[]).length} clients trouvés`);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('❌ Erreur récupération clients:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des clients: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST: Créer un nouveau client
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

    // ✅ Vérifier si le client existe déjà (insensible à la casse et aux espaces)
    const [existing] = await connection.query(
      `SELECT id_client, raison_sociale, telephone FROM client WHERE LOWER(TRIM(raison_sociale)) = LOWER(TRIM(?))`,
      [raison_sociale.trim()]
    );

    if ((existing as any[]).length > 0) {
      console.log(`✅ Client déjà existant: ${(existing as any[])[0].raison_sociale} (ID: ${(existing as any[])[0].id_client})`);
      connection.release();
      return NextResponse.json({
        success: true,
        id_client: (existing as any[])[0].id_client,
        message: 'Client déjà existant',
        client: (existing as any[])[0]
      });
    }

    // ✅ Générer un SIRET unique pour éviter la duplication
    const generateSiret = () => {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `SIRET-${timestamp}${random}`;
    };

    const siret = generateSiret();
    console.log(`🆕 Création du client: "${raison_sociale.trim()}" avec SIRET: ${siret}`);
    
    const [result] = await connection.query(
      `INSERT INTO client 
       (raison_sociale, siret, adresse, code_postal, ville, telephone, email_facturation, province) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        raison_sociale.trim(),           // raison_sociale
        siret,                           // siret (unique)
        'Adresse non renseignée',        // adresse
        '0000',                          // code_postal
        'Ville non renseignée',          // ville
        telephone || '',                 // telephone
        'email@exemple.com',             // email_facturation
        'Province non renseignée'        // province
      ]
    );

    const id_client = (result as any).insertId;
    console.log(`✅ Client créé avec ID: ${id_client}`);

    connection.release();

    return NextResponse.json({
      success: true,
      id_client: id_client,
      message: 'Client créé avec succès',
      client: {
        id_client,
        raison_sociale: raison_sociale.trim(),
        telephone: telephone || ''
      }
    });

  } catch (error: any) {
    if (connection) {
      connection.release();
    }
    
    // ✅ Gérer l'erreur de duplication SIRET
    if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage?.includes('siret')) {
      console.log('⚠️ Duplication SIRET, tentative de réessayer avec un nouveau SIRET');
      
      // Réessayer avec un nouveau SIRET (appel récursif)
      try {
        const newBody = await request.json();
        const { raison_sociale, telephone } = newBody;
        
        const newConnection = await pool.getConnection();
        const siret = `SIRET-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        
        const [result] = await newConnection.query(
          `INSERT INTO client 
           (raison_sociale, siret, adresse, code_postal, ville, telephone, email_facturation, province) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            raison_sociale.trim(),
            siret,
            'Adresse non renseignée',
            '0000',
            'Ville non renseignée',
            telephone || '',
            'email@exemple.com',
            'Province non renseignée'
          ]
        );
        
        const id_client = (result as any).insertId;
        newConnection.release();
        
        return NextResponse.json({
          success: true,
          id_client: id_client,
          message: 'Client créé avec succès',
          client: {
            id_client,
            raison_sociale: raison_sociale.trim(),
            telephone: telephone || ''
          }
        });
      } catch (retryError) {
        console.error('❌ Erreur lors de la retentative:', retryError);
        return NextResponse.json(
          { error: 'Erreur lors de la création du client' },
          { status: 500 }
        );
      }
    }
    
    console.error('❌ Erreur création client:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du client: ' + (error as Error).message },
      { status: 500 }
    );
  }
}