import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { getDatabasePool } from "@/server/db";
import type { ReservationOperation } from "@/modules/reservations/domain/reservation-operation";
import type { ReservationStatus } from "@/modules/reservations/domain/reservation-status";
import type { WaitlistStatus } from "@/modules/reservations/domain/waitlist";
import {
  reservationEventLabel,
  reservationStatusLabel,
} from "@/lib/admin-labels";
import {
  allocatePlaceholderTables,
  availabilityMetrics,
  peakReservedTables,
  placeholderTableLabels,
  tableCapacityMetrics,
  type PlaceholderReservation,
} from "../domain/dashboard-placeholder-tables";
import type {
  AdminArea,
  AdminBlockedPeriod,
  AdminBusinessHour,
  AdminCombination,
  AdminConfiguration,
  AdminConfigurationUpdate,
  AdminCustomer,
  AdminCustomerActivity,
  AdminCustomerProfile,
  AdminCustomerReservation,
  AdminDashboard,
  AdminDashboardAlert,
  AdminDashboardQuery,
  AdminDashboardReservation,
  AdminDashboardUpdate,
  AdminFloorMap,
  AdminFloorPlanSettings,
  AdminRepository,
  AdminReservation,
  AdminReservationAssignment,
  AdminReservationOperationState,
  AdminReservationSchedule,
  AdminReservationTimelineEntry,
  AdminWaitlistEntry,
  AdminShift,
  AdminTable,
  AdminTableType,
  CreateAreaInput,
  CreateBlockedPeriodInput,
  CreateBusinessHourInput,
  CreateCombinationInput,
  CreateShiftInput,
  CreateTableInput,
  CreateTableTypeInput,
  CreateWalkInReservationInput,
  ConfigurationResource,
  FloorTable,
  FloorTableState,
  UpdateTablePositionInput,
  UpdateFloorPlanSettingsInput,
} from "../application/ports";

/* eslint-disable complexity */

type ReservationRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  tableLabel: string | null;
  tableIds: string | null;
  notes: string | null;
  source: string;
  checkedInAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
};

type DashboardReservationRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  tableLabel: string | null;
  areaName: string | null;
  notes: string | null;
  source: string;
  checkedInAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  paymentStatus: string | null;
  paymentDeadlineAt: string | null;
  seatGuaranteeExpiresAt: string | null;
  checkoutMode: string | null;
  paymentPendingActive: number;
};

type DashboardUpdateRow = RowDataPacket & {
  id: number;
  reservationId: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  customerName: string;
  reservationDate: string;
  createdAt: string;
};

type DashboardSummaryRow = RowDataPacket & {
  reservations: number;
  expectedGuests: number;
  activeGuarantees: number;
  pendingPayments: number;
};

type ReservationOperationStateRow = RowDataPacket & {
  status: string;
  checkedInAt: string | null;
};

type ReservationTimelineRow = RowDataPacket & {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorType: string;
  actorLabel: string | null;
  createdAt: string;
};

type ReservationScheduleRow = RowDataPacket & {
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  tableIds: string | null;
};
type AssignmentTableRow = RowDataPacket & {
  id: number;
  capacityMin: number;
  capacityMax: number;
  joinable: number;
};

type WaitlistRow = RowDataPacket & {
  id: number;
  referenceCode: string;
  reservationDate: string;
  preferredTime: string | null;
  guestCount: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  createdAt: string;
};

type CustomerRow = RowDataPacket & {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  marketingConsent: number;
  firstReservationDate: string | null;
  lastReservationDate: string | null;
  reservationCount: number;
  completedReservations: number;
  noShowCount: number;
  totalCovers: number;
  createdAt: string;
};
type CustomerReservationRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  source: string;
  tableLabel: string | null;
  notes: string | null;
};
type CustomerActivityRow = RowDataPacket & {
  id: number;
  reservationId: number;
  publicCode: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorType: string;
  actorLabel: string | null;
  createdAt: string;
};

type StatusRow = RowDataPacket & { status: string };
type AreaRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  active: number;
};
type TableTypeRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  capacityMin: number;
  capacityMax: number;
  active: number;
};
type TableRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  areaId: number;
  areaName: string;
  tableTypeId: number;
  tableTypeName: string;
  capacityMin: number;
  capacityMax: number;
  shape: string;
  positionX: number;
  positionY: number;
  joinable: number;
  active: number;
};
type FloorTableRow = TableRow & { state: FloorTableState };
type ShiftRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: number;
};
type BusinessHourRow = RowDataPacket & {
  id: number;
  dayOfWeek: number;
  shiftId: number;
  shiftName: string;
  opensAt: string;
  closesAt: string;
  active: number;
};
type CombinationRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  tableIds: string | null;
  tableLabel: string | null;
  active: number;
};
type FloorPlanSettingsRow = RowDataPacket & {
  backgroundUrl: string | null;
  backgroundOpacity: number;
};
type BlockedPeriodRow = RowDataPacket & {
  id: number;
  areaId: number | null;
  areaName: string | null;
  tableId: number | null;
  tableName: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  active: number;
};
type CountRow = RowDataPacket & { count: number };

function configurationTable(resource: ConfigurationResource): string {
  const tables: Record<ConfigurationResource, string> = {
    area: "dining_areas",
    table_type: "table_types",
    table: "restaurant_tables",
    shift: "service_shifts",
    business_hour: "business_hours",
  };
  return tables[resource];
}

async function withTransaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function placeholders(values: number[]): string {
  return values.map(() => "?").join(", ");
}

function mapReservation(row: ReservationRow): AdminReservation {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    status: row.status as ReservationStatus,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    tableLabel: row.tableLabel,
    tableIds: row.tableIds ? row.tableIds.split(",").map(Number) : [],
    notes: row.notes,
    source: row.source,
    checkedInAt: row.checkedInAt,
    seatedAt: row.seatedAt,
    completedAt: row.completedAt,
    noShowAt: row.noShowAt,
  };
}

function mapWaitlist(row: WaitlistRow): AdminWaitlistEntry {
  return {
    id: Number(row.id),
    referenceCode: row.referenceCode,
    reservationDate: row.reservationDate,
    preferredTime: row.preferredTime,
    guestCount: Number(row.guestCount),
    status: row.status as WaitlistStatus,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function mapCustomer(row: CustomerRow): AdminCustomer {
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    marketingConsent: Boolean(row.marketingConsent),
    firstReservationDate: row.firstReservationDate,
    lastReservationDate: row.lastReservationDate,
    reservationCount: Number(row.reservationCount),
    completedReservations: Number(row.completedReservations),
    noShowCount: Number(row.noShowCount),
    totalCovers: Number(row.totalCovers),
    createdAt: row.createdAt,
  };
}

function mapCustomerReservation(
  row: CustomerReservationRow,
): AdminCustomerReservation {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    status: row.status as ReservationStatus,
    source: row.source,
    tableLabel: row.tableLabel,
    notes: row.notes,
  };
}

function mapCustomerActivity(row: CustomerActivityRow): AdminCustomerActivity {
  return {
    id: Number(row.id),
    reservationId: Number(row.reservationId),
    publicCode: row.publicCode,
    eventType: row.eventType,
    fromStatus: row.fromStatus as ReservationStatus | null,
    toStatus: row.toStatus as ReservationStatus | null,
    actorType: row.actorType,
    actorLabel: row.actorLabel,
    createdAt: row.createdAt,
  };
}

function mapArea(row: AreaRow): AdminArea {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    active: Boolean(row.active),
  };
}

