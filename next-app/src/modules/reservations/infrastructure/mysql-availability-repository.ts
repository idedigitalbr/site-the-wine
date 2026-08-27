import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type {
  AvailabilityBlock,
  AvailabilityInventory,
  AvailabilitySearchQuery,
  AvailabilityReservation,
  AvailabilityServiceWindow,
  AvailabilityTable,
  TableCombination,
} from '../domain/availability';
import type { AvailabilityRepository } from '../application/ports';

type TableRow = RowDataPacket & {
  id: number;
  code: string;
  name: string;
  areaId: number;
  areaName: string;
  capacityMin: number;
  capacityMax: number;
  active: number;
  joinable: number;
};

type ReservationRow = RowDataPacket & {
  tableId: number;
  startsAt: string;
  endsAt: string;
  status: string;
};

type BlockRow = RowDataPacket & {
  tableId: number | null;
  areaId: number | null;
  startsAt: string;
  endsAt: string;
};

type CombinationRow = RowDataPacket & {
  combinationId: number;
  combinationCode: string;
  tableId: number;
  tableCapacityMin: number;
  tableCapacityMax: number;
};

type ServiceWindowRow = RowDataPacket & {
  startTime: string;
  endTime: string;
};

function mapTable(row: TableRow): AvailabilityTable {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    areaId: Number(row.areaId),
    areaName: row.areaName,
    capacityMin: Number(row.capacityMin),
    capacityMax: Number(row.capacityMax),
    active: Boolean(row.active),
    joinable: Boolean(row.joinable),
  };
}

function mapReservation(row: ReservationRow): AvailabilityReservation {
  return {
    tableId: Number(row.tableId),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
  };
}

function mapBlock(row: BlockRow): AvailabilityBlock {
  return {
    tableId: row.tableId === null ? null : Number(row.tableId),
    areaId: row.areaId === null ? null : Number(row.areaId),
    startsAt: row.startsAt,
    endsAt: row.endsAt,
  };
}

function mapServiceWindow(row: ServiceWindowRow): AvailabilityServiceWindow {
  return {
    startTime: row.startTime,
    endTime: row.endTime,
  };
}

function mapCombinations(rows: CombinationRow[]): TableCombination[] {
  const combinations = new Map<number, TableCombination>();

  for (const row of rows) {
    const combination = combinations.get(Number(row.combinationId));
    if (combination) {
      combination.tableIds.push(Number(row.tableId));
      combination.capacityMin += Number(row.tableCapacityMin);
      combination.capacityMax += Number(row.tableCapacityMax);
      continue;
    }

    combinations.set(Number(row.combinationId), {
      id: Number(row.combinationId),
      code: row.combinationCode,
      tableIds: [Number(row.tableId)],
      capacityMin: Number(row.tableCapacityMin),
      capacityMax: Number(row.tableCapacityMax),
    });
  }

  return [...combinations.values()];
}

export class MysqlAvailabilityRepository implements AvailabilityRepository {
  async findInventory(query: AvailabilitySearchQuery, sessionTokenHash?: string | null): Promise<AvailabilityInventory> {
    const pool = getDatabasePool();
    const [tableResult, reservationResult, blockResult, combinationResult, serviceWindowResult] = await Promise.all([
      pool.query<TableRow[]>(`
        SELECT
          t.id,
          t.code,
          t.name,
          t.area_id AS areaId,
          a.name AS areaName,
          t.capacity_min AS capacityMin,
          t.capacity_max AS capacityMax,
          t.active,
          t.joinable
        FROM restaurant_tables t
        INNER JOIN dining_areas a ON a.id = t.area_id
        WHERE t.active = 1 AND a.active = 1
        ORDER BY t.id
      `),
      pool.query<ReservationRow[]>(`
        SELECT
          rt.restaurant_table_id AS tableId,
          CONCAT(
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(r.start_time, '%H:%i:%s'),
            'Z'
          ) AS startsAt,
          CONCAT(
            DATE_FORMAT(r.reservation_date, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(r.end_time, '%H:%i:%s'),
            'Z'
          ) AS endsAt,
          r.status
        FROM reservations r
        INNER JOIN reservation_tables rt ON rt.reservation_id = r.id
        WHERE r.reservation_date = ?
          AND r.status IN ('hold', 'payment_pending', 'pending', 'confirmed', 'seated')
        UNION ALL
        SELECT
          h.restaurant_table_id AS tableId,
          CONCAT(
            DATE_FORMAT(h.reservation_starts_at, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(h.reservation_starts_at, '%H:%i:%s'),
            'Z'
          ) AS startsAt,
          CONCAT(
            DATE_FORMAT(h.reservation_ends_at, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(h.reservation_ends_at, '%H:%i:%s'),
            'Z'
          ) AS endsAt,
          'hold' AS status
        FROM reservation_holds h
        WHERE h.expires_at > CURRENT_TIMESTAMP
          AND h.reservation_starts_at IS NOT NULL
          AND h.reservation_ends_at IS NOT NULL
          AND h.reservation_starts_at < DATE_ADD(CONCAT(?, ' 00:00:00'), INTERVAL 1 DAY)
          AND h.reservation_ends_at > CONCAT(?, ' 00:00:00')
          AND (? IS NULL OR h.session_token_hash <> ?)
      `, [query.reservationDate, query.reservationDate, query.reservationDate, sessionTokenHash ?? null, sessionTokenHash ?? null]),
      pool.query<BlockRow[]>(`
        SELECT
          restaurant_table_id AS tableId,
          dining_area_id AS areaId,
          DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i:%sZ') AS startsAt,
          DATE_FORMAT(ends_at, '%Y-%m-%dT%H:%i:%sZ') AS endsAt
        FROM blocked_periods
        WHERE active = 1
          AND starts_at < DATE_ADD(CONCAT(?, ' 00:00:00'), INTERVAL 1 DAY)
          AND ends_at > CONCAT(?, ' 00:00:00')
      `, [query.reservationDate, query.reservationDate]),
      pool.query<CombinationRow[]>(`
        SELECT
          tc.id AS combinationId,
          tc.code AS combinationCode,
          t.id AS tableId,
          t.capacity_min AS tableCapacityMin,
          t.capacity_max AS tableCapacityMax
        FROM table_combinations tc
        INNER JOIN table_combination_items tci ON tci.combination_id = tc.id
        INNER JOIN restaurant_tables t ON t.id = tci.table_id
        WHERE tc.active = 1 AND t.active = 1 AND t.joinable = 1
        ORDER BY tc.id, t.id
      `),
      pool.query<ServiceWindowRow[]>(`
        SELECT
          TIME_FORMAT(bh.opens_at, '%H:%i') AS startTime,
          TIME_FORMAT(bh.closes_at, '%H:%i') AS endTime
        FROM business_hours bh
        INNER JOIN service_shifts ss ON ss.id = bh.service_shift_id
        WHERE bh.active = 1
          AND ss.active = 1
          AND bh.day_of_week = DAYOFWEEK(?) - 1
        ORDER BY bh.opens_at
      `, [query.reservationDate]),
    ]);

    return {
      tables: tableResult[0].map(mapTable),
      reservations: reservationResult[0].map(mapReservation),
      blockedPeriods: blockResult[0].map(mapBlock),
      combinations: mapCombinations(combinationResult[0]),
      serviceWindows: serviceWindowResult[0].map(mapServiceWindow),
    };
  }
}
