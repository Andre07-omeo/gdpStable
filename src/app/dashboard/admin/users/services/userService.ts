// src/app/dashboard/admin/users/services/userService.ts
'use server';

import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
  UserStats,
  User,
  FOUNDER_EMAIL,
  isFounder,
} from '../types/user.types';

// ============================================
// 🔒 VÉRIFICATION DU CONTEXTE UTILISATEUR
// ============================================
// NOTE : en prod, récupère l'utilisateur depuis la session/JWT.
// Ici on fait confiance aux règles métier (le front envoie déjà les infos).
// Pour être 100% sûr, ajoute un middleware qui vérifie le JWT.

async function getUserContext(userId: number) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT u.id_user, u.email, u.id_profil, p.code as profil_code
    FROM user u
    LEFT JOIN profil p ON u.id_profil = p.id_profil
    WHERE u.id_user = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function assertCanModifyUser(
  actorId: number,
  targetUserId: number,
  action: 'edit' | 'delete' | 'toggle' | 'assign-role'
) {
  const actor = await getUserContext(actorId);
  if (!actor) throw new Error('Utilisateur non authentifié');

  const actorIsFounder = actor.email?.toLowerCase() === FOUNDER_EMAIL;

  const target = await getUserContext(targetUserId);
  if (!target) throw new Error('Utilisateur cible introuvable');

  const targetIsFounder = target.email?.toLowerCase() === FOUNDER_EMAIL;
  const targetIsSuperAdmin = target.profil_code === 'SUPER_ADMIN';

  // 🔒 Le fondateur est intouchable sauf par lui-même
  if (targetIsFounder && !actorIsFounder) {
    throw new Error('Ce compte fondateur est protégé.');
  }

  // 🔒 SUPER_ADMIN intouchable sauf par le fondateur
  if (targetIsSuperAdmin && !actorIsFounder) {
    throw new Error('Seul le fondateur peut modifier un SUPER_ADMIN.');
  }

  // 🔒 Auto-suppression / auto-désactivation interdite
  if ((action === 'delete' || action === 'toggle') && actorId === targetUserId) {
    throw new Error('Vous ne pouvez pas effectuer cette action sur vous-même.');
  }
}

async function assertCanAssignRole(actorId: number, newRoleId: number) {
  const actor = await getUserContext(actorId);
  if (!actor) throw new Error('Utilisateur non authentifié');

  const actorIsFounder = actor.email?.toLowerCase() === FOUNDER_EMAIL;

  const roleRows = await prisma.$queryRaw<any[]>`
    SELECT id_profil, code FROM profil WHERE id_profil = ${newRoleId} LIMIT 1
  `;
  const role = roleRows[0];
  if (!role) throw new Error('Rôle introuvable');

  if (role.code === 'SUPER_ADMIN' && !actorIsFounder) {
    throw new Error('Seul le fondateur peut attribuer le rôle SUPER_ADMIN.');
  }
}

// ============================================
// FORMATAGE
// ============================================
function formatUser(user: any): User {
  return {
    id: user.id_user,
    id_user: user.id_user || 0,
    nom: user.nom || '',
    prenom: user.prenom || '',
    email: user.email || '',
    telephone: user.telephone || '',
    adresse: user.adresse || '',
    code_postal: user.code_postal || '',
    ville_nom: user.ville_nom || null,
    departement: user.departement || '',
    fonction: user.fonction || '',
    profil: user.profil?.code || user.profil_code || 'VISITEUR',
    profilLibelle: user.profil?.libelle || user.profil_libelle || 'Visiteur',
    actif: user.actif ?? true,
    zone_travail: user.zone_travail || null,
    zone_niveau: user.zone_niveau || 'National',
    id_profil: user.id_profil || 0,
    created_at: user.created_at ? new Date(user.created_at).toISOString() : new Date().toISOString(),
    updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : new Date().toISOString(),
    derniere_connexion: user.derniere_connexion || null,
    province_id: user.province_id || null,
    ville_id: user.ville_id || null,
    commune_id: user.commune_id || null,
    pays_id: null,
    sexe: user.sexe || undefined,
    id_manager: user.id_manager || null,
  };
}

// ============================================
// LECTURE
// ============================================
export async function getAllUsers(filters?: UserFilters): Promise<User[]> {
  try {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { nom: { contains: filters.search } },
        { prenom: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }
    if (filters?.role) {
      where.profil = { code: filters.role };
    }
    if (filters?.actif !== undefined) {
      where.actif = filters.actif;
    }

    const users = await prisma.user.findMany({
      where,
      include: { profil: true },
      orderBy: { nom: 'asc' },
    });

    return users.map((u: any) => formatUser(u));
  } catch (error) {
    console.error('❌ Erreur getAllUsers:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id_user: id },
      include: { profil: true },
    });
    if (!user) return null;
    return formatUser(user);
  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    throw error;
  }
}