function mapTableType(row: TableTypeRow): AdminTableType {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    capacityMin: Number(row.capacityMin),
    capacityMax: Number(row.capacityMax),
    active: Boolean(row.active),
  };
}

function mapTable(row: TableRow): AdminTable {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    areaId: Number(row.areaId),
    areaName: row.areaName,
    tableTypeId: Number(row.tableTypeId),
    tableTypeName: row.tableTypeName,
    capacityMin: Number(row.capacityMin),
    capacityMax: Number(row.capacityMax),
    shape: row.shape,
    positionX: Number(row.positionX),
    positionY: Number(row.positionY),
    joinable: Boolean(row.joinable),
    active: Boolean(row.active),
  };
}

function mapFloorTable(row: FloorTableRow): FloorTable {
  return { ...mapTable(row), state: row.state };
}

function mapShift(row: ShiftRow): AdminShift {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    active: Boolean(row.active),
  };
}

function mapBusinessHour(row: BusinessHourRow): AdminBusinessHour {
  return {
    id: Number(row.id),
    dayOfWeek: Number(row.dayOfWeek),
    shiftId: Number(row.shiftId),
    shiftName: row.shiftName,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    active: Boolean(row.active),
  };
}

function mapCombination(row: CombinationRow): AdminCombination {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    tableIds: row.tableIds ? row.tableIds.split(",").map(Number) : [],
    tableLabel: row.tableLabel ?? "",
    active: Boolean(row.active),
  };
}

function mapFloorPlanSettings(
  row: FloorPlanSettingsRow | undefined,
): AdminFloorPlanSettings {
  return {
    url: row?.backgroundUrl ?? null,
    opacity: Math.min(
      0.8,
      Math.max(0.1, Number(row?.backgroundOpacity ?? 0.24)),
    ),
  };
}

function mapBlockedPeriod(row: BlockedPeriodRow): AdminBlockedPeriod {
  return {
    id: Number(row.id),
    areaId: row.areaId === null ? null : Number(row.areaId),
    areaName: row.areaName,
    tableId: row.tableId === null ? null : Number(row.tableId),
    tableName: row.tableName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reason: row.reason,
    active: Boolean(row.active),
  };
}

function dashboardPaymentStatus(
  value: string | null,
): AdminDashboardReservation["paymentStatus"] {
  if (value === "paid") return "paid";
  if (value === "pending" || value === "processing") return "pending";
  if (!value) return "not_realized";
  return "unknown";
}

function dashboardPaymentLabel(
  status: AdminDashboardReservation["paymentStatus"],
): string {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  if (status === "not_realized") return "Não realizado";
  return "Indisponível";
}

function periodLabel(fromDate: string, toDate: string): string {
  const timeZone =
    process.env.RESERVATION_ESTABLISHMENT_TIMEZONE?.trim() ||
    "America/Sao_Paulo";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(),
  );
  const yesterdayDate = new Date(`${today}T12:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (fromDate === toDate && fromDate === today) return "Hoje";
  if (fromDate === toDate && fromDate === yesterday) return "Ontem";
  if (fromDate === toDate) return formatPeriodDate(fromDate);
  if (toDate === today) return `${formatPeriodDate(fromDate)} – hoje`;
  return `${formatPeriodDate(fromDate)} – ${formatPeriodDate(toDate)}`;
}

function formatPeriodDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

function dashboardFilters(query: AdminDashboardQuery): {
  where: string;
  params: Array<string | number>;
} {
  const filters: string[] = [
    "r.status NOT IN ('draft', 'hold')",
    "r.reservation_date BETWEEN ? AND ?",
  ];
  const params: Array<string | number> = [query.fromDate, query.toDate];
  if (query.search) {
    filters.push("(c.name LIKE ? OR c.phone LIKE ? OR r.public_code LIKE ?)");
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
  }
  if (query.time) {
    filters.push("TIME_FORMAT(r.start_time, '%H:%i') = ?");
    params.push(query.time);
  }
  if (query.status) {
    filters.push("r.status = ?");
    params.push(query.status);
  }
  if (query.areaId !== undefined) {
    if (query.areaId === 0) {
      filters.push(
        "NOT EXISTS (SELECT 1 FROM reservation_tables filter_rt INNER JOIN restaurant_tables filter_t ON filter_t.id = filter_rt.restaurant_table_id WHERE filter_rt.reservation_id = r.id AND filter_t.area_id IS NOT NULL)",
      );
    } else {
      filters.push(
        "EXISTS (SELECT 1 FROM reservation_tables filter_rt INNER JOIN restaurant_tables filter_t ON filter_t.id = filter_rt.restaurant_table_id WHERE filter_rt.reservation_id = r.id AND filter_t.area_id = ?)",
      );
      params.push(query.areaId);
    }
  }
  return { where: filters.join(" AND "), params };
}

function dashboardPlaceholderReservations(
  rows: DashboardReservationRow[],
): PlaceholderReservation[] {
  return rows.map((row) => ({
    id: Number(row.id),
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    eligible:
      ["payment_pending", "pending", "confirmed", "seated"].includes(
        row.status,
      ) &&
      (row.status !== "payment_pending" || Boolean(row.paymentPendingActive)),
  }));
}

function mapDashboardReservation(
  row: DashboardReservationRow,
  allocations: Map<number, string[]>,
): AdminDashboardReservation {
  const allocation = allocations.get(Number(row.id)) ?? [];
  const paymentStatus = dashboardPaymentStatus(row.paymentStatus);
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    status: row.status as ReservationStatus,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    tableLabel: row.tableLabel,
    tableIds: [],
    notes: row.notes,
    source: row.source,
    checkedInAt: row.checkedInAt,
    seatedAt: row.seatedAt,
    completedAt: row.completedAt,
    noShowAt: row.noShowAt,
    paymentStatus,
    paymentLabel: dashboardPaymentLabel(paymentStatus),
    estimatedTableLabel: placeholderTableLabels(allocation),
    areaName: row.areaName,
    paymentDeadlineAt: row.paymentDeadlineAt,
  };
}

function dashboardDistribution(rows: DashboardReservationRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const total =
    [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;
  const entries = [...counts.entries()];
  const rounded = entries.map(([, count]) => Math.round((count / total) * 100));
  const correction = 100 - rounded.reduce((sum, value) => sum + value, 0);
  return entries.map(([status, count], index) => ({
    status: status as ReservationStatus,
    label: reservationStatusLabel(status),
    count,
    percentage:
      rounded[index] + (index === rounded.length - 1 ? correction : 0),
  }));
}

function dashboardAlerts(
  reservations: AdminDashboardReservation[],
): AdminDashboardAlert[] {
  return reservations
    .filter((reservation) => reservation.status === "payment_pending")
    .sort((first, second) =>
      (first.paymentDeadlineAt ?? "9999").localeCompare(
        second.paymentDeadlineAt ?? "9999",
      ),
    )
    .map((reservation) => ({
      id: reservation.id,
      type: "payment_pending" as const,
      title: "Pagamento pendente",
      customerName: reservation.customerName,
      reservationDate: reservation.reservationDate,
      startTime: reservation.startTime,
      estimatedTableLabel: reservation.estimatedTableLabel,
      detail: reservation.paymentDeadlineAt
        ? `Aguardando confirmação até ${reservation.paymentDeadlineAt.slice(-5)}`
        : "Aguardando confirmação",
      paymentDeadlineAt: reservation.paymentDeadlineAt,
    }));
}

function dashboardUpdates(
  rows: DashboardUpdateRow[],
  allocations: Map<number, string[]>,
): AdminDashboardUpdate[] {
  return rows.map((row) => ({
    id: Number(row.id),
    reservationId: Number(row.reservationId),
    eventType: row.eventType,
    eventLabel: reservationEventLabel(
      row.eventType,
      row.fromStatus,
      row.toStatus,
    ),
    customerName: row.customerName,
    reservationDate: row.reservationDate,
    estimatedTableLabel: placeholderTableLabels(
      allocations.get(Number(row.reservationId)) ?? [],
    ),
    createdAt: row.createdAt,
    toStatus: row.toStatus as ReservationStatus | null,
  }));
}

async function loadAssignmentTables(
  connection: PoolConnection,
  tableIds: number[],
): Promise<AssignmentTableRow[]> {
  const [tables] = await connection.execute<AssignmentTableRow[]>(
    `SELECT id, capacity_min AS capacityMin, capacity_max AS capacityMax, joinable
     FROM restaurant_tables
     WHERE id IN (${placeholders(tableIds)}) AND active = 1
     FOR UPDATE`,
    tableIds,
  );
  if (tables.length !== tableIds.length)
    throw new Error("Invalid reservation tables");
  return tables;
}

function validateAssignmentCapacity(
  tables: AssignmentTableRow[],
  tableIds: number[],
  guestCount: number,
): void {
  if (tableIds.length > 1 && tables.some((table) => !table.joinable)) {
    throw new Error("Reservation tables cannot be combined");
  }
  const minimumCapacity = tables.reduce(
    (total, table) => total + Number(table.capacityMin),
    0,
  );
  if (guestCount < minimumCapacity)
    throw new Error("Reservation tables capacity minimum not met");
  const capacity = tables.reduce(
    (total, table) => total + Number(table.capacityMax),
    0,
  );
  if (capacity < guestCount)
    throw new Error("Reservation tables capacity exceeded");
}

async function validateAssignmentCombination(
  connection: PoolConnection,
  tableIds: number[],
): Promise<void> {
  if (tableIds.length < 2) return;
  const [combinations] = await connection.execute<RowDataPacket[]>(
    `SELECT tc.id
     FROM table_combinations tc
     INNER JOIN table_combination_items tci ON tci.combination_id = tc.id
     WHERE tc.active = 1
     GROUP BY tc.id
     HAVING COUNT(*) = ? AND SUM(tci.table_id IN (${placeholders(tableIds)})) = ?
     LIMIT 1`,
    [tableIds.length, ...tableIds, tableIds.length],
  );
  if (combinations.length === 0)
    throw new Error("Reservation tables combination not configured");
}

async function validateAssignmentConflicts(
  connection: PoolConnection,
  reservationId: number,
  tableIds: number[],
  schedule: AdminReservationSchedule,
): Promise<void> {
  const [conflicts] = await connection.execute<CountRow[]>(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT r.id
       FROM reservations r
       INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
       WHERE rt.restaurant_table_id IN (${placeholders(tableIds)})
         AND r.id <> ?
         AND r.reservation_date = ?
         AND r.status IN ('hold', 'payment_pending', 'pending', 'confirmed', 'seated')
         AND r.start_time < ? AND r.end_time > ?
       UNION ALL
       SELECT h.id
       FROM reservation_holds h
       WHERE h.restaurant_table_id IN (${placeholders(tableIds)})
         AND h.expires_at > CURRENT_TIMESTAMP
         AND h.reservation_starts_at IS NOT NULL
         AND h.reservation_ends_at IS NOT NULL
         AND h.reservation_starts_at < ?
         AND h.reservation_ends_at > ?
     ) conflict_rows`,
    [
      ...tableIds,
      reservationId,
      schedule.reservationDate,
      schedule.endTime,
      schedule.startTime,
      `${schedule.reservationDate} ${schedule.endTime}:00`,
      `${schedule.reservationDate} ${schedule.startTime}:00`,
    ],
  );
  if (Number(conflicts[0]?.count ?? 0) > 0)
    throw new Error("Reservation tables unavailable");
}

