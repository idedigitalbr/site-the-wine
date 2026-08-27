import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: relativePath,
  });
  const encoded = Buffer.from(compiled.outputText).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

function table(id, capacityMin, capacityMax, areaId = 1) {
  return {
    id,
    code: `T${id}`,
    name: `Mesa ${id}`,
    areaId,
    areaName: 'Salão principal',
    capacityMin,
    capacityMax,
    active: true,
    joinable: true,
  };
}

test('availability respects duration, capacity and blocking reservations', async () => {
  const { calculateAvailability } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );
  const inventory = {
    tables: [table(1, 2, 4), table(2, 2, 6), table(3, 1, 2)],
    reservations: [{
      tableId: 1,
      startsAt: '2026-09-01T19:00:00Z',
      endsAt: '2026-09-01T21:00:00Z',
      status: 'confirmed',
    }],
    blockedPeriods: [],
    combinations: [],
  };

  const result = calculateAvailability({
    reservationDate: '2026-09-01',
    startTime: '20:00',
    guestCount: 4,
    durationMinutes: 120,
  }, inventory);

  assert.equal(result.endTime, '22:00');
  assert.deepEqual(result.options.map((option) => option.tableIds), [[2]]);
});

test('availability applies a global blocked period to every table', async () => {
  const { calculateAvailability } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );
  const result = calculateAvailability({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    guestCount: 2,
    durationMinutes: 120,
  }, {
    tables: [table(1, 1, 4)],
    reservations: [],
    blockedPeriods: [{
      areaId: null,
      tableId: null,
      startsAt: '2026-09-01T18:00:00Z',
      endsAt: '2026-09-01T23:00:00Z',
    }],
    combinations: [],
  });

  assert.deepEqual(result.options, []);
});

test('availability excludes area blocks and supports simple table combinations', async () => {
  const { calculateAvailability } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );
  const inventory = {
    tables: [table(1, 1, 2, 2), table(2, 1, 2, 2), table(3, 2, 4, 1)],
    reservations: [],
    blockedPeriods: [{
      areaId: 1,
      tableId: null,
      startsAt: '2026-09-01T18:00:00Z',
      endsAt: '2026-09-01T23:00:00Z',
    }],
    combinations: [{
      id: 10,
      code: 'T1-T2',
      tableIds: [1, 2],
      capacityMin: 2,
      capacityMax: 4,
    }],
  };

  const result = calculateAvailability({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    guestCount: 3,
    durationMinutes: 120,
  }, inventory);

  assert.deepEqual(result.options.map((option) => option.tableIds), [[1, 2]]);
  assert.equal(result.options[0].combinationId, 10);
});

test('availability calculations are deterministic for concurrent logical reads', async () => {
  const { calculateAvailability } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );
  const inventory = {
    tables: [table(1, 2, 4), table(2, 2, 4)],
    reservations: [{
      tableId: 1,
      startsAt: '2026-09-01T19:30:00Z',
      endsAt: '2026-09-01T21:00:00Z',
      status: 'hold',
    }],
    blockedPeriods: [],
    combinations: [],
  };
  const query = {
    reservationDate: '2026-09-01',
    startTime: '20:00',
    guestCount: 2,
    durationMinutes: 60,
  };

  const first = calculateAvailability(query, inventory);
  const second = calculateAvailability(query, inventory);

  assert.deepEqual(first, second);
  assert.deepEqual(first.options.map((option) => option.tableIds), [[2]]);
  assert.equal(inventory.reservations.length, 1);
});

test('availability returns only slots with real table inventory', async () => {
  const { calculateAvailabilitySlots } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );
  const inventory = {
    tables: [table(1, 2, 4)],
    reservations: [{
      tableId: 1,
      startsAt: '2026-09-01T19:00:00Z',
      endsAt: '2026-09-01T21:00:00Z',
      status: 'confirmed',
    }],
    blockedPeriods: [],
    combinations: [],
    serviceWindows: [{ startTime: '18:00', endTime: '23:30' }],
  };

  const result = calculateAvailabilitySlots({
    reservationDate: '2026-09-01',
    guestCount: 2,
    durationMinutes: 120,
  }, inventory);

  assert.deepEqual(result.slots.map((slot) => slot.startTime), ['21:00', '21:30']);
});

test('availability rejects invalid windows and duration', async () => {
  const { calculateAvailability } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/availability.ts',
  );

  assert.throws(() => calculateAvailability({
    reservationDate: '2026-02-30',
    startTime: '23:00',
    guestCount: 4,
    durationMinutes: 120,
  }, { tables: [], reservations: [], blockedPeriods: [], combinations: [] }), /Invalid availability query/);
});
