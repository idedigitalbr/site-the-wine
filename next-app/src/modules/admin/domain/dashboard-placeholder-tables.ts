/**
 * Temporary dashboard-only table inventory.
 *
 * This is a placeholder until reservations select real tables. It must never
 * be persisted or used by the reservation, floor-map, or availability flows.
 */
export type PlaceholderTable = {
  id: string;
  label: string;
  capacity: 2 | 4 | 6 | 8;
};

export const placeholderTables: PlaceholderTable[] = [
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `p2-${index + 1}`,
    label: `Mesa ${String(index + 1).padStart(2, "0")}`,
    capacity: 2 as const,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `p4-${index + 1}`,
    label: `Mesa ${String(index + 5).padStart(2, "0")}`,
    capacity: 4 as const,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    id: `p6-${index + 1}`,
    label: `Mesa ${String(index + 11).padStart(2, "0")}`,
    capacity: 6 as const,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    id: `p8-${index + 1}`,
    label: `Mesa ${String(index + 13).padStart(2, "0")}`,
    capacity: 8 as const,
  })),
];

export type PlaceholderReservation = {
  id: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  eligible: boolean;
};

type Allocation = PlaceholderReservation & { tableIds: string[] };

function minutes(value: string): number {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function overlaps(
  first: PlaceholderReservation,
  second: PlaceholderReservation,
): boolean {
  if (first.reservationDate !== second.reservationDate) return false;
  return (
    minutes(first.startTime) < minutes(second.endTime) &&
    minutes(second.startTime) < minutes(first.endTime)
  );
}

function seededOrder<T>(values: T[], seed: string): T[] {
  return [...values]
    .map((value, index) => ({ value, score: hash(`${seed}:${index}`) }))
    .sort((first, second) => first.score - second.score)
    .map(({ value }) => value);
}

function selectTables(
  reservation: PlaceholderReservation,
  previous: Allocation[],
): string[] {
  if (!reservation.eligible || reservation.guestCount < 1) return [];
  const occupied = new Set(
    previous
      .filter((item) => overlaps(item, reservation))
      .flatMap((item) => item.tableIds),
  );
  const available = seededOrder(
    placeholderTables.filter((table) => !occupied.has(table.id)),
    `${reservation.id}:${reservation.reservationDate}`,
  ).sort((first, second) => first.capacity - second.capacity);
  const chosen: PlaceholderTable[] = [];
  let capacity = 0;
  for (const table of available) {
    chosen.push(table);
    capacity += table.capacity;
    if (capacity >= reservation.guestCount) break;
  }
  return capacity >= reservation.guestCount
    ? chosen.map((table) => table.id)
    : [];
}

export function allocatePlaceholderTables(
  reservations: PlaceholderReservation[],
): Map<number, string[]> {
  const allocated: Allocation[] = [];
  const ordered = [...reservations].sort(
    (first, second) =>
      first.reservationDate.localeCompare(second.reservationDate) ||
      minutes(first.startTime) - minutes(second.startTime) ||
      first.id - second.id,
  );
  for (const reservation of ordered) {
    allocated.push({
      ...reservation,
      tableIds: selectTables(reservation, allocated),
    });
  }
  return new Map(allocated.map((item) => [item.id, item.tableIds]));
}

export function placeholderTableLabels(ids: string[]): string | null {
  if (ids.length === 0) return null;
  const labels = ids
    .map((id) => placeholderTables.find((table) => table.id === id)?.label)
    .filter(Boolean);
  return labels.length ? labels.join(" · ") : null;
}

export function tableCapacityMetrics(
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
) {
  const byDate = reservationsByDate(reservations);
  return ([2, 4, 6, 8] as const).map((capacity) => {
    const total = placeholderTables.filter(
      (table) => table.capacity === capacity,
    ).length;
    const peak = Math.min(
      total,
      Math.max(
        0,
        ...[...byDate.values()].map((items) =>
          capacityPeakForDate(capacity, allocations, items),
        ),
      ),
    );
    return {
      capacity,
      occupied: peak,
      total,
      percentage: total ? Math.round((peak / total) * 100) : 0,
    };
  });
}

function capacityPeakForDate(
  capacity: 2 | 4 | 6 | 8,
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
): number {
  let peak = 0;
  for (const reservation of reservations) {
    const concurrentTables = new Set(
      reservations
        .filter((other) => overlaps(reservation, other))
        .flatMap((other) => allocations.get(other.id) ?? [])
        .filter(
          (tableId) =>
            placeholderTables.find((table) => table.id === tableId)
              ?.capacity === capacity,
        ),
    );
    peak = Math.max(peak, concurrentTables.size);
  }
  return peak;
}

function reservationsByDate(
  reservations: PlaceholderReservation[],
): Map<string, PlaceholderReservation[]> {
  const byDate = new Map<string, PlaceholderReservation[]>();
  for (const reservation of reservations) {
    if (!reservation.eligible) continue;
    const list = byDate.get(reservation.reservationDate) ?? [];
    list.push(reservation);
    byDate.set(reservation.reservationDate, list);
  }
  return byDate;
}

function committedTablesAtSlot(
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
  slot: number,
): number {
  const occupied = new Set<string>();
  for (const reservation of reservations) {
    if (
      minutes(reservation.startTime) <= slot &&
      minutes(reservation.endTime) > slot
    ) {
      for (const tableId of allocations.get(reservation.id) ?? [])
        occupied.add(tableId);
    }
  }
  return occupied.size;
}

export function availabilityMetrics(
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
) {
  const byDate = reservationsByDate(reservations);
  const dates = [...byDate.keys()].sort();
  if (dates.length === 0) return [];
  const eligible = [...byDate.values()].flat();
  const start = Math.min(
    ...eligible.map((reservation) => minutes(reservation.startTime)),
  );
  const end = Math.max(
    ...eligible.map((reservation) => minutes(reservation.endTime)),
  );
  const slots: Array<{ label: string; committed: number; available: number }> =
    [];
  for (let slot = Math.floor(start / 30) * 30; slot < end; slot += 30) {
    const committed = dates.reduce(
      (total, date) =>
        total +
        committedTablesAtSlot(allocations, byDate.get(date) ?? [], slot),
      0,
    );
    const average = dates.length
      ? Math.round((committed / dates.length) * 10) / 10
      : 0;
    slots.push({
      label: `${String(Math.floor(slot / 60) % 24).padStart(2, "0")}:${String(slot % 60).padStart(2, "0")}`,
      committed: average,
      available: Math.max(0, placeholderTables.length - average),
    });
  }
  return slots;
}

function peakForDay(
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
): number {
  let peak = 0;
  for (const reservation of reservations)
    peak = Math.max(
      peak,
      overlappingTableCount(allocations, reservation, reservations),
    );
  return peak;
}

function overlappingTableCount(
  allocations: Map<number, string[]>,
  reservation: PlaceholderReservation,
  reservations: PlaceholderReservation[],
): number {
  return new Set(
    reservations
      .filter((other) => overlaps(reservation, other))
      .flatMap((other) => allocations.get(other.id) ?? []),
  ).size;
}

export function peakReservedTables(
  allocations: Map<number, string[]>,
  reservations: PlaceholderReservation[],
): number {
  let peak = 0;
  for (const dayReservations of reservationsByDate(reservations).values())
    peak = Math.max(peak, peakForDay(allocations, dayReservations));
  return peak;
}
