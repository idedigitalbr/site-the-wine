import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

const context = {
  timezone: 'America/Sao_Paulo',
  now: new Date('2026-10-15T15:00:00.000Z'),
  minimumLeadTimeMinutes: 30,
};

const serviceWindows = [{ startTime: '18:00', endTime: '23:00' }];

test('reservation time policy rejects past dates and times in the establishment timezone', async () => {
  const { assertReservationTimePolicy } = await loadTypeScriptModule('../src/modules/reservations/domain/reservation-time-policy.ts');

  assert.throws(() => assertReservationTimePolicy({ reservationDate: '2026-10-14', startTime: '20:00', durationMinutes: 120, serviceWindows }, context), /past|passad/i);
  assert.throws(() => assertReservationTimePolicy({ reservationDate: '2026-10-15', startTime: '11:00', durationMinutes: 120, serviceWindows }, context), /past|antecedência/i);
});

test('reservation time policy rejects closed windows and accepts a valid future slot', async () => {
  const { assertReservationTimePolicy } = await loadTypeScriptModule('../src/modules/reservations/domain/reservation-time-policy.ts');

  assert.throws(() => assertReservationTimePolicy({ reservationDate: '2026-10-16', startTime: '17:30', durationMinutes: 120, serviceWindows }, context), /service|expediente|horário/i);
  assert.throws(() => assertReservationTimePolicy({ reservationDate: '2026-10-16', startTime: '22:00', durationMinutes: 120, serviceWindows }, context), /service|expediente|horário/i);
  assert.doesNotThrow(() => assertReservationTimePolicy({ reservationDate: '2026-10-16', startTime: '20:00', durationMinutes: 120, serviceWindows }, context));
});

test('general availability derives eligible guest counts and physical table count once', async () => {
  const { calculateGeneralAvailability } = await loadTypeScriptModule('../src/modules/reservations/domain/availability.ts');
  const inventory = {
    tables: [
      { id: 1, code: 'M01', name: 'Mesa 1', areaId: 1, areaName: 'Salão', capacityMin: 1, capacityMax: 4, active: true, joinable: true },
      { id: 2, code: 'M02', name: 'Mesa 2', areaId: 1, areaName: 'Salão', capacityMin: 2, capacityMax: 6, active: true, joinable: true },
    ],
    reservations: [],
    blockedPeriods: [],
    combinations: [{ id: 1, code: 'M01-M02', tableIds: [1, 2], capacityMin: 3, capacityMax: 10 }],
    serviceWindows,
  };

  const result = calculateGeneralAvailability({ reservationDate: '2026-10-16', durationMinutes: 120 }, inventory, {
    validateTime: () => undefined,
    timezone: context.timezone,
  });

  assert.equal(result.timezone, 'America/Sao_Paulo');
  assert.ok(result.slots.length > 0);
  assert.equal(result.slots[0].availableTableCount, 2);
  assert.deepEqual(result.slots[0].eligibleGuestCounts.slice(0, 4), [1, 2, 3, 4]);
});