// ============================================
// CRÉATION
// ============================================
export async function createUser(
  data: CreateUserDTO,
  actorId?: number // ✅ Pour la sécurité
): Promise<User> {
  try {
    if (!data.email) throw new Error('L\'email est requis');
    if (!data.password) throw new Error('Le mot de passe est requis');
    if (!data.id_profil || data.id_profil === 0) throw new Error('Le rôle est requis');

    // 🔒 Vérifier que l'actor peut attribuer ce rôle
    if (actorId) {
      await assertCanAssignRole(actorId, data.id_profil);
    }

    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.$queryRaw<any[]>`
      SELECT id_user FROM user WHERE email = ${normalizedEmail} LIMIT 1
    `;
    if (existing.length > 0) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const villeNom = (data as any).ville_nom || (data as any).ville || 'À définir';

    await prisma.$executeRaw`
      INSERT INTO user (
        nom, prenom, email, telephone, fonction, adresse, code_postal,
        ville_nom, departement, sexe, id_profil, mot_de_passe_hash,
        zone_travail, zone_niveau, province_id, ville_id, commune_id,
        actif, created_at, updated_at
      ) VALUES (
        ${data.nom.trim()},
        ${data.prenom.trim()},
        ${normalizedEmail},
        ${data.telephone?.trim() || ''},
        ${data.fonction?.trim() || 'Agent'},
        ${data.adresse?.trim() || 'À définir'},
        ${data.code_postal?.trim() || '0000'},
        ${villeNom},
        ${data.departement?.trim() || 'À définir'},
        ${data.sexe || 'Non spécifié'},
        ${data.id_profil},
        ${hashedPassword},
        ${data.zone_travail || null},
        ${data.zone_niveau || 'National'},
        ${data.province_id || null},
        ${data.ville_id || null},
        ${data.commune_id || null},
        ${data.actif !== undefined ? data.actif : true},
        ${new Date()},
        ${new Date()}
      )
    `;

    const created = await prisma.$queryRaw<any[]>`
      SELECT u.*, p.code as profil_code, p.libelle as profil_libelle
      FROM user u
      LEFT JOIN profil p ON u.id_profil = p.id_profil
      WHERE u.email = ${normalizedEmail}
      LIMIT 1
    `;

    return formatUser({ ...created[0], profil: { code: created[0].profil_code, libelle: created[0].profil_libelle } });
  } catch (error) {
    console.error('❌ Erreur createUser:', error);
    throw error;
  }
}

// ============================================
// MISE À JOUR
// ============================================
export async function updateUser(
  id: number,
  data: UpdateUserDTO,
  actorId?: number
): Promise<User> {
  try {
    // 🔒 Vérifier les permissions
    if (actorId) {
      await assertCanModifyUser(actorId, id, 'edit');
      if (data.id_profil !== undefined && data.id_profil > 0) {
        await assertCanAssignRole(actorId, data.id_profil);
      }
    }

    const updateData: any = {};

    if (data.nom !== undefined) updateData.nom = data.nom.trim();
    if (data.prenom !== undefined) updateData.prenom = data.prenom.trim();
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.telephone !== undefined) updateData.telephone = data.telephone.trim();
    if (data.fonction !== undefined) updateData.fonction = data.fonction.trim();
    if (data.adresse !== undefined) updateData.adresse = data.adresse.trim();
    if (data.code_postal !== undefined) updateData.code_postal = data.code_postal.trim();
    if (data.ville_nom !== undefined) updateData.ville_nom = data.ville_nom;
    if (data.ville !== undefined) updateData.ville_nom = data.ville;
    if (data.departement !== undefined) updateData.departement = data.departement.trim();
    if (data.zone_travail !== undefined) updateData.zone_travail = data.zone_travail;
    if (data.zone_niveau !== undefined) updateData.zone_niveau = data.zone_niveau;
    if (data.actif !== undefined) updateData.actif = data.actif;
    if (data.sexe !== undefined) updateData.sexe = data.sexe;
    if (data.province_id !== undefined) updateData.province_id = data.province_id;
    if (data.ville_id !== undefined) updateData.ville_id = data.ville_id;
    if (data.commune_id !== undefined) updateData.commune_id = data.commune_id;

    if (data.password && data.password.trim() !== '') {
      updateData.mot_de_passe_hash = await bcrypt.hash(data.password, 10);
    }

    if (data.id_profil !== undefined && data.id_profil > 0) {
      updateData.id_profil = data.id_profil;
    }

    updateData.updated_at = new Date();

    const user = await prisma.user.update({
      where: { id_user: id },
      data: updateData,
      include: { profil: true },
    });

    return formatUser(user);
  } catch (error) {
    console.error('❌ Erreur updateUser:', error);
    throw error;
  }
}

// ============================================
// SUPPRESSION
// ============================================
export async function deleteUser(id: number, actorId?: number): Promise<void> {
  try {
    if (actorId) {
      await assertCanModifyUser(actorId, id, 'delete');
    }

    const user = await prisma.user.findUnique({ where: { id_user: id } });
    if (!user) throw new Error('Utilisateur non trouvé');

    await prisma.user.delete({ where: { id_user: id } });
  } catch (error) {
    console.error('❌ Erreur deleteUser:', error);
    throw error;
  }
}

// ============================================
// TOGGLE
// ============================================
export async function toggleUserStatus(
  id: number,
  actif: boolean,
  actorId?: number
): Promise<User> {
  if (actorId) {
    await assertCanModifyUser(actorId, id, 'toggle');
  }
  return updateUser(id, { actif }, actorId);
}

// ============================================
// STATS
// ============================================
export async function getUsersStats(users: User[]): Promise<UserStats> {
  const total = users.length;
  const actifs = users.filter((u) => u.actif).length;
  const inactifs = total - actifs;

  const byRole: Record<string, number> = {};
  users.forEach((u) => {
    const role = u.profil || 'Inconnu';
    byRole[role] = (byRole[role] || 0) + 1;
  });

  return { total, actifs, inactifs, byRole };
}