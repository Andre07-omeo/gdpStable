// src/app/api/facture/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ✅ Extraire l'ID utilisateur depuis le token
function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

// ✅ NOUVEAU : Normaliser le type de document (évite "Data truncated")
function normaliserTypeDocument(valeur: any): string {
  const val = String(valeur || 'PROFORMA').trim().toUpperCase();

  // ⚠️ Adapter cette liste si votre ENUM en prod est différent
  const typesValides = [
    'FACTURE',
    'PROFORMA',
    'DEVIS',
    'AVOIR',
    'COMMANDE',
  ];

  if (typesValides.includes(val)) {
    return val;
  }

  console.warn(
    `⚠️ type_document invalide reçu: "${valeur}", remplacé par "PROFORMA"`
  );
  return 'PROFORMA';
}

// ✅ NOUVEAU : Normaliser le statut
function normaliserStatut(valeur: any, defaut = 'EN_ATTENTE'): string {
  const val = String(valeur || defaut).trim().toUpperCase();

  const statutsValides = [
    'EN_ATTENTE',
    'VALIDE',
    'PAYEE',
    'REJETEE',
    'ANNULEE',
    'BROUILLON',
  ];

  if (statutsValides.includes(val)) {
    return val;
  }

  console.warn(
    `⚠️ statut invalide reçu: "${valeur}", remplacé par "${defaut}"`
  );
  return defaut;
}

