import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type {
  AdminArea,
  AdminBusinessHour,
  AdminConfiguration,
  AdminDashboard,
  AdminRepository,
  AdminReservation,
  AdminShift,
  AdminTable,
  AdminTableType,
  CreateAreaInput,
  CreateBusinessHourInput,
  CreateShiftInput,
  CreateTableInput,
  CreateTableTypeInput,
} from '../application/ports';

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
  notes: string | null;
};

type MetricsRow = RowDataPacket & {
  total: number;
  pending: number;
  confirmed: number;
  seated: number;
};

type StatusRow = RowDataPacket & { status: string };
type AreaRow = RowDataPacket & { id: number; code: string; name: string; active: number };
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
  joinable: number;
  active: number;
};
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
    notes: row.notes,
  };
}

function mapArea(row: AreaRow): AdminArea {
  return { id: Number(row.id), code: row.code, name: row.name, active: Boolean(row.active) };
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
    joinable: Boolean(row.joinable),
    active: Boolean(row.active),
  };
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

function mapMetrics(row: MetricsRow | undefined): AdminDashboard['metrics'] {
  const value = (key: keyof MetricsRow) => Number(row && row[key] !== undefined ? row[key] : 0);
  return {
    total: value('total'),
    pending: value('pending'),
    confirmed: value('confirmed'),
    seated: value('seated'),
  };
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
    c.name AS customerName,
    c.phone AS customerPhone,
    c.email AS customerEmail,
    GROUP_CONCAT(DISTINCT CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel,
    r.notes
  FROM reservations r
  INNER JOIN customers c ON c.id = r.customer_id
  LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
  LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id`;

export class MysqlAdminRepository implements AdminRepository {
  async getDashboard(date: string): Promise<AdminDashboard> {
    const [metricsResult, reservations] = await Promise.all([
      getDatabasePool().execute<MetricsRow[]>(`
        SELECT
          COUNT(*) AS total,
          SUM(r.status IN ('hold', 'payment_pending', 'pending')) AS pending,
          SUM(r.status = 'confirmed') AS confirmed,
          SUM(r.status = 'seated') AS seated
        FROM reservations r
        WHERE r.reservation_date = ?
          AND r.status NOT IN ('cancelled', 'expired', 'no_show', 'completed')
      `, [date]),
      this.listReservations(date),
    ]);
    return {
      date,
      metrics: mapMetrics(metricsResult[0][0]),
      reservations: reservations.slice(0, 8),
    };
  }

  async listReservations(date?: string): Promise<AdminReservation[]> {
    const filter = date ? 'WHERE r.reservation_date = ?' : '';
    const params = date ? [date] : [];
    const [rows] = await getDatabasePool().execute<ReservationRow[]>(`
      ${reservationSelect}
      ${filter}
      GROUP BY r.id, c.id
      ORDER BY r.reservation_date DESC, r.start_time ASC, r.id DESC
      LIMIT 100
    `, params);
    return rows.map(mapReservation);
  }

  async getReservationStatus(id: number): Promise<ReservationStatus | null> {
    const [rows] = await getDatabasePool().execute<StatusRow[]>(
      'SELECT status FROM reservations WHERE id = ? LIMIT 1',
      [id],
    );
    return rows[0] ? rows[0].status as ReservationStatus : null;
  }

  async updateReservationStatus(id: number, status: ReservationStatus): Promise<void> {
    await getDatabasePool().execute(
      'UPDATE reservations SET status = ?, cancelled_at = IF(? = \'cancelled\', CURRENT_TIMESTAMP, cancelled_at) WHERE id = ?',
      [status, status, id],
    );
  }

  async getConfiguration(): Promise<AdminConfiguration> {
    const pool = getDatabasePool();
    const [areas, tableTypes, tables, shifts, businessHours] = await Promise.all([
      pool.execute<AreaRow[]>('SELECT id, code, name, active FROM dining_areas ORDER BY name'),
      pool.execute<TableTypeRow[]>(`
        SELECT id, code, name, capacity_min AS capacityMin, capacity_max AS capacityMax, active
        FROM table_types ORDER BY name
      `),
      pool.execute<TableRow[]>(`
        SELECT
          t.id, t.code, t.name, t.area_id AS areaId, a.name AS areaName,
          t.table_type_id AS tableTypeId, tt.name AS tableTypeName,
          t.capacity_min AS capacityMin, t.capacity_max AS capacityMax,
          t.shape, t.joinable, t.active
        FROM restaurant_tables t
        INNER JOIN dining_areas a ON a.id = t.area_id
        INNER JOIN table_types tt ON tt.id = t.table_type_id
        ORDER BY a.name, t.name
      `),
      pool.execute<ShiftRow[]>(`
        SELECT id, code, name,
          TIME_FORMAT(starts_at, '%H:%i') AS startsAt,
          TIME_FORMAT(ends_at, '%H:%i') AS endsAt,
          active
        FROM service_shifts ORDER BY starts_at
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
      'INSERT INTO dining_areas (code, name) VALUES (?, ?)',
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
      [input.code, input.name, input.areaId, input.tableTypeId, input.capacityMin, input.capacityMax, input.shape, input.joinable],
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
}
