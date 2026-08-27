import { getAdminConfiguration } from '@/modules/admin/application/get-configuration';
import { getAdminDashboard } from '@/modules/admin/application/get-dashboard';
import { getAdminFloorMap } from '@/modules/admin/application/get-floor-map';
import { listAdminReservations } from '@/modules/admin/application/list-reservations';
import { saveAdminConfiguration } from '@/modules/admin/application/save-configuration';
import { saveAdminFloorMapCommand, type SaveFloorMapCommand } from '@/modules/admin/application/save-floor-map';
import { updateAdminReservationStatus } from '@/modules/admin/application/update-reservation-status';
import { updateAdminTablePosition } from '@/modules/admin/application/update-table-position';
import type { AdminConfigurationCommand } from '@/modules/admin/schemas/admin-schema';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import { MysqlAdminRepository } from '@/modules/admin/infrastructure/mysql-admin-repository';

const adminRepository = new MysqlAdminRepository();

export function loadAdminDashboard(date: string) {
  return getAdminDashboard(date, { admin: adminRepository });
}

export function loadAdminReservations(date?: string) {
  return listAdminReservations(date, { admin: adminRepository });
}

export function changeAdminReservationStatus(id: number, status: ReservationStatus) {
  return updateAdminReservationStatus(id, status, { admin: adminRepository });
}

export function loadAdminConfiguration() {
  return getAdminConfiguration({ admin: adminRepository });
}

export function saveConfiguration(input: AdminConfigurationCommand) {
  return saveAdminConfiguration(input, { admin: adminRepository });
}

export function loadFloorMap(date: string, time: string) {
  return getAdminFloorMap(date, time, { admin: adminRepository });
}

export function saveFloorMapCommand(input: SaveFloorMapCommand) {
  return saveAdminFloorMapCommand(input, { admin: adminRepository });
}

export function saveTablePosition(tableId: number, positionX: number, positionY: number) {
  return updateAdminTablePosition(tableId, positionX, positionY, { admin: adminRepository });
}
