// src/app/api/admin-system/deployments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '../../../../lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ✅ GET : Liste des déploiements
export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM update_history WHERE deployment_id = d.id) AS history_count
      FROM deployments d
      ORDER BY d.created_at DESC
      LIMIT 100
    `);

    // Statistiques
    const [stats]: any = await db.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) AS deployed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN environment = 'production' THEN 1 ELSE 0 END) AS production,
        MAX(build_number) AS latest_build
      FROM deployments
    `);

    return NextResponse.json({
      deployments: rows,
      stats: stats[0] || {
        total: 0,
        deployed: 0,
        pending: 0,
        failed: 0,
        production: 0,
        latest_build: 0,
      },
    });
  } catch (error) {
    console.error('Erreur deployments:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ POST : Créer un nouveau déploiement (en attente d'approbation)
export async function POST(req: NextRequest) {
  try {
    // 🔒 Vérification super admin
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const {
      branch,
      commit_hash,
      commit_message,
      commit_author,
      environment = 'staging',
      notes,
    } = body;

    // Récupérer le prochain numéro de build
    const [lastBuild]: any = await db.query(
      'SELECT MAX(build_number) AS last FROM deployments'
    );
    const buildNumber = (lastBuild[0]?.last || 0) + 1;

    // Versionification automatique : v1.0.{buildNumber}
    const version = `v1.0.${buildNumber}`;

    const [result]: any = await db.query(
      `INSERT INTO deployments 
       (version, build_number, branch, commit_hash, commit_message, commit_author, environment, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [version, buildNumber, branch, commit_hash, commit_message, commit_author, environment, notes]
    );

    // Historique
    await db.query(
      `INSERT INTO update_history (deployment_id, action, performed_by, details)
       VALUES (?, 'initiated', ?, ?)`,
      [result.insertId, authCheck.email, `Déploiement ${version} initié`]
    );

    return NextResponse.json({
      success: true,
      deployment: {
        id: result.insertId,
        version,
        build_number: buildNumber,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Erreur création deployment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ PATCH : Approuver / Rejeter / Déployer
export async function PATCH(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, action, reason } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'id et action requis' }, { status: 400 });
    }

    let newStatus = 'pending';
    let historyAction = 'initiated';
    let details = '';

    switch (action) {
      case 'approve':
        newStatus = 'approved';
        historyAction = 'approved';
        details = `Approuvé par ${authCheck.email}`;
        await db.query(
          `UPDATE deployments SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
          [newStatus, authCheck.email, id]
        );
        break;

      case 'reject':
        newStatus = 'failed';
        historyAction = 'rejected';
        details = `Rejeté par ${authCheck.email}: ${reason || 'Sans raison'}`;
        await db.query(`UPDATE deployments SET status = ? WHERE id = ?`, [newStatus, id]);
        break;

      case 'deploy':
        newStatus = 'deploying';
        historyAction = 'deployed';
        details = `Déploiement lancé par ${authCheck.email}`;
        await db.query(
          `UPDATE deployments SET status = ?, deployed_at = NOW() WHERE id = ?`,
          [newStatus, id]
        );
        // Simuler un déploiement réussi après 3s
        setTimeout(async () => {
          try {
            await db.query(
              `UPDATE deployments SET status = 'deployed', duration_seconds = 45 WHERE id = ?`,
              [id]
            );
          } catch {}
        }, 3000);
        break;

      case 'rollback':
        newStatus = 'rolled_back';
        historyAction = 'rolled_back';
        details = `Rollback effectué par ${authCheck.email}: ${reason || ''}`;
        await db.query(`UPDATE deployments SET status = ? WHERE id = ?`, [newStatus, id]);
        break;

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO update_history (deployment_id, action, performed_by, details)
       VALUES (?, ?, ?, ?)`,
      [id, historyAction, authCheck.email, details]
    );

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    console.error('Erreur PATCH deployment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}