async function validateAssignmentBlocks(
  connection: PoolConnection,
  tableIds: number[],
  schedule: AdminReservationSchedule,
): Promise<void> {
  const [blocks] = await connection.execute<RowDataPacket[]>(
    `SELECT bp.id
     FROM blocked_periods bp
     WHERE bp.active = 1
       AND (
         bp.restaurant_table_id IN (${placeholders(tableIds)})
         OR bp.dining_area_id IN (
           SELECT area_id FROM restaurant_tables WHERE id IN (${placeholders(tableIds)})
         )
         OR (bp.restaurant_table_id IS NULL AND bp.dining_area_id IS NULL)
       )
       AND bp.starts_at < ? AND bp.ends_at > ?
     LIMIT 1`,
    [
      ...tableIds,
      ...tableIds,
      `${schedule.reservationDate} ${schedule.endTime}:00`,
      `${schedule.reservationDate} ${schedule.startTime}:00`,
    ],
  );
  if (blocks.length > 0) throw new Error("Reservation tables blocked");
}

async function validateReservationTables(
  connection: PoolConnection,
  reservationId: number,
  tableIds: number[],
  schedule: AdminReservationSchedule,
  guestCount: number,
): Promise<void> {
  if (tableIds.length === 0) return;
  const tables = await loadAssignmentTables(connection, tableIds);
  validateAssignmentCapacity(tables, tableIds, guestCount);
  await validateAssignmentCombination(connection, tableIds);
  await validateAssignmentConflicts(
    connection,
    reservationId,
    tableIds,
    schedule,
  );
  await validateAssignmentBlocks(connection, tableIds, schedule);
}

const reservationSelect = `
  SELECT
    r.id,
    r.public_code AS publicCode,
    DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
    TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
    TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
    r.guest_count AS guestCount,
    r.status,
    r.source,
    DATE_FORMAT(r.checked_in_at, '%Y-%m-%d %H:%i') AS checkedInAt,
    DATE_FORMAT(r.seated_at, '%Y-%m-%d %H:%i') AS seatedAt,
    DATE_FORMAT(r.completed_at, '%Y-%m-%d %H:%i') AS completedAt,
    DATE_FORMAT(r.no_show_at, '%Y-%m-%d %H:%i') AS noShowAt,
    c.name AS customerName,
    c.phone AS customerPhone,
    c.email AS customerEmail,
    GROUP_CONCAT(DISTINCT t.id ORDER BY t.id SEPARATOR ',') AS tableIds,
    GROUP_CONCAT(DISTINCT CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel,
    r.notes
  FROM reservations r
  INNER JOIN customers c ON c.id = r.customer_id
  LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
  LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id`;

