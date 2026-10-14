import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const migrationDirectory = fileURLToPath(
  new URL('../../database/migrations/', import.meta.url),
);
const migrationAliases = new Map([
  ['013_customer_auth.sql', ['011_customer_auth.sql']],
]);

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return readFileSync(path, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return values;
    return { ...values, [match[1]]: match[2].replace(/^['"]|['"]$/g, '') };
  }, {});
}

function environmentValue(name, fileEnvironment, fallback = '') {
  return process.env[name] ?? fileEnvironment[name] ?? fallback;
}

function loadDatabaseConfig() {
  const fileEnvironment = readEnvFile(resolve('.env.local'));

  return {
    host: environmentValue('DATABASE_HOST', fileEnvironment, '127.0.0.1'),
    port: Number(environmentValue('DATABASE_PORT', fileEnvironment, '3306')),
    database: environmentValue('DATABASE_NAME', fileEnvironment, 'thewine'),
    user: environmentValue('DATABASE_USER', fileEnvironment, 'root'),
    password: environmentValue('DATABASE_PASSWORD', fileEnvironment),
    adminUser: environmentValue('DATABASE_ADMIN_USER', fileEnvironment),
    adminPassword: environmentValue('DATABASE_ADMIN_PASSWORD', fileEnvironment),
  };
}

function connectionOptions(config, includeDatabase = true, administrative = false) {
  const useAdmin = administrative && Boolean(config.adminUser);
  return {
    host: config.host,
    port: config.port,
    user: useAdmin ? config.adminUser : config.user,
    password: useAdmin ? config.adminPassword : config.password,
    ...(includeDatabase ? { database: config.database } : {}),
  };
}

function migrationFiles() {
  return readdirSync(migrationDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function ensureDatabase(config) {
  if (!config.adminUser) {
    const connection = await mysql.createConnection(connectionOptions(config));
    try {
      await connection.query('SELECT 1');
      return;
    } catch (error) {
      if (error.code === 'ER_BAD_DB_ERROR') {
        throw new Error(
          `O banco ${config.database} não existe. Configure DATABASE_ADMIN_USER e DATABASE_ADMIN_PASSWORD para criá-lo.`,
        );
      }
      throw error;
    } finally {
      await connection.end();
    }
  }

  const connection = await mysql.createConnection({
    ...connectionOptions(config, false, true),
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(config.database)} `
      + 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
  } finally {
    await connection.end();
  }
}

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function appliedMigrationNames(connection) {
  const [rows] = await connection.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((row) => row.name));
}

async function applyMigration(connection, file, appliedNames) {
  const appliedAlias = (migrationAliases.get(file) ?? [])
    .find((alias) => appliedNames.has(alias));
  if (appliedNames.has(file) || appliedAlias) {
    console.log(`Migration já aplicada: ${appliedAlias ?? file}`);
    return;
  }

  const sql = readFileSync(join(migrationDirectory, file), 'utf8');
  await connection.query(sql);
  await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  console.log(`Migration aplicada: ${file}`);
}

async function migrate() {
  const config = loadDatabaseConfig();
  await ensureDatabase(config);

  const connection = await mysql.createConnection({
    ...connectionOptions(config, true, true),
    multipleStatements: true,
  });
  try {
    await ensureMigrationTable(connection);
    const appliedNames = await appliedMigrationNames(connection);
    for (const file of migrationFiles()) {
      await applyMigration(connection, file, appliedNames);
    }
  } finally {
    await connection.end();
  }

  console.log(`Banco local pronto: ${config.database}@${config.host}:${config.port}`);
}

migrate().catch((error) => {
  if (!error.code && error.message.startsWith('O banco ')) {
    console.error(`Falha na migration local: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (['ER_TABLEACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(error.code)) {
    console.error(
      'Falha na migration local: a conta configurada não tem permissões de schema. '
      + 'Configure DATABASE_ADMIN_USER e DATABASE_ADMIN_PASSWORD em next-app/.env.local; '
      + 'a aplicação continuará usando DATABASE_USER.',
    );
    process.exitCode = 1;
    return;
  }
  console.error(`Falha na migration local: ${error.message}`);
  process.exitCode = 1;
});
