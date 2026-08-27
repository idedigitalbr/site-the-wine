import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type {
  AdminArea,
  AdminBlockedPeriod,
  AdminBusinessHour,
  AdminCombination,
  AdminConfiguration,
  AdminDashboard,
  AdminFloorMap,
  AdminRepository,
  AdminReservation,
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
  FloorTable,
  FloorTableState,
  UpdateTablePositionInput,
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
    tableIds: row.tableIds ? row.tableIds.split(',').map(Number) : [],
    tableLabel: row.tableLabel ?? '',
    active: Boolean(row.active),
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
          t.shape, t.position_x AS positionX, t.position_y AS positionY,
          t.joinable, t.active
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

  async getFloorMap(date: string, time: string): Promise<AdminFloorMap> {
    const pool = getDatabasePool();
    const [tableResult, combinationResult, blockedResult] = await Promise.all([
      pool.execute<FloorTableRow[]>(`
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
            ELSE 'available'
          END AS state
        FROM restaurant_tables t
        INNER JOIN dining_areas a ON a.id = t.area_id
        INNER JOIN table_types tt ON tt.id = t.table_type_id
        WHERE t.active = 1 AND a.active = 1
        ORDER BY a.name, t.id
      `, [date, time, date, time, date, time, time]),
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
      pool.execute<BlockedPeriodRow[]>(`
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
      `, [date, date]),
    ]);
    return {
      date,
      time,
      tables: tableResult[0].map(mapFloorTable),
      combinations: combinationResult[0].map(mapCombination),
      blockedPeriods: blockedResult[0].map(mapBlockedPeriod),
    };
  }

  async createCombination(input: CreateCombinationInput): Promise<number> {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const placeholders = input.tableIds.map(() => '?').join(', ');
      const [tableRows] = await connection.execute<CountRow[]>(
        `SELECT COUNT(*) AS count
         FROM restaurant_tables
         WHERE id IN (${placeholders}) AND active = 1 AND joinable = 1`,
        input.tableIds,
      );
      if (Number(tableRows[0]?.count ?? 0) !== input.tableIds.length) {
        throw new Error('Invalid combination tables');
      }
      const [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO table_combinations (code, name) VALUES (?, ?)',
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

  async createBlockedPeriod(input: CreateBlockedPeriodInput): Promise<number> {
    if (input.areaId !== null) {
      const [areas] = await getDatabasePool().execute<RowDataPacket[]>(
        'SELECT id FROM dining_areas WHERE id = ? AND active = 1 LIMIT 1',
        [input.areaId],
      );
      if (areas.length === 0) throw new Error('Invalid blocked period area');
    }
    if (input.tableId !== null) {
      const [tables] = await getDatabasePool().execute<RowDataPacket[]>(
        'SELECT id FROM restaurant_tables WHERE id = ? AND active = 1 LIMIT 1',
        [input.tableId],
      );
      if (tables.length === 0) throw new Error('Invalid blocked period table');
    }
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO blocked_periods
        (dining_area_id, restaurant_table_id, starts_at, ends_at, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [input.areaId, input.tableId, input.startsAt.replace('T', ' '), input.endsAt.replace('T', ' '), input.reason],
    );
    return result.insertId;
  }

  async updateTablePosition(input: UpdateTablePositionInput): Promise<void> {
    const pool = getDatabasePool();
    const [tables] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM restaurant_tables WHERE id = ? AND active = 1 LIMIT 1',
      [input.tableId],
    );
    if (tables.length === 0) throw new Error('Table not found');
    await pool.execute(
      `UPDATE restaurant_tables SET position_x = ?, position_y = ? WHERE id = ?`,
      [input.positionX, input.positionY, input.tableId],
    );
  }
}
