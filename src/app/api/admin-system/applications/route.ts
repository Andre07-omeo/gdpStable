// src/app/api/admin-system/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '../../../../lib/auth-helpers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const [apps]: any = await db.query(
      `SELECT * FROM hosted_applications ORDER BY name ASC`
    );

    // Enrichir avec les infos réelles du système
    const enrichedApps = await Promise.all(
      apps.map(async (app: any) => {
        // Vérifier si le port est en écoute
        let isAlive = false;
        try {
          if (process.platform === 'linux') {
            const { stdout } = await execAsync(
              `ss -tlnp 2>/dev/null | grep :${app.port} || echo ""`
            );
            isAlive = stdout.trim().length > 0;
          } else if (process.platform === 'win32') {
            const { stdout } = await execAsync(
              `netstat -ano | findstr :${app.port}`
            );
            isAlive = stdout.trim().length > 0;
          }
        } catch {}

        return {
          ...app,
          isAlive,
          realStatus: isAlive ? 'running' : app.status,
        };
      })
    );

    // Stats globales
    const stats = {
      total: apps.length,
      running: enrichedApps.filter((a: any) => a.realStatus === 'running').length,
      stopped: enrichedApps.filter((a: any) => a.realStatus === 'stopped').length,
      crashed: enrichedApps.filter((a: any) => a.realStatus === 'crashed').length,
      totalMemory: apps.reduce((acc: number, a: any) => acc + (a.memory_usage || 0), 0),
      totalDisk: apps.reduce((acc: number, a: any) => acc + (a.disk_usage || 0), 0),
    };

    return NextResponse.json({ applications: enrichedApps, stats });
  } catch (error) {
    console.error('Erreur apps:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ POST : Ajouter une application
export async function POST(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, slug, description, domain, port, framework, language,
      git_repo, git_branch, coolify_app_id, auto_deploy,
    } = body;

    const [result]: any = await db.query(
      `INSERT INTO hosted_applications 
       (name, slug, description, domain, port, framework, language, git_repo, git_branch, coolify_app_id, auto_deploy, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running')`,
      [name, slug, description, domain, port, framework, language, git_repo, git_branch, coolify_app_id, auto_deploy || false]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Erreur POST app:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ✅ PATCH : Contrôler une application (start/stop/restart)
export async function PATCH(req: NextRequest) {
  try {
    const authCheck = await requireSuperAdmin(req);
    if (!authCheck.ok) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, action } = body;

    const [apps]: any = await db.query(
      'SELECT * FROM hosted_applications WHERE id = ?',
      [id]
    );
    if (!apps[0]) {
      return NextResponse.json({ error: 'Application introuvable' }, { status: 404 });
    }

    // Simuler une action (à connecter à Coolify / PM2 / Docker réel)
    let newStatus = apps[0].status;
    switch (action) {
      case 'start': newStatus = 'running'; break;
      case 'stop': newStatus = 'stopped'; break;
      case 'restart': newStatus = 'building'; break;
      case 'maintenance': newStatus = 'maintenance'; break;
    }

    await db.query(
      'UPDATE hosted_applications SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    return NextResponse.json({
      success: true,
      newStatus,
      message: `Action "${action}" effectuée par ${authCheck.email}`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}