const dashboardReservationSelect = `
  SELECT
    r.id,
    r.public_code AS publicCode,
    DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
    TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
    TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
    r.guest_count AS guestCount,
    r.status,
    r.source,
    DATE_FORMAT(r.checked_in_at, '%Y-%m-%d %H:%i') AS checkedInAt,
    DATE_FORMAT(r.seated_at, '%Y-%m-%d %H:%i') AS seatedAt,
    DATE_FORMAT(r.completed_at, '%Y-%m-%d %H:%i') AS completedAt,
    DATE_FORMAT(r.no_show_at, '%Y-%m-%d %H:%i') AS noShowAt,
    DATE_FORMAT(r.payment_deadline_at, '%Y-%m-%d %H:%i') AS paymentDeadlineAt,
    DATE_FORMAT(r.seat_guarantee_expires_at, '%Y-%m-%d %H:%i') AS seatGuaranteeExpiresAt,
    r.checkout_mode AS checkoutMode,
    CASE WHEN r.status = 'payment_pending'
      AND (r.checkout_mode IS NULL OR (r.seat_guarantee_expires_at > UTC_TIMESTAMP(3) AND r.payment_deadline_at > UTC_TIMESTAMP(3)))
      THEN 1 ELSE 0 END AS paymentPendingActive,
    c.name AS customerName,
    c.phone AS customerPhone,
    c.email AS customerEmail,
    GROUP_CONCAT(DISTINCT CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel,
    GROUP_CONCAT(DISTINCT da.name ORDER BY da.id SEPARATOR ', ') AS areaName,
    r.notes,
    latest_payment.status AS paymentStatus
  FROM reservations r
  INNER JOIN customers c ON c.id = r.customer_id
  LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
  LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id
  LEFT JOIN dining_areas da ON da.id = t.area_id
  LEFT JOIN (
    SELECT p.reservation_id, p.status
    FROM payments p
    INNER JOIN (
      SELECT reservation_id, MAX(id) AS id
      FROM payments
      GROUP BY reservation_id
    ) current_payment ON current_payment.reservation_id = p.reservation_id AND current_payment.id = p.id
  ) latest_payment ON latest_payment.reservation_id = r.id`;

const customerSummarySelect = `
  SELECT
    c.id,
    c.name,
    c.phone,
    c.email,
    c.marketing_consent AS marketingConsent,
    DATE_FORMAT(MIN(r.reservation_date), '%Y-%m-%d') AS firstReservationDate,
    DATE_FORMAT(MAX(r.reservation_date), '%Y-%m-%d') AS lastReservationDate,
    COUNT(r.id) AS reservationCount,
    COALESCE(SUM(r.status = 'completed'), 0) AS completedReservations,
    COALESCE(SUM(r.status = 'no_show'), 0) AS noShowCount,
    COALESCE(SUM(CASE WHEN r.status IN ('pending', 'confirmed', 'seated', 'completed') THEN r.guest_count ELSE 0 END), 0) AS totalCovers,
    DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS createdAt
  FROM customers c
  LEFT JOIN reservations r ON r.customer_id = c.id
    AND r.status NOT IN ('draft', 'hold', 'payment_pending', 'expired')`;

export class MysqlAdminRepository implements AdminRepository {
  async getDashboard(query: AdminDashboardQuery): Promise<AdminDashboard> {
    const fromDate = query.fromDate;
    const toDate = query.toDate;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 9;
    const offset = (page - 1) * pageSize;
    const pool = getDatabasePool();
    const validStatusSql = "r.status NOT IN ('draft', 'hold')";
    const activeGuestsSql =
      "r.status IN ('payment_pending', 'pending', 'confirmed', 'seated') AND (r.status <> 'payment_pending' OR r.checkout_mode IS NULL OR (r.seat_guarantee_expires_at > UTC_TIMESTAMP(3) AND r.payment_deadline_at > UTC_TIMESTAMP(3)))";
    const filters = dashboardFilters(query);
    const [
      summaryResult,
      allRowsResult,
      countResult,
      pageRowsResult,
      updatesResult,
      areasResult,
    ] = await Promise.all([
      pool.execute<DashboardSummaryRow[]>(
        `SELECT COUNT(*) AS reservations,
                COALESCE(SUM(CASE WHEN ${activeGuestsSql} THEN r.guest_count ELSE 0 END), 0) AS expectedGuests,
                COALESCE(SUM(CASE WHEN r.status = 'payment_pending' AND (r.checkout_mode IS NULL OR (r.seat_guarantee_expires_at > UTC_TIMESTAMP(3) AND r.payment_deadline_at > UTC_TIMESTAMP(3))) THEN 1 ELSE 0 END), 0) AS activeGuarantees,
                COALESCE(SUM(r.status = 'payment_pending'), 0) AS pendingPayments
         FROM reservations r
         WHERE ${validStatusSql} AND r.reservation_date BETWEEN ? AND ?`,
        [fromDate, toDate],
      ),
      pool.execute<DashboardReservationRow[]>(
        `${dashboardReservationSelect}
         WHERE ${validStatusSql} AND r.reservation_date BETWEEN ? AND ?
         GROUP BY r.id, c.id, latest_payment.status
         ORDER BY r.reservation_date ASC, r.start_time ASC, r.id DESC`,
        [fromDate, toDate],
      ),
      pool.execute<CountRow[]>(
        `SELECT COUNT(DISTINCT r.id) AS count
         FROM reservations r INNER JOIN customers c ON c.id = r.customer_id
         LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
         LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id
         WHERE ${filters.where}`,
        filters.params,
      ),
      pool.execute<DashboardReservationRow[]>(
        `${dashboardReservationSelect}
         WHERE ${filters.where}
         GROUP BY r.id, c.id, latest_payment.status
         ORDER BY r.reservation_date ASC, r.start_time ASC, r.id DESC
         LIMIT ? OFFSET ?`,
        [...filters.params, pageSize, offset],
      ),
      pool.execute<DashboardUpdateRow[]>(
        `SELECT e.id, e.reservation_id AS reservationId, e.event_type AS eventType,
                e.from_status AS fromStatus, e.to_status AS toStatus,
                c.name AS customerName, DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
                DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') AS createdAt
         FROM reservation_events e
         INNER JOIN reservations r ON r.id = e.reservation_id
         INNER JOIN customers c ON c.id = r.customer_id
         WHERE r.reservation_date BETWEEN ? AND ?
         ORDER BY e.created_at DESC, e.id DESC
         LIMIT 5`,
        [fromDate, toDate],
      ),
      pool.execute<AreaRow[]>(
        `SELECT id, code, name, active FROM dining_areas WHERE active = 1 ORDER BY name, id`,
      ),
    ]);
    const allRows = allRowsResult[0];
    const placeholderReservations = dashboardPlaceholderReservations(allRows);
    const allocations = allocatePlaceholderTables(placeholderReservations);
    const reservations = allRows.map((row) =>
      mapDashboardReservation(row, allocations),
    );
    const summary = summaryResult[0][0];
    const peak = peakReservedTables(allocations, placeholderReservations);
    const totalTables = 14;
    const distribution = dashboardDistribution(allRows);
    const alerts = dashboardAlerts(reservations);
    const updates = dashboardUpdates(updatesResult[0], allocations);
    return {
      fromDate,
      toDate,
      periodLabel: periodLabel(fromDate, toDate),
      metrics: {
        reservations: Number(summary?.reservations ?? 0),
        expectedGuests: Number(summary?.expectedGuests ?? 0),
        reservedTables: peak,
        activeGuarantees: Number(summary?.activeGuarantees ?? 0),
        pendingPayments: Number(summary?.pendingPayments ?? 0),
        occupancyRate: Math.min(100, Math.round((peak / totalTables) * 100)),
        totalTables,
      },
      reservations: {
        items: pageRowsResult[0].map((row) =>
          mapDashboardReservation(row, allocations),
        ),
        total: Number(countResult[0][0]?.count ?? 0),
        page,
        pageSize,
      },
      alerts,
      updates,
      availability: availabilityMetrics(allocations, placeholderReservations),
      distribution,
      tableTypes: tableCapacityMetrics(allocations, placeholderReservations),
      areas: areasResult[0].map((area) => ({
        id: Number(area.id),
        code: area.code,
        name: area.name,
        active: Boolean(area.active),
      })),
    };
  }

