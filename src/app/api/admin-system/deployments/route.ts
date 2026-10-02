// src/app/api/admin-system/deployments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkAdminAccess } from '@/lib/auth/checkAdminAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ✅ GET : liste des déploiements (ADMIN + SUPER_ADMIN)
export async function GET(req: NextRequest) {
  try {
    const auth = checkAdminAccess(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [rows]: any = await db.query(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM update_history WHERE deployment_id = d.id) AS history_count
      FROM deployments d
      ORDER BY d.created_at DESC
      LIMIT 100
    `);

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
        total: 0, deployed: 0, pending: 0, failed: 0,
        production: 0, latest_build: 0,
      },
    });
  } catch (error) {
    console.error('Erreur deployments:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ POST : Créer un nouveau déploiement (ADMIN + SUPER_ADMIN)
export async function POST(req: NextRequest) {
  try {
    const auth = checkAdminAccess(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      branch, commit_hash, commit_message, commit_author,
      environment = 'staging', notes,
    } = body;

    const [lastBuild]: any = await db.query(
      'SELECT MAX(build_number) AS last FROM deployments'
    );
    const buildNumber = (lastBuild[0]?.last || 0) + 1;
    const version = `v1.0.${buildNumber}`;

    const [result]: any = await db.query(
      `INSERT INTO deployments 
       (version, build_number, branch, commit_hash, commit_message, commit_author, environment, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [version, buildNumber, branch, commit_hash, commit_message, commit_author, environment, notes]
    );

    await db.query(
      `INSERT INTO update_history (deployment_id, action, performed_by, details)
       VALUES (?, 'initiated', ?, ?)`,
      [result.insertId, auth.email, `Déploiement ${version} initié`]
    );

    return NextResponse.json({
      success: true,
      deployment: {
        id: result.insertId, version,
        build_number: buildNumber, status: 'pending',
      },
    });
  } catch (error) {
    console.error('Erreur création deployment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ PATCH : Approuver / Rejeter / Déployer (ADMIN + SUPER_ADMIN)
export async function PATCH(req: NextRequest) {
  try {
    const auth = checkAdminAccess(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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
        details = `Approuvé par ${auth.email}`;
        await db.query(
          `UPDATE deployments SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?`,
          [newStatus, auth.email, id]
        );
        break;

      case 'reject':
        newStatus = 'failed';
        historyAction = 'rejected';
        details = `Rejeté par ${auth.email}: ${reason || 'Sans raison'}`;
        await db.query(`UPDATE deployments SET status = ? WHERE id = ?`, [newStatus, id]);
        break;

      case 'deploy':
        newStatus = 'deploying';
        historyAction = 'deployed';
        details = `Déploiement lancé par ${auth.email}`;
        await db.query(
          `UPDATE deployments SET status = ?, deployed_at = NOW() WHERE id = ?`,
          [newStatus, id]
        );
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
        details = `Rollback effectué par ${auth.email}: ${reason || ''}`;
        await db.query(`UPDATE deployments SET status = ? WHERE id = ?`, [newStatus, id]);
        break;

      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO update_history (deployment_id, action, performed_by, details)
       VALUES (?, ?, ?, ?)`,
      [id, historyAction, auth.email, details]
    );

    return NextResponse.json({ success: true, newStatus });
  } catch (error) {
    console.error('Erreur PATCH deployment:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}