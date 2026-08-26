import mysql, { type Pool } from 'mysql2/promise';

let pool: Pool | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required database environment variable: ${name}`);
  }
  return value;
}

export function getDatabasePool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: requiredEnv('DATABASE_HOST'),
      port: Number(process.env.DATABASE_PORT ?? '3306'),
      database: requiredEnv('DATABASE_NAME'),
      user: requiredEnv('DATABASE_USER'),
      password: requiredEnv('DATABASE_PASSWORD'),
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
  }

  return pool;
}

export async function pingDatabase(): Promise<void> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