  async listCustomers(search?: string): Promise<AdminCustomer[]> {
    const value = search?.trim() ?? "";
    const filter = value
      ? "WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?"
      : "";
    const params = value ? [`%${value}%`, `%${value}%`, `%${value}%`] : [];
    const [rows] = await getDatabasePool().execute<CustomerRow[]>(
      `
      ${customerSummarySelect}
      ${filter}
      GROUP BY c.id
      ORDER BY MAX(r.reservation_date) DESC, c.created_at DESC, c.id DESC
      LIMIT 100
    `,
      params,
    );
    return rows.map(mapCustomer);
  }

  async getCustomerProfile(id: number): Promise<AdminCustomerProfile | null> {
    const pool = getDatabasePool();
    const [customerRows] = await pool.execute<CustomerRow[]>(
      `
      ${customerSummarySelect}
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `,
      [id],
    );
    const customer = customerRows[0];
    if (!customer) return null;

    const [reservationRows, activityRows] = await Promise.all([
      pool.execute<CustomerReservationRow[]>(
        `
        SELECT
          r.id,
          r.public_code AS publicCode,
          DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
          TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
          TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
          r.guest_count AS guestCount,
          r.status,
          r.source,
          GROUP_CONCAT(DISTINCT CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel,
          r.notes
        FROM reservations r
        LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
        LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id
        WHERE r.customer_id = ?
        GROUP BY r.id
        ORDER BY r.reservation_date DESC, r.start_time DESC, r.id DESC
        LIMIT 100
      `,
        [id],
      ),
      pool.execute<CustomerActivityRow[]>(
        `
        SELECT
          e.id,
          e.reservation_id AS reservationId,
          r.public_code AS publicCode,
          e.event_type AS eventType,
          e.from_status AS fromStatus,
          e.to_status AS toStatus,
          e.actor_type AS actorType,
          e.actor_label AS actorLabel,
          DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i') AS createdAt
        FROM reservation_events e
        INNER JOIN reservations r ON r.id = e.reservation_id
        WHERE r.customer_id = ?
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT 100
      `,
        [id],
      ),
    ]);

    return {
      customer: mapCustomer(customer),
      reservations: reservationRows[0].map(mapCustomerReservation),
      activities: activityRows[0].map(mapCustomerActivity),
    };
  }

  async listReservations(date?: string): Promise<AdminReservation[]> {
    const filter = date ? "WHERE r.reservation_date = ?" : "";
    const params = date ? [date] : [];
    const [rows] = await getDatabasePool().execute<ReservationRow[]>(
      `
      ${reservationSelect}
      ${filter}
      GROUP BY r.id, c.id
      ORDER BY r.reservation_date DESC, r.start_time ASC, r.id DESC
      LIMIT 100
    `,
      params,
    );
    return rows.map(mapReservation);
  }

  async getReservation(id: number): Promise<AdminReservation | null> {
    const [rows] = await getDatabasePool().execute<ReservationRow[]>(
      `
      ${reservationSelect}
      WHERE r.id = ?
      GROUP BY r.id, c.id
      LIMIT 1
    `,
      [id],
    );
    return rows[0] ? mapReservation(rows[0]) : null;
  }

  async listWaitlist(date?: string): Promise<AdminWaitlistEntry[]> {
    const filter = date ? "WHERE w.reservation_date = ?" : "";
    const params = date ? [date] : [];
    const [rows] = await getDatabasePool().execute<WaitlistRow[]>(
      `
      SELECT
        w.id,
        CONCAT('WL-', LPAD(w.id, 6, '0')) AS referenceCode,
        DATE_FORMAT(w.reservation_date, '%Y-%m-%d') AS reservationDate,
        TIME_FORMAT(w.preferred_time, '%H:%i') AS preferredTime,
        w.guest_count AS guestCount,
        w.status,
        c.name AS customerName,
        c.phone AS customerPhone,
        c.email AS customerEmail,
        w.notes,
        DATE_FORMAT(w.created_at, '%Y-%m-%d %H:%i') AS createdAt
      FROM waitlist w
      INNER JOIN customers c ON c.id = w.customer_id
      ${filter}
      ORDER BY w.created_at ASC, w.id ASC
      LIMIT 100
    `,
      params,
    );
    return rows.map(mapWaitlist);
  }

