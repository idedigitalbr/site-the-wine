import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for isolated concurrency tests`);
  return value;
}

function databaseConfig() {
  const database = requiredEnvironment('RESERVATION_TEST_DATABASE_NAME');
  const configuredPersonalDatabase = process.env.DATABASE_NAME?.trim();
  if (configuredPersonalDatabase && database === configuredPersonalDatabase) {
    throw new Error('RESERVATION_TEST_DATABASE_NAME must differ from DATABASE_NAME');
  }
  return {
    host: requiredEnvironment('RESERVATION_TEST_DATABASE_HOST'),
    port: Number(requiredEnvironment('RESERVATION_TEST_DATABASE_PORT')),
    database,
    user: requiredEnvironment('RESERVATION_TEST_DATABASE_USER'),
    password: process.env.RESERVATION_TEST_DATABASE_PASSWORD ?? '',
  };
}

async function run() {
  const baseUrl = requiredEnvironment('RESERVATION_TEST_BASE_URL').replace(/\/$/, '');
  const connection = await mysql.createConnection(databaseConfig());
  let areaId;
  let tableTypeId;
  let tableId;
  const suffix = Date.now().toString(36);

  try {
    const [area] = await connection.execute(
      'INSERT INTO dining_areas (code, name) VALUES (?, ?)',
      [`codex-phase6-area-${suffix}`, 'Fixture concorrência Phase 6'],
    );
    areaId = area.insertId;

    const [tableType] = await connection.execute(
      `INSERT INTO table_types
        (code, name, capacity_min, capacity_max)
       VALUES (?, ?, ?, ?)`,
      [`codex-phase6-type-${suffix}`, 'Fixture Phase 6', 1, 4],
    );
    tableTypeId = tableType.insertId;

    const [table] = await connection.execute(
      `INSERT INTO restaurant_tables
        (code, name, area_id, table_type_id, capacity_min, capacity_max, shape, joinable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`codex-phase6-table-${suffix}`, 'Fixture concorrência', areaId, tableTypeId, 1, 4, 'quadrada', 1],
    );
    tableId = table.insertId;

    const payload = JSON.stringify({
      date: '2099-12-15',
      time: '19:00',
      guests: 2,
      duration: 120,
      tableIds: [tableId],
    });
    const responses = await Promise.all([1, 2].map(() => fetch(`${baseUrl}/api/reservations/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: payload,
    })));
    const statuses = responses.map((response) => response.status).sort((first, second) => first - second);
    console.log(`Concurrent hold statuses: ${statuses.join(', ')}`);
    if (statuses.join(',') !== '201,409') {
      throw new Error(`Expected one successful hold and one conflict, received ${statuses.join(', ')}`);
    }
  } finally {
    if (tableId) await connection.execute('DELETE FROM reservation_holds WHERE restaurant_table_id = ?', [tableId]);
    if (tableId) await connection.execute('DELETE FROM restaurant_tables WHERE id = ?', [tableId]);
    if (tableTypeId) await connection.execute('DELETE FROM table_types WHERE id = ?', [tableTypeId]);
    if (areaId) await connection.execute('DELETE FROM dining_areas WHERE id = ?', [areaId]);
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Reservation concurrency test failed: ${error.message}`);
  process.exitCode = 1;
});