// ✅ Générer un numéro de facture / proformat
async function generateNumeroFacture(prefix: string = 'PRO'): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const prefixFull = `${prefix}-${year}${month}${day}`;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM facture WHERE numero_facture LIKE ?`,
      [`${prefixFull}%`]
    );
    const count = (rows as any[])[0].count + 1;
    return `${prefixFull}-${String(count).padStart(4, '0')}`;
  } finally {
    connection.release();
  }
}

// ============================================
// POST - Créer une facture / proformat
// ============================================
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = getUserIdFromToken(request);
    console.log('🔑 User ID:', userId);

    const body = await request.json();
    console.log('📥 Données reçues:', body);

    const {
      client_nom,
      client_id,
      commercial_nom,
      commercial_email,
      commercial_id,
      reservations,
      total,
      currency = 'CDF',
      notes = '',
      conditions_paiement = 'Paiement à 30 jours',
      type_document = 'PROFORMA',
    } = body;

    // ✅ Vérifications
    if (!reservations || reservations.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Aucune réservation à facturer' },
        { status: 400 }
      );
    }

    // ✅ Récupérer ou créer le client
    let id_client = client_id;
    if (!id_client && client_nom) {
      const [clientResult] = await connection.query(
        'SELECT id_client FROM client WHERE raison_sociale = ? LIMIT 1',
        [client_nom]
      );

      if ((clientResult as any[]).length > 0) {
        id_client = (clientResult as any[])[0].id_client;
        console.log(`✅ Client trouvé: ${client_nom} (ID: ${id_client})`);
      } else {
        const [insertClient] = await connection.query(
          'INSERT INTO client (raison_sociale, created_at) VALUES (?, NOW())',
          [client_nom]
        );
        id_client = (insertClient as any).insertId;
        console.log(`✅ Nouveau client créé: ${client_nom} (ID: ${id_client})`);
      }
    }

    // ✅ Récupérer l'ID du commercial
    let id_commercial = commercial_id;

    if (!id_commercial && commercial_email) {
      const [commercialResult] = await connection.query(
        'SELECT id_user FROM user WHERE email = ? LIMIT 1',
        [commercial_email]
      );

      if ((commercialResult as any[]).length > 0) {
        id_commercial = (commercialResult as any[])[0].id_user;
        console.log(`✅ Commercial trouvé: ${commercial_email} (ID: ${id_commercial})`);
      }
    }

    if (!id_commercial && userId) {
      id_commercial = userId;
      console.log(`✅ Utilisation utilisateur connecté (ID: ${id_commercial})`);
    }

    if (!id_commercial && reservations.length > 0) {
      const firstReservation = reservations[0];
      if (firstReservation.id_reservation) {
        const [reservationResult] = await connection.query(
          'SELECT id_commercial FROM reservation WHERE id_reservation = ? LIMIT 1',
          [firstReservation.id_reservation]
        );
        if (
          (reservationResult as any[]).length > 0 &&
          (reservationResult as any[])[0].id_commercial
        ) {
          id_commercial = (reservationResult as any[])[0].id_commercial;
          console.log(`✅ Commercial récupéré depuis réservation (ID: ${id_commercial})`);
        }
      }
    }

    // ✅ Générer le numéro de facture
    const numeroFacture = await generateNumeroFacture('PRO');

    // ✅ Calculer les totaux
    let totalHT = total || 0;
    const tauxTVA = 0.16;
    const totalTTC = totalHT * (1 + tauxTVA);

    // ✅ Normaliser AVANT insertion
    const typeDocumentFinal = normaliserTypeDocument(type_document);
    const statutFinal = normaliserStatut('EN_ATTENTE');

    console.log('💰 Totaux calculés:', {
      totalHT,
      totalTTC,
      numeroFacture,
      id_client,
      id_commercial,
      type_document: typeDocumentFinal,
      statut: statutFinal,
    });

    // ✅ Insérer la facture
    const [insertResult] = await connection.query(
      `INSERT INTO facture (
        numero_facture,
        id_client,
        id_commercial,
        date_creation,
        date_facture,
        date_echeance,
        type_document,
        statut,
        total_ht,
        total_ttc,
        remise,
        montant_remise,
        notes,
        conditions_paiement,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, NOW(), CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, ?, ?, ?, 0, 0, ?, ?, NOW(), NOW())`,
      [
        numeroFacture,
        id_client,
        id_commercial,
        typeDocumentFinal,
        statutFinal,
        totalHT,
        totalTTC,
        notes || null,
        conditions_paiement || 'Paiement à 30 jours',
      ]
    );

    const idFacture = (insertResult as any).insertId;
    console.log('✅ Facture créée avec ID:', idFacture);

    // ✅ Insérer les lignes de facture
    for (const reservation of reservations) {
      const libelle = `${reservation.panneau_nom || 'Panneau'} - Face ${reservation.orientation || 'N/A'} (${reservation.type_face || 'Standard'})`;
      const prix = reservation.prix_saisi || 0;

      let dureeMois = 1;
      if (reservation.date_debut && reservation.date_fin) {
        const debut = new Date(reservation.date_debut);
        const fin = new Date(reservation.date_fin);
        dureeMois = Math.max(
          1,
          Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24 * 30))
        );
      }

      await connection.query(
        `INSERT INTO facture_ligne (
          id_facture,
          id_reservation,
          id_face,
          id_panneau,
          libelle,
          quantite,
          prix_unitaire,
          total_ligne,
          date_debut,
          date_fin,
          duree_mois,
          remise_ligne,
          created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          idFacture,
          reservation.id_reservation || null,
          reservation.id_face || null,
          reservation.id_panneau || null,
          libelle,
          prix,
          prix,
          reservation.date_debut
            ? new Date(reservation.date_debut).toISOString().split('T')[0]
            : null,
          reservation.date_fin
            ? new Date(reservation.date_fin).toISOString().split('T')[0]
            : null,
          dureeMois,
        ]
      );
      console.log(`✅ Ligne facturée: ${libelle} - ${prix} ${currency}`);
    }

    // ✅ Historique
    await connection.query(
      `INSERT INTO facture_historique (
        id_facture,
        action,
        ancien_statut,
        nouveau_statut,
        description,
        id_utilisateur,
        date_action
      ) VALUES (?, 'CREATION', NULL, ?, ?, ?, NOW())`,
      [idFacture, statutFinal, `Création du proformat ${numeroFacture}`, id_commercial]
    );

    // ✅ Mettre à jour les réservations avec l'ID de facture
    try {
      for (const reservation of reservations) {
        const reservationId = reservation.id_reservation || null;
        if (reservationId) {
          await connection.query(
            'UPDATE reservation SET id_facture = ? WHERE id_reservation = ?',
            [idFacture, reservationId]
          );
          console.log(`✅ Réservation ${reservationId} mise à jour`);
        }
      }
    } catch (updateError) {
      console.log("⚠️ La colonne id_facture n'existe pas dans reservation, ignoré");
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Proformat enregistré avec succès',
      data: {
        id_facture: idFacture,
        numero_facture: numeroFacture,
        total_ht: totalHT,
        total_ttc: totalTTC,
        id_client: id_client,
        id_commercial: id_commercial,
        type_document: typeDocumentFinal,
        statut: statutFinal,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error("❌ Erreur lors de l'enregistrement du proformat:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Erreur lors de l'enregistrement",
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Récupérer une facture / proformat
// ============================================
export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const numero = searchParams.get('numero');
    const clientId = searchParams.get('client_id');
    const commercialId = searchParams.get('commercial_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        f.*,
        c.raison_sociale as client_nom,
        c.email_facturation as client_email,
        c.telephone as client_telephone,
        u.nom as commercial_nom,
        u.prenom as commercial_prenom,
        u.email as commercial_email,
        COALESCE(
          (SELECT SUM(montant) FROM facture_tranche WHERE id_facture = f.id_facture),
          0
        ) as montant_paye
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      LEFT JOIN user u ON f.id_commercial = u.id_user
      WHERE 1=1
    `;

    const params: any[] = [];

    if (id) {
      query += ` AND f.id_facture = ?`;
      params.push(parseInt(id));
    }
    if (numero) {
      query += ` AND f.numero_facture = ?`;
      params.push(numero);
    }
    if (clientId) {
      query += ` AND f.id_client = ?`;
      params.push(parseInt(clientId));
    }
    if (commercialId) {
      query += ` AND f.id_commercial = ?`;
      params.push(parseInt(commercialId));
    }
    if (status) {
      query += ` AND f.statut = ?`;
      params.push(status);
    }

    query += ` ORDER BY f.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [factures] = await connection.query(query, params);

    const facturesWithDetails = [];
    for (const facture of factures as any[]) {
      const [lignes] = await connection.query(
        `SELECT 
          fl.*,
          p.nom as panneau_nom,
          p.adresse as panneau_adresse,
          f.orientation as face_orientation,
          tf.libelle as type_face,
          r.numero_commande as reservation_numero,
          r.date_debut_campagne,
          r.date_fin_campagne
        FROM facture_ligne fl
        LEFT JOIN face f ON fl.id_face = f.id_face
        LEFT JOIN panneau p ON fl.id_panneau = p.id_panneau
        LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
        LEFT JOIN reservation r ON fl.id_reservation = r.id_reservation
        WHERE fl.id_facture = ?`,
        [facture.id_facture]
      );

      const [tranches] = await connection.query(
        `SELECT * FROM facture_tranche WHERE id_facture = ? ORDER BY numero_tranche`,
        [facture.id_facture]
      );

      const [historique] = await connection.query(
        `SELECT * FROM facture_historique WHERE id_facture = ? ORDER BY date_action DESC`,
        [facture.id_facture]
      );

      facturesWithDetails.push({
        ...facture,
        lignes,
        tranches,
        historique,
      });
    }

    connection.release();

    return NextResponse.json({
      success: true,
      data: id || numero ? facturesWithDetails[0] : facturesWithDetails,
      total: facturesWithDetails.length,
    });
  } catch (error) {
    connection.release();
    console.error('❌ Erreur GET facture:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du chargement des factures' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Mettre à jour une facture
// ============================================
export async function PUT(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id_facture,
      statut,
      mode_paiement,
      notes,
      conditions_paiement,
      remise,
    } = body;

    if (!id_facture) {
      connection.release();
      return NextResponse.json(
        { success: false, message: 'ID facture requis' },
        { status: 400 }
      );
    }

    const [oldData] = await connection.query(
      'SELECT statut FROM facture WHERE id_facture = ?',
      [id_facture]
    );
    const ancienStatut = (oldData as any[])[0]?.statut || null;

    // ✅ Normaliser le statut si fourni
    const statutFinal = statut ? normaliserStatut(statut) : null;

    await connection.query(
      `UPDATE facture SET 
        statut = COALESCE(?, statut),
        mode_paiement = COALESCE(?, mode_paiement),
        notes = COALESCE(?, notes),
        conditions_paiement = COALESCE(?, conditions_paiement),
        remise = COALESCE(?, remise),
        updated_at = NOW()
      WHERE id_facture = ?`,
      [statutFinal, mode_paiement, notes, conditions_paiement, remise, id_facture]
    );

    if (statutFinal && statutFinal !== ancienStatut) {
      await connection.query(
        `INSERT INTO facture_historique (
          id_facture, action, ancien_statut, nouveau_statut, description, id_utilisateur
        ) VALUES (?, 'CHANGEMENT_STATUT', ?, ?, ?, ?)`,
        [
          id_facture,
          ancienStatut,
          statutFinal,
          `Changement de statut vers ${statutFinal}`,
          userId,
        ]
      );
    }

    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Facture mise à jour avec succès',
    });
  } catch (error) {
    connection.release();
    console.error('❌ Erreur PUT facture:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}