  async getReservationStatus(id: number): Promise<ReservationStatus | null> {
    const [rows] = await getDatabasePool().execute<StatusRow[]>(
      "SELECT status FROM reservations WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? (rows[0].status as ReservationStatus) : null;
  }

  async updateReservationStatus(
    id: number,
    fromStatus: ReservationStatus,
    status: ReservationStatus,
  ): Promise<void> {
    await withTransaction(async (connection) => {
      const current = await this.getReservationOperationStateForConnection(
        connection,
        id,
      );
      if (!current) throw new Error("Reservation not found");
      if (current.status !== fromStatus)
        throw new Error("Reservation state changed");
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE reservations
         SET status = ?,
             cancelled_at = IF(? = 'cancelled', CURRENT_TIMESTAMP, cancelled_at),
             seated_at = IF(? = 'seated', COALESCE(seated_at, CURRENT_TIMESTAMP), seated_at),
             completed_at = IF(? = 'completed', COALESCE(completed_at, CURRENT_TIMESTAMP), completed_at),
             no_show_at = IF(? = 'no_show', COALESCE(no_show_at, CURRENT_TIMESTAMP), no_show_at)
         WHERE id = ? AND status = ?`,
        [status, status, status, status, status, id, fromStatus],
      );
      if (result.affectedRows !== 1)
        throw new Error("Reservation state changed");
      await this.insertReservationEvent(connection, {
        reservationId: id,
        eventType: status === "cancelled" ? "cancelled" : "status_changed",
        fromStatus,
        toStatus: status,
      });
    });
  }

  async getReservationOperationState(
    id: number,
  ): Promise<AdminReservationOperationState | null> {
    return this.getReservationOperationStateForConnection(
      getDatabasePool(),
      id,
    );
  }

  private async getReservationOperationStateForConnection(
    connection: Pick<PoolConnection, "execute">,
    id: number,
    lock = false,
  ): Promise<AdminReservationOperationState | null> {
    const [rows] = await connection.execute<ReservationOperationStateRow[]>(
      `SELECT status, DATE_FORMAT(checked_in_at, '%Y-%m-%d %H:%i') AS checkedInAt
       FROM reservations WHERE id = ? LIMIT 1${lock ? " FOR UPDATE" : ""}`,
      [id],
    );
    if (!rows[0]) return null;
    return {
      status: rows[0].status as ReservationStatus,
      checkedInAt: rows[0].checkedInAt,
    };
  }

  async applyReservationOperation(
    id: number,
    operation: ReservationOperation,
  ): Promise<void> {
    await withTransaction(async (connection) => {
      const current = await this.getReservationOperationStateForConnection(
        connection,
        id,
        true,
      );
      if (!current) throw new Error("Reservation not found");
      const update = this.operationUpdate(operation);
      const [result] = await connection.execute<ResultSetHeader>(update.sql, [
        id,
      ]);
      if (result.affectedRows !== 1)
        throw new Error("Reservation operation could not be applied");
      await this.insertReservationEvent(connection, {
        reservationId: id,
        eventType:
          operation === "check_in"
            ? "checked_in"
            : operation === "seat"
              ? "seated"
              : operation,
        fromStatus: current.status,
        toStatus: update.toStatus,
      });
    });
  }

  private operationUpdate(operation: ReservationOperation): {
    sql: string;
    toStatus: ReservationStatus;
  } {
    if (operation === "check_in") {
      return {
        sql: `UPDATE reservations
              SET checked_in_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'confirmed' AND checked_in_at IS NULL`,
        toStatus: "confirmed",
      };
    }
    if (operation === "seat") {
      return {
        sql: `UPDATE reservations
              SET status = 'seated', checked_in_at = COALESCE(checked_in_at, CURRENT_TIMESTAMP), seated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'confirmed' AND checked_in_at IS NOT NULL`,
        toStatus: "seated",
      };
    }
    if (operation === "complete") {
      return {
        sql: `UPDATE reservations
              SET status = 'completed', completed_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'seated'`,
        toStatus: "completed",
      };
    }
    return {
      sql: `UPDATE reservations
            SET status = 'no_show', no_show_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('confirmed', 'seated')`,
      toStatus: "no_show",
    };
  }

  async listReservationTimeline(
    id: number,
  ): Promise<AdminReservationTimelineEntry[]> {
    const [rows] = await getDatabasePool().execute<ReservationTimelineRow[]>(
      `SELECT id, event_type AS eventType, from_status AS fromStatus, to_status AS toStatus,
              actor_type AS actorType, actor_label AS actorLabel,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS createdAt
       FROM reservation_events
       WHERE reservation_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 100`,
      [id],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      eventType: row.eventType,
      fromStatus: row.fromStatus as ReservationStatus | null,
      toStatus: row.toStatus as ReservationStatus | null,
      actorType: row.actorType,
      actorLabel: row.actorLabel,
      createdAt: row.createdAt,
    }));
  }

  async getReservationAssignment(
    id: number,
  ): Promise<AdminReservationAssignment> {
    const [rows] = await getDatabasePool().execute<ReservationScheduleRow[]>(
      `SELECT DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
              TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
              TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
              GROUP_CONCAT(DISTINCT rt.restaurant_table_id ORDER BY rt.restaurant_table_id SEPARATOR ',') AS tableIds
       FROM reservations r
       LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
       WHERE r.id = ?
       GROUP BY r.id
       LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new Error("Reservation not found");
    const floorMap = await this.getFloorMap(row.reservationDate, row.startTime);
    return {
      tableIds: row.tableIds ? row.tableIds.split(",").map(Number) : [],
      options: floorMap.tables,
    };
  }

  async assignReservationTables(id: number, tableIds: number[]): Promise<void> {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute<ReservationScheduleRow[]>(
        `SELECT DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservationDate,
                TIME_FORMAT(start_time, '%H:%i') AS startTime,
                TIME_FORMAT(end_time, '%H:%i') AS endTime,
                guest_count AS guestCount, status
         FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE`,
        [id],
      );
      const reservation = rows[0];
      if (!reservation) throw new Error("Reservation not found");
      if (!["pending", "confirmed", "seated"].includes(reservation.status))
        throw new Error("Reservation tables locked");
      const ids = [...new Set(tableIds)].sort(
        (first, second) => first - second,
      );
      await validateReservationTables(
        connection,
        id,
        ids,
        reservation,
        Number(reservation.guestCount),
      );
      await connection.execute(
        "DELETE FROM reservation_tables WHERE reservation_id = ?",
        [id],
      );
      for (const tableId of ids) {
        await connection.execute(
          `INSERT INTO reservation_tables (reservation_id, restaurant_table_id)
           VALUES (?, ?)`,
          [id, tableId],
        );
      }
      await this.insertReservationEvent(connection, {
        reservationId: id,
        eventType: "table_changed",
        fromStatus: reservation.status as ReservationStatus,
        toStatus: reservation.status as ReservationStatus,
      });
    });
  }

  async updateReservationSchedule(
    id: number,
    schedule: AdminReservationSchedule,
  ): Promise<void> {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute<ReservationScheduleRow[]>(
        `SELECT DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservationDate,
                TIME_FORMAT(start_time, '%H:%i') AS startTime,
                TIME_FORMAT(end_time, '%H:%i') AS endTime,
                guest_count AS guestCount, status
         FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE`,
        [id],
      );
      const current = rows[0];
      if (!current) throw new Error("Reservation not found");
      if (!["pending", "confirmed"].includes(current.status))
        throw new Error("Reservation schedule is locked");
      const [assigned] = await connection.execute<RowDataPacket[]>(
        "SELECT restaurant_table_id AS tableId FROM reservation_tables WHERE reservation_id = ? ORDER BY restaurant_table_id",
        [id],
      );
      const tableIds = assigned.map((row) => Number(row.tableId));
      await validateReservationTables(
        connection,
        id,
        tableIds,
        schedule,
        Number(current.guestCount),
      );
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE reservations
         SET reservation_date = ?, start_time = ?, end_time = ?
         WHERE id = ? AND status = ?`,
        [
          schedule.reservationDate,
          schedule.startTime,
          schedule.endTime,
          id,
          current.status,
        ],
      );
      if (result.affectedRows !== 1)
        throw new Error("Reservation state changed");
      await this.insertReservationEvent(connection, {
        reservationId: id,
        eventType: "schedule_changed",
        fromStatus: current.status as ReservationStatus,
        toStatus: current.status as ReservationStatus,
      });
    });
  }

  private async insertReservationEvent(
    connection: Pick<PoolConnection, "execute">,
    event: {
      reservationId: number;
      eventType: string;
      fromStatus: ReservationStatus | null;
      toStatus: ReservationStatus | null;
      eventKey?: string;
    },
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO reservation_events
        (reservation_id, event_type, from_status, to_status, actor_type, event_key)
       VALUES (?, ?, ?, ?, 'admin', ?)`,
      [
        event.reservationId,
        event.eventType,
        event.fromStatus,
        event.toStatus,
        event.eventKey ?? null,
      ],
    );
  }

