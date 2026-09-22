// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader, OkPacket } from 'mysql2';

// ============================================
// 1. PRISMA CLIENT
// ============================================
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// 2. MYSQL POOL (pour les requêtes brutes)
// ============================================
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  connectTimeout: 10000,
});

// ============================================
// 3. FONCTIONS UTILITAIRES (typées explicitement)
// ============================================

/**
 * Requête SELECT → retourne un tableau de lignes typées.
 */
export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<T>(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}

/**
 * Requête INSERT/UPDATE/DELETE → retourne un ResultSetHeader.
 */
export async function execute(
  sql: string,
  params?: any[]
): Promise<ResultSetHeader> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * Version générique de `query` pour les SELECT.
 * Alias plus explicite quand on veut un tableau.
 */
export async function select<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  return query<T>(sql, params);
}

// Pour les transactions
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================
// 4. EXPORTS PAR DÉFAUT
// ============================================
export default pool;

// Export pour compatibilité
export { pool as db };