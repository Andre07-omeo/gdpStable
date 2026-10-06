// src/app/api/commercials/panneaux/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// ✅ CONNEXION MySQL
// ============================================
const dbConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'default',
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
};

// ============================================
// ✅ PARSING JSON TOLÉRANT
// ============================================
function safeJsonParse<T>(value: any, fallback: T, context: string): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    console.error(`❌ [panneaux] JSON invalide (${context}):`, (err as Error).message);
    return fallback;
  }
}

// ============================================
// ✅ HELPERS
// ============================================
function hasPhoto(photoUrl: any): boolean {
  if (photoUrl === null || photoUrl === undefined) return false;
  const s = String(photoUrl).trim();
  if (s === '') return false;
  if (s.toLowerCase() === 'null') return false;
  if (s.toLowerCase() === 'undefined') return false;
  return true;
}

function toDateStr(d: any): string | null {
  if (!d) return null;
  return String(d).slice(0, 10);
}

function isDateInRange(r: any, todayStr: string): boolean {
  const debut = toDateStr(r?.date_debut_campagne);
  const fin = toDateStr(r?.date_fin_campagne);
  if (!debut || !fin) return false;
  return debut <= todayStr && todayStr <= fin;
}

function isFuture(r: any, todayStr: string): boolean {
  const debut = toDateStr(r?.date_debut_campagne);
  if (!debut) return false;
  return debut > todayStr;
}

function isPending(r: any): boolean {
  const s = r?.statut;
  return s === 'En attente' || s === 'En attente de validation';
}

function isRejected(r: any): boolean {
  const s = r?.statut;
  return s === 'Expirée' || s === 'Annulée' || s === 'Rejetée';
}

