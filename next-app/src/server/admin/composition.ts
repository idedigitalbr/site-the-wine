import { assignReservationTables } from '@/modules/admin/application/assign-reservation-tables';
import { createWalkInReservation } from '@/modules/admin/application/create-walk-in-reservation';
import { getAdminConfiguration } from '@/modules/admin/application/get-configuration';
import { getAdminDashboard } from '@/modules/admin/application/get-dashboard';
import { getAdminAnalytics } from '@/modules/admin/application/get-analytics';
import { getAdminCustomerProfile } from '@/modules/admin/application/get-customer-profile';
import { getAdminFloorMap } from '@/modules/admin/application/get-floor-map';
import { listAdminCustomers } from '@/modules/admin/application/list-customers';
import { listAdminReservations } from '@/modules/admin/application/list-reservations';
import { operateAdminReservation } from '@/modules/admin/application/operate-reservation';
import { saveAdminConfiguration } from '@/modules/admin/application/save-configuration';
import { removeAdminConfiguration } from '@/modules/admin/application/remove-configuration';
import { updateAdminConfiguration } from '@/modules/admin/application/update-configuration';
import { saveAdminFloorMapCommand, type SaveFloorMapCommand } from '@/modules/admin/application/save-floor-map';
import { updateAdminReservationStatus } from '@/modules/admin/application/update-reservation-status';
import { updateAdminReservationSchedule } from '@/modules/admin/application/update-reservation-schedule';
import { updateAdminWaitlistStatus } from '@/modules/admin/application/update-waitlist-status';
import { updateAdminTablePosition } from '@/modules/admin/application/update-table-position';
import type { AdminConfigurationCommand } from '@/modules/admin/schemas/admin-schema';
import type { AdminConfigurationUpdate, ConfigurationResource } from '@/modules/admin/application/ports';
import type { AdminReservationSchedule } from '@/modules/admin/application/ports';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { WaitlistStatus } from '@/modules/reservations/domain/waitlist';
import { MysqlAdminRepository } from '@/modules/admin/infrastructure/mysql-admin-repository';
import { MysqlCustomerRepository } from '@/modules/reservations/infrastructure/mysql-customer-repository';

const adminRepository = new MysqlAdminRepository();
const customerRepository = new MysqlCustomerRepository();

export function loadAdminDashboard(date: string) {
  return getAdminDashboard(date, { admin: adminRepository });
}

export function loadAdminAnalytics(fromDate: string, toDate: string) {
  return getAdminAnalytics(fromDate, toDate, { admin: adminRepository });
}

export function loadAdminCustomers(search?: string) {
  return listAdminCustomers(search, { admin: adminRepository });
}

export function loadAdminCustomerProfile(id: number) {
  return getAdminCustomerProfile(id, { admin: adminRepository });
}

export function loadAdminReservations(date?: string) {
  return listAdminReservations(date, { admin: adminRepository });
}

export function loadAdminWaitlist(date?: string) {
  return adminRepository.listWaitlist(date);
}

export function changeAdminReservationStatus(id: number, status: ReservationStatus) {
  return updateAdminReservationStatus(id, status, { admin: adminRepository });
}

export function operateReservation(id: number, operation: Parameters<typeof operateAdminReservation>[1]) {
  return operateAdminReservation(id, operation, { admin: adminRepository });
}

export function createAdminWalkIn(input: Parameters<typeof createWalkInReservation>[0]) {
  return createWalkInReservation(input, { admin: adminRepository, customers: customerRepository });
}

export function loadReservationTimeline(id: number) {
  return adminRepository.listReservationTimeline(id);
}

export function loadReservationAssignment(id: number) {
  return adminRepository.getReservationAssignment(id);
}

export function changeReservationTables(id: number, tableIds: number[]) {
  return assignReservationTables(id, tableIds, { admin: adminRepository });
}

export function changeReservationSchedule(id: number, schedule: AdminReservationSchedule) {
  return updateAdminReservationSchedule(id, schedule, { admin: adminRepository });
}

export function changeAdminWaitlistStatus(id: number, status: WaitlistStatus) {
  return updateAdminWaitlistStatus(id, status, { admin: adminRepository });
}

export function loadAdminConfiguration() {
  return getAdminConfiguration({ admin: adminRepository });
}

export function saveConfiguration(input: AdminConfigurationCommand) {
  return saveAdminConfiguration(input, { admin: adminRepository });
}

export function updateConfiguration(input: AdminConfigurationUpdate) {
  return updateAdminConfiguration(input, { admin: adminRepository });
}

export function removeConfiguration(resource: ConfigurationResource, id: number) {
  return removeAdminConfiguration(resource, id, { admin: adminRepository });
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
