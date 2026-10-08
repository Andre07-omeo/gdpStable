// src/app/api/admin/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_PROFILES = ['SUPER_ADMIN', 'ADMIN'];

/* ------------------------------------------------------------------ */
/*  Helpers dates                                                     */
/* ------------------------------------------------------------------ */
function toDateOnly(v: any): string {
  if (v == null || v === '') return '';
  try {
    // Si c'est déjà une Date (mysql2 peut retourner un objet Date)
    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    // Sinon on prend les 10 premiers caractères "YYYY-MM-DD"
    const s = String(v);
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    // Fallback : tenter un new Date
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  GET : réservations + factures                                     */
/* ------------------------------------------------------------------ */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return NextResponse.json({ error: 'Config serveur' }, { status: 500 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    /* -------- Réservations -------- */
    const rows: any[] = await query(
      `SELECT
         r.id_reservation,
         r.numero_commande,
         r.statut                       AS statut_reservation,
         r.date_creation,
         r.date_debut_campagne,
         r.date_fin_campagne,
         r.validation_chef_commercial,
         r.validation_superviseur,
         c.raison_sociale               AS client_nom,
         CONCAT(u.prenom, ' ', u.nom)   AS commercial_nom,
         lr.id_ligne,
         lr.id_face,
         lr.date_debut                  AS ligne_date_debut,
         lr.date_fin                    AS ligne_date_fin,
         lr.prix_vente_net,
         lr.statut_diffusion,
         f.orientation                  AS face_orientation,
         f.est_active                   AS face_active,
         f.id_panneau,
         p.nom                          AS panneau_nom,
         p.adresse                      AS panneau_adresse,
         p.commune                      AS panneau_commune,
         p.ville                        AS panneau_ville,
         p.dimension                    AS panneau_dimension
       FROM reservation r
       LEFT JOIN client c             ON r.id_client = c.id_client
       LEFT JOIN user u               ON r.id_commercial = u.id_user
       LEFT JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
       LEFT JOIN face f               ON lr.id_face = f.id_face
       LEFT JOIN panneau p            ON f.id_panneau = p.id_panneau
       ORDER BY r.created_at DESC
       LIMIT 500`
    );

    const reservations = rows.map((r) => {
      const dateDebut = toDateOnly(r.ligne_date_debut || r.date_debut_campagne);
      const dateFin = toDateOnly(r.ligne_date_fin || r.date_fin_campagne);

      return {
        id: String(r.id_reservation),
        idLigne: r.id_ligne ? String(r.id_ligne) : null,
        numeroCommande: r.numero_commande || '',

        societeLocatrice: r.client_nom || 'Client inconnu',

        panneau: r.panneau_nom || `Panneau #${r.id_panneau ?? '?'}`,
        panneauAdresse: r.panneau_adresse || '',
        panneauCommune: r.panneau_commune || '',
        panneauVille: r.panneau_ville || '',
        panneauDimension: r.panneau_dimension || '',
        panneauId: r.id_panneau ? String(r.id_panneau) : '',

        faceId: r.id_face ? String(r.id_face) : '',
        faceOrientation: r.face_orientation || '',
        faceActive: r.face_active == 1,

        dateDebut,
        dateFin,

        prix: Number(r.prix_vente_net) || 0,
        statut: r.statut_reservation || r.statut_diffusion || 'ACTIVE',
        statutPaiement:
          r.validation_superviseur == 1
            ? 'Payé'
            : r.validation_chef_commercial == 1
              ? 'Validé'
              : 'En attente',
        validationComptable: Boolean(r.validation_superviseur),
        agentNom: r.commercial_nom || undefined,
        createdAt: r.date_creation ? String(r.date_creation) : '',
      };
    });

    console.log(
      '📊 API Reservations:',
      reservations.length,
      '| exemple:',
      JSON.stringify(reservations[0] || null)
    );

    /* -------- Factures -------- */
    let factures: any[] = [];
    try {
      const facturesRows: any[] = await query(
        `SELECT
           f.id_facture,
           f.numero_facture,
           f.date_facture,
           f.date_echeance,
           f.statut,
           f.type_document,
           f.mode_paiement,
           f.total_ht,
           f.total_ttc,
           f.devise,
           f.total_ttc_cdf,
           f.total_ttc_usd,
           f.devises_utilisees,
           f.created_at,
           c.raison_sociale AS client_nom,
           CONCAT(u.prenom, ' ', u.nom) AS commercial_nom
         FROM facture f
         LEFT JOIN client c ON f.id_client = c.id_client
         LEFT JOIN user u   ON f.id_commercial = u.id_user
         ORDER BY f.created_at DESC
         LIMIT 500`
      );

      factures = facturesRows.map((f) => ({
        id: String(f.id_facture),
        numeroFacture: f.numero_facture || `FACT-${f.id_facture}`,
        clientNom: f.client_nom || 'Client inconnu',
        commercialNom: f.commercial_nom || undefined,
        dateFacture: toDateOnly(f.date_facture),
        dateEcheance: toDateOnly(f.date_echeance),
        statut: f.statut || 'inconnu',
        typeDocument: f.type_document || '',
        modePaiement: f.mode_paiement || '',
        totalHt: Number(f.total_ht) || 0,
        totalTtc: Number(f.total_ttc) || 0,
        devise: f.devise || 'CDF',
        totalTtcCdf: Number(f.total_ttc_cdf) || 0,
        totalTtcUsd: Number(f.total_ttc_usd) || 0,
        devisesUtilisees: f.devises_utilisees || f.devise || 'CDF',
        createdAt: f.created_at ? String(f.created_at) : '',
      }));
    } catch (e) {
      console.warn('⚠️ Factures indisponibles:', e);
    }

    return NextResponse.json({ reservations, factures });
  } catch (error) {
    console.error('❌ Erreur /api/admin/reservations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST : nettoyage                                                  */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return NextResponse.json({ error: 'Config serveur' }, { status: 500 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const mode: string = body?.mode || 'expirees';

    let deletedReservations = 0;
    let deletedLignes = 0;

    if (mode === 'expirees' || mode === 'tout') {
      const resLignes: any = await query(
        `DELETE FROM ligne_reservation
         WHERE date_fin IS NOT NULL AND date_fin < CURDATE()`
      );
      deletedLignes = resLignes?.affectedRows ?? 0;

      const resResa: any = await query(
        `DELETE r FROM reservation r
         LEFT JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
         WHERE lr.id_ligne IS NULL
           AND r.date_fin_campagne IS NOT NULL
           AND r.date_fin_campagne < CURDATE()`
      );
      deletedReservations = resResa?.affectedRows ?? 0;
    }

    if (mode === 'orphelines' || mode === 'tout') {
      const resOrph: any = await query(
        `DELETE r FROM reservation r
         LEFT JOIN client c ON r.id_client = c.id_client
         WHERE c.id_client IS NULL`
      );
      deletedReservations += resOrph?.affectedRows ?? 0;
    }

    return NextResponse.json({
      success: true,
      mode,
      deletedReservations,
      deletedLignes,
      message: `Nettoyage terminé (${deletedReservations} réservations, ${deletedLignes} lignes)`,
    });
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}