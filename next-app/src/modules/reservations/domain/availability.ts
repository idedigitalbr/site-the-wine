const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const blockingStatuses = new Set([
  'hold',
  'payment_pending',
  'pending',
  'confirmed',
  'seated',
]);

export type AvailabilityQuery = {
  reservationDate: string;
  startTime: string;
  guestCount: number;
  durationMinutes: number;
};

export type AvailabilitySearchQuery = Omit<AvailabilityQuery, 'startTime'>;

export type AvailabilityServiceWindow = {
  startTime: string;
  endTime: string;
};

export type AvailabilityTable = {
  id: number;
  code: string;
  name: string;
  areaId: number;
  areaName: string;
  capacityMin: number;
  capacityMax: number;
  active: boolean;
  joinable: boolean;
};

export type AvailabilityReservation = {
  tableId: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type AvailabilityBlock = {
  tableId?: number | null;
  areaId?: number | null;
  startsAt: string;
  endsAt: string;
};

export type TableCombination = {
  id: number;
  code: string;
  tableIds: number[];
  capacityMin: number;
  capacityMax: number;
};

export type AvailabilityInventory = {
  tables: AvailabilityTable[];
  reservations: AvailabilityReservation[];
  blockedPeriods: AvailabilityBlock[];
  combinations: TableCombination[];
  serviceWindows: AvailabilityServiceWindow[];
};

export type AvailabilityOption = {
  tableIds: number[];
  combinationId: number | null;
  capacityMin: number;
  capacityMax: number;
};

export type AvailabilityResult = AvailabilityQuery & {
  endTime: string;
  options: AvailabilityOption[];
};

export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  options: AvailabilityOption[];
};

export type AvailabilitySlotsResult = AvailabilitySearchQuery & {
  slots: AvailabilitySlot[];
};

const availabilitySlotMinutes = 30;

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().startsWith(value);
}

function timeInMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function timestampFromParts(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00Z`);
}

function timestampFromValue(value: string): number {
  return Date.parse(`${value.replace(' ', 'T').replace(/Z$/, '')}Z`);
}

function queryWindow(query: AvailabilityQuery): { startsAt: number; endsAt: number } {
  const startsAt = timestampFromParts(query.reservationDate, query.startTime);
  return {
    startsAt,
    endsAt: startsAt + query.durationMinutes * 60 * 1000,
  };
}

function intervalsOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean {
  return secondStart < firstEnd && secondEnd > firstStart;
}

function isValidGuestCount(guestCount: number): boolean {
  return Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 20;
}

function isValidDuration(durationMinutes: number): boolean {
  return Number.isInteger(durationMinutes)
    && durationMinutes >= 15
    && durationMinutes <= 720;
}

function exceedsDayBoundary(query: AvailabilityQuery): boolean {
  return timePattern.test(query.startTime)
    && query.durationMinutes + timeInMinutes(query.startTime) > 24 * 60;
}

function validateSearchQuery(query: AvailabilitySearchQuery): string[] {
  const errors: string[] = [];

  if (!isCalendarDate(query.reservationDate)) errors.push('reservationDate');
  if (!isValidGuestCount(query.guestCount)) errors.push('guestCount');
  if (!isValidDuration(query.durationMinutes)) {
    errors.push('durationMinutes');
  }

  return errors;
}

function validateQuery(query: AvailabilityQuery): string[] {
  const errors = validateSearchQuery(query);

  if (!timePattern.test(query.startTime)) errors.push('startTime');
  if (exceedsDayBoundary(query)) {
    errors.push('availabilityWindow');
  }

  return errors;
}

function isReservationBlocking(reservation: AvailabilityReservation): boolean {
  return blockingStatuses.has(reservation.status);
}

function blockMatchesTable(block: AvailabilityBlock, table: AvailabilityTable): boolean {
  if (block.tableId !== null && block.tableId !== undefined) return block.tableId === table.id;
  if (block.areaId !== null && block.areaId !== undefined) return block.areaId === table.areaId;
  return true;
}

function tableIsAvailable(
  table: AvailabilityTable,
  inventory: AvailabilityInventory,
  window: { startsAt: number; endsAt: number },
): boolean {
  const hasReservation = inventory.reservations.some((reservation) => (
    reservation.tableId === table.id
    && isReservationBlocking(reservation)
    && intervalsOverlap(
      window.startsAt,
      window.endsAt,
      timestampFromValue(reservation.startsAt),
      timestampFromValue(reservation.endsAt),
    )
  ));
  const hasBlock = inventory.blockedPeriods.some((block) => (
    blockMatchesTable(block, table)
    && intervalsOverlap(
      window.startsAt,
      window.endsAt,
      timestampFromValue(block.startsAt),
      timestampFromValue(block.endsAt),
    )
  ));

  return !hasReservation && !hasBlock;
}

function candidateIsAvailable(
  candidate: AvailabilityOption,
  tablesById: Map<number, AvailabilityTable>,
  inventory: AvailabilityInventory,
  query: AvailabilityQuery,
  window: { startsAt: number; endsAt: number },
): boolean {
  if (query.guestCount < candidate.capacityMin || query.guestCount > candidate.capacityMax) {
    return false;
  }

  const tables = candidate.tableIds.map((tableId) => tablesById.get(tableId));
  if (tables.some((table) => !table)) return false;
  return tables.every((table) => table && tableIsAvailable(table, inventory, window));
}

function buildCandidates(
  tables: AvailabilityTable[],
  combinations: TableCombination[],
): AvailabilityOption[] {
  const singles = tables.map((table) => ({
    tableIds: [table.id],
    combinationId: null,
    capacityMin: table.capacityMin,
    capacityMax: table.capacityMax,
  }));
  const grouped = combinations.map((combination) => ({
    tableIds: combination.tableIds,
    combinationId: combination.id,
    capacityMin: combination.capacityMin,
    capacityMax: combination.capacityMax,
  }));
  return [...singles, ...grouped];
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  return formatTime(timeInMinutes(startTime) + durationMinutes);
}

export function assertValidAvailabilityQuery(query: AvailabilityQuery): void {
  const errors = validateQuery(query);
  if (errors.length > 0) {
    throw new Error(`Invalid availability query: ${errors.join(', ')}`);
  }
}

export function calculateAvailability(
  query: AvailabilityQuery,
  inventory: AvailabilityInventory,
): AvailabilityResult {
  assertValidAvailabilityQuery(query);

  const activeTables = inventory.tables.filter((table) => table.active);
  const tablesById = new Map(activeTables.map((table) => [table.id, table]));
  const window = queryWindow(query);
  const options = buildCandidates(activeTables, inventory.combinations)
    .filter((candidate) => candidateIsAvailable(candidate, tablesById, inventory, query, window));

  return {
    ...query,
    endTime: calculateEndTime(query.startTime, query.durationMinutes),
    options,
  };
}

function slotStartsForWindow(
  window: AvailabilityServiceWindow,
  durationMinutes: number,
): number[] {
  if (!timePattern.test(window.startTime) || !timePattern.test(window.endTime)) return [];

  const firstStart = timeInMinutes(window.startTime);
  const lastStart = timeInMinutes(window.endTime) - durationMinutes;
  const starts: number[] = [];
  for (let start = firstStart; start <= lastStart; start += availabilitySlotMinutes) {
    starts.push(start);
  }
  return starts;
}

export function assertValidAvailabilitySearchQuery(query: AvailabilitySearchQuery): void {
  const errors = validateSearchQuery(query);
  if (errors.length > 0) {
    throw new Error(`Invalid availability query: ${errors.join(', ')}`);
  }
}

export function calculateAvailabilitySlots(
  query: AvailabilitySearchQuery,
  inventory: AvailabilityInventory,
): AvailabilitySlotsResult {
  assertValidAvailabilitySearchQuery(query);
  const slots: AvailabilitySlot[] = [];
  const knownStarts = new Set<string>();

  for (const serviceWindow of inventory.serviceWindows) {
    for (const start of slotStartsForWindow(serviceWindow, query.durationMinutes)) {
      const startTime = formatTime(start);
      if (knownStarts.has(startTime)) continue;

      const availability = calculateAvailability({ ...query, startTime }, inventory);
      if (availability.options.length === 0) continue;

      knownStarts.add(startTime);
      slots.push({
        startTime: availability.startTime,
        endTime: availability.endTime,
        options: availability.options,
      });
    }
  }

  return { ...query, slots };
}