  private async validateWalkInTables(
    connection: PoolConnection,
    input: CreateWalkInReservationInput,
    tableIds: number[],
  ): Promise<void> {
    if (tableIds.length === 0) return;
    const [tables] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM restaurant_tables
       WHERE id IN (${placeholders(tableIds)}) AND active = 1
       FOR UPDATE`,
      tableIds,
    );
    if (tables.length !== tableIds.length)
      throw new Error("Invalid walk-in tables");
    const [conflicts] = await connection.execute<CountRow[]>(
      `SELECT COUNT(*) AS count
       FROM reservations r
       INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
       WHERE rt.restaurant_table_id IN (${placeholders(tableIds)})
         AND r.reservation_date = ?
         AND r.status IN ('hold', 'payment_pending', 'pending', 'confirmed', 'seated')
         AND r.start_time < ? AND r.end_time > ?`,
      [
        ...tableIds,
        input.reservation.reservationDate,
        input.reservation.endTime,
        input.reservation.startTime,
      ],
    );
    if (Number(conflicts[0]?.count ?? 0) > 0)
      throw new Error("Walk-in tables unavailable");
  }

  private async insertWalkInReservation(
    connection: PoolConnection,
    input: CreateWalkInReservationInput,
  ): Promise<number> {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO reservations
        (public_code, customer_id, experience_id, reservation_date, start_time, end_time,
         guest_count, status, preferred_table_type_id, source, notes, internal_notes, confirmation_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'walk_in', ?, ?, ?)`,
      [
        input.reservation.publicCode,
        input.reservation.customerId,
        input.reservation.experienceId ?? null,
        input.reservation.reservationDate,
        input.reservation.startTime,
        input.reservation.endTime,
        input.reservation.guestCount,
        input.reservation.preferredTableTypeId ?? null,
        input.reservation.notes ?? null,
        input.reservation.internalNotes ?? null,
        input.reservation.confirmationTokenHash ?? null,
      ],
    );
    return Number(result.insertId);
  }

  private async assignWalkInTables(
    connection: PoolConnection,
    reservationId: number,
    tableIds: number[],
  ): Promise<void> {
    if (tableIds.length === 0) return;
    await connection.execute(
      `INSERT INTO reservation_tables (reservation_id, restaurant_table_id)
       VALUES ${tableIds.map(() => "(?, ?)").join(", ")}`,
      tableIds.flatMap((tableId) => [reservationId, tableId]),
    );
  }

  async createWalkInReservation(
    input: CreateWalkInReservationInput,
  ): Promise<number> {
    return withTransaction(async (connection) => {
      const tableIds = [...new Set(input.tableIds)];
      await this.validateWalkInTables(connection, input, tableIds);
      const reservationId = await this.insertWalkInReservation(
        connection,
        input,
      );
      await this.assignWalkInTables(connection, reservationId, tableIds);
      await this.insertReservationEvent(connection, {
        reservationId,
        eventType: "walk_in_created",
        fromStatus: null,
        toStatus: "confirmed",
        eventKey: `reservation:${reservationId}:walk_in_created`,
      });
      return reservationId;
    });
  }

  async getWaitlistStatus(id: number): Promise<WaitlistStatus | null> {
    const [rows] = await getDatabasePool().execute<StatusRow[]>(
      "SELECT status FROM waitlist WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? (rows[0].status as WaitlistStatus) : null;
  }

  async updateWaitlistStatus(
    id: number,
    status: WaitlistStatus,
  ): Promise<void> {
    await getDatabasePool().execute(
      "UPDATE waitlist SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id],
    );
  }

  async getConfiguration(): Promise<AdminConfiguration> {
    const pool = getDatabasePool();
    const [areas, tableTypes, tables, shifts, businessHours] =
      await Promise.all([
        pool.execute<AreaRow[]>(
          "SELECT id, code, name, active FROM dining_areas WHERE active = 1 ORDER BY name",
        ),
        pool.execute<TableTypeRow[]>(`
        SELECT id, code, name, capacity_min AS capacityMin, capacity_max AS capacityMax, active
        FROM table_types WHERE active = 1 ORDER BY name
      `),
        pool.execute<TableRow[]>(`
        SELECT
          t.id, t.code, t.name, t.area_id AS areaId, a.name AS areaName,
          t.table_type_id AS tableTypeId, tt.name AS tableTypeName,
          t.capacity_min AS capacityMin, t.capacity_max AS capacityMax,
          t.shape, t.position_x AS positionX, t.position_y AS positionY,
          t.joinable, t.active
        FROM restaurant_tables t
        INNER JOIN dining_areas a ON a.id = t.area_id
        INNER JOIN table_types tt ON tt.id = t.table_type_id
        WHERE t.active = 1 AND a.active = 1 AND tt.active = 1
        ORDER BY a.name, t.name
      `),
        pool.execute<ShiftRow[]>(`
        SELECT id, code, name,
          TIME_FORMAT(starts_at, '%H:%i') AS startsAt,
          TIME_FORMAT(ends_at, '%H:%i') AS endsAt,
          active
        FROM service_shifts WHERE active = 1 ORDER BY starts_at
      `),
        pool.execute<BusinessHourRow[]>(`
        SELECT
          bh.id, bh.day_of_week AS dayOfWeek, bh.service_shift_id AS shiftId,
          ss.name AS shiftName,
          TIME_FORMAT(bh.opens_at, '%H:%i') AS opensAt,
          TIME_FORMAT(bh.closes_at, '%H:%i') AS closesAt,
          bh.active
        FROM business_hours bh
        INNER JOIN service_shifts ss ON ss.id = bh.service_shift_id
        WHERE bh.active = 1 AND ss.active = 1
        ORDER BY bh.day_of_week, bh.opens_at
      `),
      ]);
    return {
      areas: areas[0].map(mapArea),
      tableTypes: tableTypes[0].map(mapTableType),
      tables: tables[0].map(mapTable),
      shifts: shifts[0].map(mapShift),
      businessHours: businessHours[0].map(mapBusinessHour),
    };
  }

  async createArea(input: CreateAreaInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      "INSERT INTO dining_areas (code, name) VALUES (?, ?)",
      [input.code, input.name],
    );
    return result.insertId;
  }

  async createTableType(input: CreateTableTypeInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO table_types (code, name, capacity_min, capacity_max)
       VALUES (?, ?, ?, ?)`,
      [input.code, input.name, input.capacityMin, input.capacityMax],
    );
    return result.insertId;
  }

  async createTable(input: CreateTableInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO restaurant_tables
        (code, name, area_id, table_type_id, capacity_min, capacity_max, shape, joinable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.name,
        input.areaId,
        input.tableTypeId,
        input.capacityMin,
        input.capacityMax,
        input.shape,
        input.joinable,
      ],
    );
    return result.insertId;
  }

  async createShift(input: CreateShiftInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO service_shifts (code, name, starts_at, ends_at)
       VALUES (?, ?, ?, ?)`,
      [input.code, input.name, input.startsAt, input.endsAt],
    );
    return result.insertId;
  }

  async createBusinessHour(input: CreateBusinessHourInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO business_hours
        (day_of_week, service_shift_id, opens_at, closes_at)
       VALUES (?, ?, ?, ?)`,
      [input.dayOfWeek, input.shiftId, input.opensAt, input.closesAt],
    );
    return result.insertId;
  }

  async updateConfiguration(input: AdminConfigurationUpdate): Promise<void> {
    const pool = getDatabasePool();
    let sql: string;
    let params: Array<string | number | boolean>;

    switch (input.resource) {
      case "area":
        sql =
          "UPDATE dining_areas SET code = ?, name = ? WHERE id = ? AND active = 1";
        params = [input.code, input.name, input.id];
        break;
      case "table_type":
        sql = `UPDATE table_types
               SET code = ?, name = ?, capacity_min = ?, capacity_max = ?
               WHERE id = ? AND active = 1`;
        params = [
          input.code,
          input.name,
          input.capacityMin,
          input.capacityMax,
          input.id,
        ];
        break;
      case "table":
        sql = `UPDATE restaurant_tables
               SET code = ?, name = ?, area_id = ?, table_type_id = ?,
                   capacity_min = ?, capacity_max = ?, shape = ?, joinable = ?
               WHERE id = ? AND active = 1`;
        params = [
          input.code,
          input.name,
          input.areaId,
          input.tableTypeId,
          input.capacityMin,
          input.capacityMax,
          input.shape,
          input.joinable,
          input.id,
        ];
        break;
      case "shift":
        sql = `UPDATE service_shifts
               SET code = ?, name = ?, starts_at = ?, ends_at = ?
               WHERE id = ? AND active = 1`;
        params = [
          input.code,
          input.name,
          input.startsAt,
          input.endsAt,
          input.id,
        ];
        break;
      case "business_hour":
        sql = `UPDATE business_hours
               SET day_of_week = ?, service_shift_id = ?, opens_at = ?, closes_at = ?
               WHERE id = ? AND active = 1`;
        params = [
          input.dayOfWeek,
          input.shiftId,
          input.opensAt,
          input.closesAt,
          input.id,
        ];
        break;
    }

    const [result] = await pool.execute<ResultSetHeader>(sql, params);
    if (result.affectedRows === 0) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT id FROM ${configurationTable(input.resource)} WHERE id = ? AND active = 1 LIMIT 1`,
        [input.id],
      );
      if (rows.length === 0) throw new Error("Configuration not found");
    }
  }

  async deactivateConfiguration(
    resource: ConfigurationResource,
    id: number,
  ): Promise<void> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `UPDATE ${configurationTable(resource)} SET active = 0 WHERE id = ? AND active = 1`,
      [id],
    );
    if (result.affectedRows !== 1) throw new Error("Configuration not found");
  }

  async getFloorMap(date: string, time: string): Promise<AdminFloorMap> {
    const pool = getDatabasePool();
    const [tableResult, combinationResult, blockedResult, settingsResult] =
      await Promise.all([
        pool.execute<FloorTableRow[]>(
          `
        SELECT
          t.id, t.code, t.name, t.area_id AS areaId, a.name AS areaName,
          t.table_type_id AS tableTypeId, tt.name AS tableTypeName,
          t.capacity_min AS capacityMin, t.capacity_max AS capacityMax,
          t.shape, t.position_x AS positionX, t.position_y AS positionY,
          t.joinable, t.active,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM blocked_periods bp
              WHERE bp.active = 1
                AND (bp.restaurant_table_id = t.id OR bp.dining_area_id = t.area_id
                  OR (bp.restaurant_table_id IS NULL AND bp.dining_area_id IS NULL))
                AND bp.starts_at <= CONCAT(?, ' ', ?)
                AND bp.ends_at > CONCAT(?, ' ', ?)
            ) THEN 'blocked'
            WHEN EXISTS (
              SELECT 1
              FROM reservations r
              INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
              WHERE rt.restaurant_table_id = t.id
                AND r.reservation_date = ?
                AND r.status IN ('hold', 'payment_pending', 'pending', 'confirmed', 'seated')
                AND r.start_time <= ? AND r.end_time > ?
            ) THEN 'reserved'
            WHEN EXISTS (
              SELECT 1
              FROM reservation_holds h
              WHERE h.restaurant_table_id = t.id
                AND h.expires_at > CURRENT_TIMESTAMP
                AND h.reservation_starts_at <= CONCAT(?, ' ', ?)
                AND h.reservation_ends_at > CONCAT(?, ' ', ?)
            ) THEN 'reserved'
            ELSE 'available'
          END AS state
        FROM restaurant_tables t
        INNER JOIN dining_areas a ON a.id = t.area_id
        INNER JOIN table_types tt ON tt.id = t.table_type_id
        WHERE t.active = 1 AND a.active = 1 AND tt.active = 1
        ORDER BY a.name, t.id
      `,
          [date, time, date, time, date, time, time, date, time, date, time],
        ),
        pool.execute<CombinationRow[]>(`
        SELECT
          tc.id, tc.code, tc.name, tc.active,
          GROUP_CONCAT(t.id ORDER BY t.id SEPARATOR ',') AS tableIds,
          GROUP_CONCAT(CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel
        FROM table_combinations tc
        INNER JOIN table_combination_items tci ON tci.combination_id = tc.id
        INNER JOIN restaurant_tables t ON t.id = tci.table_id
        INNER JOIN dining_areas a ON a.id = t.area_id
        WHERE tc.active = 1
        GROUP BY tc.id
        HAVING SUM(t.active = 0 OR t.joinable = 0 OR a.active = 0) = 0
        ORDER BY tc.name
      `),
        pool.execute<BlockedPeriodRow[]>(
          `
        SELECT
          bp.id, bp.dining_area_id AS areaId, a.name AS areaName,
          bp.restaurant_table_id AS tableId, t.name AS tableName,
          DATE_FORMAT(bp.starts_at, '%Y-%m-%d %H:%i') AS startsAt,
          DATE_FORMAT(bp.ends_at, '%Y-%m-%d %H:%i') AS endsAt,
          bp.reason, bp.active
        FROM blocked_periods bp
        LEFT JOIN dining_areas a ON a.id = bp.dining_area_id
        LEFT JOIN restaurant_tables t ON t.id = bp.restaurant_table_id
        WHERE bp.active = 1
          AND bp.starts_at < DATE_ADD(CONCAT(?, ' 00:00:00'), INTERVAL 1 DAY)
          AND bp.ends_at > CONCAT(?, ' 00:00:00')
        ORDER BY bp.starts_at
      `,
          [date, date],
        ),
        pool.execute<FloorPlanSettingsRow[]>(`
        SELECT background_url AS backgroundUrl, background_opacity AS backgroundOpacity
        FROM floor_plan_settings
        WHERE id = 1
        LIMIT 1
      `),
      ]);
    return {
      date,
      time,
      tables: tableResult[0].map(mapFloorTable),
      combinations: combinationResult[0].map(mapCombination),
      blockedPeriods: blockedResult[0].map(mapBlockedPeriod),
      background: mapFloorPlanSettings(settingsResult[0][0]),
    };
  }

  async createCombination(input: CreateCombinationInput): Promise<number> {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const placeholders = input.tableIds.map(() => "?").join(", ");
      const [tableRows] = await connection.execute<CountRow[]>(
        `SELECT COUNT(*) AS count
         FROM restaurant_tables
         WHERE id IN (${placeholders}) AND active = 1 AND joinable = 1`,
        input.tableIds,
      );
      if (Number(tableRows[0]?.count ?? 0) !== input.tableIds.length) {
        throw new Error("Invalid combination tables");
      }
      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO table_combinations (code, name) VALUES (?, ?)",
        [input.code, input.name],
      );
      for (const tableId of input.tableIds) {
        await connection.execute(
          `INSERT INTO table_combination_items (combination_id, table_id)
           VALUES (?, ?)`,
          [result.insertId, tableId],
        );
      }
      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deactivateCombination(id: number): Promise<void> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      "UPDATE table_combinations SET active = 0 WHERE id = ? AND active = 1",
      [id],
    );
    if (result.affectedRows !== 1) throw new Error("Combination not found");
  }

  async createBlockedPeriod(input: CreateBlockedPeriodInput): Promise<number> {
    if (input.areaId !== null) {
      const [areas] = await getDatabasePool().execute<RowDataPacket[]>(
        "SELECT id FROM dining_areas WHERE id = ? AND active = 1 LIMIT 1",
        [input.areaId],
      );
      if (areas.length === 0) throw new Error("Invalid blocked period area");
    }
    if (input.tableId !== null) {
      const [tables] = await getDatabasePool().execute<RowDataPacket[]>(
        "SELECT id FROM restaurant_tables WHERE id = ? AND active = 1 LIMIT 1",
        [input.tableId],
      );
      if (tables.length === 0) throw new Error("Invalid blocked period table");
    }
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO blocked_periods
        (dining_area_id, restaurant_table_id, starts_at, ends_at, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.areaId,
        input.tableId,
        input.startsAt.replace("T", " "),
        input.endsAt.replace("T", " "),
        input.reason,
      ],
    );
    return result.insertId;
  }

  async updateFloorPlanSettings(
    input: UpdateFloorPlanSettingsInput,
  ): Promise<void> {
    await getDatabasePool().execute(
      `INSERT INTO floor_plan_settings (id, background_url, background_opacity)
       VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE background_url = ?, background_opacity = ?`,
      [input.url, input.opacity, input.url, input.opacity],
    );
  }

  async updateTablePosition(input: UpdateTablePositionInput): Promise<void> {
    const pool = getDatabasePool();
    const [tables] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM restaurant_tables WHERE id = ? AND active = 1 LIMIT 1",
      [input.tableId],
    );
    if (tables.length === 0) throw new Error("Table not found");
    await pool.execute(
      `UPDATE restaurant_tables SET position_x = ?, position_y = ? WHERE id = ?`,
      [input.positionX, input.positionY, input.tableId],
    );
  }
}
