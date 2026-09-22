// src/app/dashboard/admin/users/services/userService.ts
'use server';

import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { CreateUserDTO, UpdateUserDTO, UserFilters, UserStats } from '../types/user.types';

// ✅ Utiliser le type User existant
import { User } from '../types/user.types';

function formatUser(user: any): User {
  return {
    id: user.id_user,  // ✅ Garder en number
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
    profil: user.profil?.libelle || 'Visiteur',
    profilLibelle: user.profil?.libelle || 'Visiteur',
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
    pays_id: null
  };
}

// ✅ Fonctions exportées avec le bon type
export async function getAllUsers(filters?: UserFilters): Promise<User[]> {
  try {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { nom: { contains: filters.search } },
        { prenom: { contains: filters.search } },
        { email: { contains: filters.search } }
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
      include: {
        profil: true
      },
      orderBy: {
        nom: 'asc'
      }
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
      include: {
        profil: true
      }
    });

    if (!user) return null;
    return formatUser(user);
  } catch (error) {
    console.error('❌ Erreur getUserById:', error);
    throw error;
  }
}

export async function createUser(data: CreateUserDTO): Promise<User> {
  try {
    if (!data.email) throw new Error('L\'email est requis');
    if (!data.password) throw new Error('Le mot de passe est requis');
    if (!data.id_profil || data.id_profil === 0) throw new Error('Le rôle est requis');

    const normalizedEmail = data.email.toLowerCase().trim();

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.$queryRaw`
      SELECT * FROM user WHERE email = ${normalizedEmail}
    `;

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Insertion en SQL brut
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
        ${data.ville_nom || data.ville || 'À définir'},
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

    // Récupérer l'utilisateur créé
    const user = await prisma.$queryRaw`
      SELECT * FROM user WHERE email = ${normalizedEmail}
    `;

    return formatUser(Array.isArray(user) ? user[0] : user);
  } catch (error) {
    console.error('❌ Erreur createUser:', error);
    throw error;
  }
}

export async function updateUser(id: number, data: UpdateUserDTO): Promise<User> {
  try {
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
      const profil = await prisma.profil.findUnique({
        where: { id_profil: data.id_profil }
      });
      if (!profil) {
        throw new Error(`Profil avec l'ID ${data.id_profil} non trouvé`);
      }
      updateData.id_profil = data.id_profil;
    }

    updateData.updated_at = new Date();

    const existingUser = await prisma.user.findUnique({
      where: { id_user: id }
    });

    if (!existingUser) {
      throw new Error('Utilisateur non trouvé');
    }

    const user = await prisma.user.update({
      where: { id_user: id },
      data: updateData,
      include: {
        profil: true
      }
    });

    return formatUser(user);
  } catch (error) {
    console.error('❌ Erreur updateUser:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id_user: id }
    });

    if (!existingUser) {
      throw new Error('Utilisateur non trouvé');
    }

    await prisma.user.delete({
      where: { id_user: id }
    });
  } catch (error) {
    console.error('❌ Erreur deleteUser:', error);
    throw error;
  }
}

export async function toggleUserStatus(id: number, actif: boolean): Promise<User> {
  return updateUser(id, { actif });
}

export async function getUsersStats(users: User[]): Promise<UserStats> {
  const total = users.length;
  const actifs = users.filter(u => u.actif).length;
  const inactifs = total - actifs;

  const byRole: Record<string, number> = {};
  users.forEach(u => {
    const role = u.profil || 'Inconnu';
    byRole[role] = (byRole[role] || 0) + 1;
  });

  return { total, actifs, inactifs, byRole };
}