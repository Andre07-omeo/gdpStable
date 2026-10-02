// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

// ============================================
// 1. PRISMA CLIENT (singleton)
// ============================================
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn'] // ⚠️ Retirer 'query' (trop verbeux)
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// 2. MYSQL POOL (singleton)
// ============================================
// ⚠️ CRUCIAL : sans le singleton `global`, Next.js dev crée
// un NOUVEAU pool à chaque hot-reload → explosion des connexions.
declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',

    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_LIMIT || 5), // ✅
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

    // ⚠️ Pas de SSL (Docker interne)
  });

  console.log(
    `✅ MySQL pool créé (limit: ${process.env.MYSQL_POOL_LIMIT || 5})`
  );
  return pool;
}

// ✅ Singleton : réutilise le pool entre les hot-reloads
const pool = global.__mysqlPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  global.__mysqlPool = pool;
}

// ============================================
// 3. FONCTIONS UTILITAIRES
// ============================================

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

export async function select<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  return query<T>(sql, params);
}

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
// 4. TEST DE CONNEXION
// ============================================
export async function testDatabaseConnection(): Promise<boolean> {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion MySQL :', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================
// 5. EXPORTS
// ============================================
export default pool;
export { pool as db };