// ============================================
// ✅ PARSING DIMENSION "9 x 6" ou "9x6" ou "9 * 6"
//    Retourne { hauteur_m, largeur_m } en mètres
// ============================================
function parseDimension(dim: any): { hauteur_m: number; largeur_m: number } {
  if (!dim) return { hauteur_m: 0, largeur_m: 0 };
  const str = String(dim).trim();
  // Accepte : "9 x 6", "9x6", "9 X 6", "9*6", "9 * 6", "9.5x6.5", "9,5 x 6,5"
  const match = str.match(/(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return { hauteur_m: 0, largeur_m: 0 };

  const a = parseFloat(match[1].replace(',', '.'));
  const b = parseFloat(match[2].replace(',', '.'));
  if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) {
    return { hauteur_m: 0, largeur_m: 0 };
  }
  return { hauteur_m: a, largeur_m: b };
}

// ============================================
// ✅ CALCUL DIMENSION FINALE d'une face
//    Priorité : panneau.dimension > type_face (cm → m)
// ============================================
function computeFaceDimension(
  panneauDimension: any,
  typeFaceHauteurCm: any,
  typeFaceLargeurCm: any
): { hauteur_m: number; largeur_m: number; source: string } {
  // 1️⃣ Priorité : dimension du PANNEAU
  const parsed = parseDimension(panneauDimension);
  if (parsed.hauteur_m > 0 && parsed.largeur_m > 0) {
    return { hauteur_m: parsed.hauteur_m, largeur_m: parsed.largeur_m, source: 'panneau' };
  }

  // 2️⃣ Fallback : dimension du TYPE DE FACE (en cm → m)
  const hCm = parseFloat(String(typeFaceHauteurCm ?? 0).replace(',', '.'));
  const lCm = parseFloat(String(typeFaceLargeurCm ?? 0).replace(',', '.'));
  if (hCm > 0 && lCm > 0) {
    return { hauteur_m: hCm / 100, largeur_m: lCm / 100, source: 'type_face' };
  }

  // 3️⃣ Rien trouvé
  return { hauteur_m: 0, largeur_m: 0, source: 'none' };
}

// ============================================
// ROUTE GET
// ============================================
export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const commercialId = searchParams.get('commercialId');
    const statut = searchParams.get('statut');
    const search = searchParams.get('search');

    connection = await mysql.createConnection(dbConfig);
    await connection.execute('SET SESSION group_concat_max_len = 1000000');

    // ============================================
    // REQUÊTE PRINCIPALE
    // ============================================
    let sql = `
      SELECT 
        p.id_panneau as id,
        p.nom,
        p.adresse,
        p.id_panneau as idPan,
        p.dimension,
        p.etat as etatPanneau,
        (
          SELECT COALESCE(CONCAT('[', 
            GROUP_CONCAT(
              JSON_OBJECT(
                'id_face', f.id_face,
                'id_panneau', f.id_panneau,
                'id_type_face', f.id_type_face,
                'orientation', f.orientation,
                'est_active', f.est_active,
                'a_probleme', f.a_probleme,
                'date_probleme', f.date_probleme,
                'raison_probleme', f.raison_probleme,
                'type_face', tf.libelle,
                'hauteur_cm', tf.hauteur_cm,
                'largeur_cm', tf.largeur_cm,
                'est_scroller', tf.est_scroller,
                'reservations', (
                  SELECT COALESCE(CONCAT('[',
                    GROUP_CONCAT(
                      JSON_OBJECT(
                        'id_reservation', r.id_reservation,
                        'id_client', r.id_client,
                        'id_commercial', r.id_commercial,
                        'numero_commande', r.numero_commande,
                        'date_creation', r.date_creation,
                        'date_debut_campagne', r.date_debut_campagne,
                        'date_fin_campagne', r.date_fin_campagne,
                        'statut', r.statut,
                        'est_verrouille', r.est_verrouille,
                        'date_expiration', r.date_expiration,
                        'photoCampagneUrl', r.photoCampagneUrl,
                        'photo_latitude', r.photo_latitude,
                        'photo_longitude', r.photo_longitude,
                        'date_upload_photo', r.date_upload_photo,
                        'client_nom', c.raison_sociale,
                        'client_email', c.email_facturation,
                        'client_telephone', c.telephone,
                        'commercial_nom', u.nom,
                        'commercial_prenom', u.prenom,
                        'commercial_email', u.email
                      )
                    ),
                    ']'
                  ), '[]')
                  FROM reservation r
                  LEFT JOIN client c ON r.id_client = c.id_client
                  LEFT JOIN \`user\` u ON r.id_commercial = u.id_user
                  INNER JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation AND lr.id_face = f.id_face
                  WHERE r.statut IN ('Confirmée', 'En attente', 'En cours')
                    AND (
                      r.date_fin_campagne >= CURDATE()
                      OR r.statut = 'En attente'
                    )
                )
              )
            ),
            ']'
          ), '[]')
          FROM face f
          LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
          WHERE f.id_panneau = p.id_panneau
        ) as faces
      FROM panneau p
      WHERE p.etat != 'En panne'
    `;

    const params: any[] = [];

    if (commercialId) {
      const commercialIdNum = parseInt(commercialId);
      if (isNaN(commercialIdNum)) {
        return NextResponse.json({ error: 'ID commercial invalide' }, { status: 400 });
      }
      sql += ` AND EXISTS (
        SELECT 1 FROM reservation r 
        INNER JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation 
        INNER JOIN face f ON f.id_face = lr.id_face AND f.id_panneau = p.id_panneau
        WHERE r.id_commercial = ?
      )`;
      params.push(commercialIdNum);
    }

    if (statut) {
      const validStatuses = ['Confirmée', 'En attente', 'En cours', 'Expirée', 'Annulée'];
      if (!validStatuses.includes(statut)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      sql += ` AND EXISTS (
        SELECT 1 FROM reservation r 
        INNER JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation 
        INNER JOIN face f ON f.id_face = lr.id_face AND f.id_panneau = p.id_panneau
        WHERE r.statut = ?
      )`;
      params.push(statut);
    }

    if (search) {
      sql += ` AND (p.nom LIKE ? OR p.adresse LIKE ? OR p.id_panneau LIKE ?)`;
      const p = `%${search}%`;
      params.push(p, p, p);
    }

    sql += ` ORDER BY p.nom ASC`;

    const [rows] = await connection.execute(sql, params);
    const panneaux = rows as any[];

    const todayStr = new Date().toISOString().slice(0, 10);

    const formattedPanneaux = panneaux.map((panneau: any) => {
      const faces = safeJsonParse<any[]>(panneau.faces, [], `panneau ${panneau.id}`);

      let panneauType = 'Standard';
      if (faces.length > 0 && faces[0].type_face) panneauType = faces[0].type_face;

      const hasProblemFaces = faces.some((face: any) => face.a_probleme === 1);

      return {
        id: panneau.id?.toString() || '',
        nom: panneau.nom || 'Sans nom',
        adresse: panneau.adresse || 'Adresse non définie',
        idPan: panneau.idPan?.toString() || 'N/A',
        type: panneauType,
        dimension: panneau.dimension || 'N/A',
        etatPanneau: panneau.etatPanneau || 'Actif',
        hasProblem: hasProblemFaces,

        faces: faces.map((face: any) => {
          const reservations = safeJsonParse<any[]>(
            face.reservations,
            [],
            `face ${face.id_face}`
          );

          const validReservations = reservations.filter((r: any) => !isRejected(r));

          // ============================================
          // ✅ CLASSIFICATION RÉSERVATIONS
          // ============================================
          const activeReservation =
            validReservations.find((r: any) => isDateInRange(r, todayStr)) || null;

          const futureReservation = activeReservation
            ? null
            : validReservations.find((r: any) => isFuture(r, todayStr)) || null;

          const pendingReservation =
            !activeReservation && !futureReservation
              ? validReservations.find((r: any) => isPending(r)) || null
              : null;

          const selectedReservation =
            activeReservation || futureReservation || pendingReservation || null;

          // ============================================
          // 🎯 STATUT
          // ============================================
          let status:
            | 'Libre'
            | 'Occupé'
            | 'Réservé'
            | 'En attente'
            | 'Problème' = 'Libre';

          if (face.a_probleme === 1) {
            status = 'Problème';
          } else if (activeReservation) {
            status = hasPhoto(activeReservation.photoCampagneUrl) ? 'Occupé' : 'Réservé';
          } else if (futureReservation) {
            status = 'Réservé';
          } else if (pendingReservation) {
            status = 'En attente';
          } else {
            status = 'Libre';
          }

          // ============================================
          // ✅ DIMENSION CORRIGÉE
          //    Priorité : panneau.dimension > type_face (cm→m)
          // ============================================
          const dim = computeFaceDimension(
            panneau.dimension,
            face.hauteur_cm,
            face.largeur_cm
          );

          const hauteurM = dim.hauteur_m;
          const largeurM = dim.largeur_m;

          // ✅ Surface en m² = hauteur_m × largeur_m (déjà en mètres)
          let dimensionM2 = 'N/A';
          if (hauteurM > 0 && largeurM > 0) {
            dimensionM2 = (hauteurM * largeurM).toFixed(2) + ' m²';
          }

          // ✅ Label brut "9.00m × 6.00m" pour l'affichage
          const dimensionRaw =
            hauteurM > 0 && largeurM > 0
              ? `${hauteurM.toFixed(2)}m × ${largeurM.toFixed(2)}m`
              : '';

          const hasProblem = face.a_probleme === 1;

          // ============================================
          // TEMPS RESTANT (En attente)
          // ============================================
          let remainingTime = null;
          if (pendingReservation && pendingReservation.date_expiration) {
            const now = new Date();
            const expiration = new Date(pendingReservation.date_expiration);
            const diffMs = expiration.getTime() - now.getTime();

            if (diffMs <= 0) {
              remainingTime = { expired: true, label: '⏰ Expirée', hours: 0, minutes: 0 };
            } else {
              const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              if (diffHrs > 24) {
                const diffDays = Math.floor(diffHrs / 24);
                remainingTime = {
                  expired: false,
                  label: `${diffDays}j ${diffHrs % 24}h restants`,
                  hours: diffHrs,
                  minutes: diffMin,
                };
              } else {
                remainingTime = {
                  expired: false,
                  label: `${diffHrs}h ${diffMin}min restants`,
                  hours: diffHrs,
                  minutes: diffMin,
                };
              }
            }
          }

          return {
            id_face: face.id_face?.toString() || '',
            id_panneau: face.id_panneau?.toString() || '',
            id_type_face: face.id_type_face?.toString() || '',
            orientation: face.orientation || 'N/A',
            est_active: face.est_active || 0,
            a_probleme: face.a_probleme || 0,
            date_probleme: face.date_probleme || null,
            raison_probleme: face.raison_probleme || null,
            type_face: face.type_face || 'Non défini',
            est_scroller: face.est_scroller || 0,

            // ✅ Dimensions en mètres (source unique de vérité)
            hauteur_m: hauteurM,
            largeur_m: largeurM,
            dimension_source: dim.source, // 'panneau' | 'type_face' | 'none'
            dimension_raw: dimensionRaw, // "9.00m × 6.00m"
            dimension_m2: dimensionM2,   // "54.00 m²"

            // ⚠️ Champs legacy conservés pour compatibilité front
            hauteur_cm: hauteurM * 100,
            largeur_cm: largeurM * 100,

            status: status,

            reservations: hasProblem ? [] : validReservations,
            reservation_active: hasProblem ? null : activeReservation,
            reservation_future: hasProblem ? null : futureReservation,
            reservation_attente: hasProblem ? null : pendingReservation,
            reservation: hasProblem ? null : selectedReservation,

            client_nom: hasProblem ? null : selectedReservation?.client_nom || null,
            client_prenom: hasProblem ? null : selectedReservation?.client_prenom || null,
            commercial_nom: hasProblem ? null : selectedReservation?.commercial_nom || null,
            commercial_prenom: hasProblem
              ? null
              : selectedReservation?.commercial_prenom || null,
            date_debut: hasProblem
              ? null
              : selectedReservation?.date_debut_campagne || null,
            date_fin: hasProblem
              ? null
              : selectedReservation?.date_fin_campagne || null,

            photoCampagneUrl: hasProblem
              ? null
              : selectedReservation?.photoCampagneUrl || null,

            remaining_time: remainingTime,
          };
        }),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedPanneaux,
      total: formattedPanneaux.length,
      timestamp: new Date().toISOString(),
      today: todayStr,
    });
  } catch (error: any) {
    console.error('❌ [panneaux] Erreur complète:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
    });

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: 'Base de données inaccessible',
          details: `Impossible de joindre ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || '3306'}`,
          hint: 'Vérifiez les variables MYSQL_* dans Coolify (Runtime)',
        },
        { status: 503 }
      );
    }

    if (error.code?.startsWith('ER_')) {
      return NextResponse.json(
        { error: 'Erreur SQL', code: error.code, details: error.sqlMessage },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données',
        details: error.message || 'Erreur inconnue',
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // ignore
      }
    }
  }
}