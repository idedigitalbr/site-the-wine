import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { ReservationOperation } from '@/modules/reservations/domain/reservation-operation';
import type { ConfirmedReservationDraft } from '@/modules/reservations/domain/reservation';
import type { WaitlistStatus } from '@/modules/reservations/domain/waitlist';

export type AdminReservation = {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  tableLabel: string | null;
  tableIds: number[];
  notes: string | null;
  source: string;
  checkedInAt: string | null;
  seatedAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
};

export type AdminReservationOperationState = {
  status: ReservationStatus;
  checkedInAt: string | null;
};

export type AdminReservationTimelineEntry = {
  id: number;
  eventType: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus | null;
  actorType: string;
  actorLabel: string | null;
  createdAt: string;
};

export type AdminReservationAssignment = {
  tableIds: number[];
  options: FloorTable[];
};

export type AdminReservationSchedule = {
  reservationDate: string;
  startTime: string;
  endTime: string;
};

export type CreateWalkInReservationInput = {
  reservation: ConfirmedReservationDraft;
  tableIds: number[];
};

export type AdminWaitlistEntry = {
  id: number;
  referenceCode: string;
  reservationDate: string;
  preferredTime: string | null;
  guestCount: number;
  status: WaitlistStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  createdAt: string;
};

export type AdminDashboard = {
  date: string;
  metrics: {
    total: number;
    pending: number;
    confirmed: number;
    seated: number;
  };
  reservations: AdminReservation[];
};

export type AdminAnalytics = {
  fromDate: string;
  toDate: string;
  metrics: {
    reservations: number;
    covers: number;
    completed: number;
    cancelled: number;
    noShow: number;
    uniqueCustomers: number;
    assignedCovers: number;
    assignedCapacity: number;
    occupancyRate: number;
    revenue: number | null;
  };
  daily: Array<{ date: string; reservations: number; covers: number }>;
  sources: Array<{ source: string; reservations: number; covers: number }>;
  peakHours: Array<{ hour: string; reservations: number; covers: number }>;
  revenueMode: 'mock';
};

export type AdminCustomer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  marketingConsent: boolean;
  firstReservationDate: string | null;
  lastReservationDate: string | null;
  reservationCount: number;
  completedReservations: number;
  noShowCount: number;
  totalCovers: number;
  createdAt: string;
};

export type AdminCustomerReservation = {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  source: string;
  tableLabel: string | null;
  notes: string | null;
};

export type AdminCustomerActivity = {
  id: number;
  reservationId: number;
  publicCode: string;
  eventType: string;
  fromStatus: ReservationStatus | null;
  toStatus: ReservationStatus | null;
  actorType: string;
  actorLabel: string | null;
  createdAt: string;
};

export type AdminCustomerProfile = {
  customer: AdminCustomer;
  reservations: AdminCustomerReservation[];
  activities: AdminCustomerActivity[];
};

export type AdminArea = { id: number; code: string; name: string; active: boolean };
export type AdminTableType = {
  id: number;
  code: string;
  name: string;
  capacityMin: number;
  capacityMax: number;
  active: boolean;
};
export type AdminTable = {
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
  joinable: boolean;
  active: boolean;
};
export type AdminShift = {
  id: number;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};
export type AdminBusinessHour = {
  id: number;
  dayOfWeek: number;
  shiftId: number;
  shiftName: string;
  opensAt: string;
  closesAt: string;
  active: boolean;
};

export type AdminConfiguration = {
  areas: AdminArea[];
  tableTypes: AdminTableType[];
  tables: AdminTable[];
  shifts: AdminShift[];
  businessHours: AdminBusinessHour[];
};

export type FloorTableState = 'available' | 'reserved' | 'blocked';
export type FloorTable = AdminTable & { state: FloorTableState };
export type AdminCombination = {
  id: number;
  code: string;
  name: string;
  tableIds: number[];
  tableLabel: string;
  active: boolean;
};
export type AdminBlockedPeriod = {
  id: number;
  areaId: number | null;
  areaName: string | null;
  tableId: number | null;
  tableName: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  active: boolean;
};
export type AdminFloorMap = {
  date: string;
  time: string;
  tables: FloorTable[];
  combinations: AdminCombination[];
  blockedPeriods: AdminBlockedPeriod[];
  background: AdminFloorPlanSettings;
};

export type AdminFloorPlanSettings = {
  url: string | null;
  opacity: number;
};

export type CreateAreaInput = { code: string; name: string };
export type CreateTableTypeInput = CreateAreaInput & { capacityMin: number; capacityMax: number };
export type CreateTableInput = CreateAreaInput & {
  areaId: number;
  tableTypeId: number;
  capacityMin: number;
  capacityMax: number;
  shape: string;
  joinable: boolean;
};
export type CreateShiftInput = CreateAreaInput & { startsAt: string; endsAt: string };
export type CreateBusinessHourInput = {
  dayOfWeek: number;
  shiftId: number;
  opensAt: string;
  closesAt: string;
};
export type ConfigurationResource = 'area' | 'table_type' | 'table' | 'shift' | 'business_hour';
export type AdminConfigurationUpdate =
  | ({ resource: 'area'; id: number } & CreateAreaInput)
  | ({ resource: 'table_type'; id: number } & CreateTableTypeInput)
  | ({ resource: 'table'; id: number } & CreateTableInput)
  | ({ resource: 'shift'; id: number } & CreateShiftInput)
  | ({ resource: 'business_hour'; id: number } & CreateBusinessHourInput);
export type CreateCombinationInput = { code: string; name: string; tableIds: number[] };
export type CreateBlockedPeriodInput = {
  areaId: number | null;
  tableId: number | null;
  startsAt: string;
  endsAt: string;
  reason: string;
};
export type UpdateFloorPlanSettingsInput = AdminFloorPlanSettings;
export type UpdateTablePositionInput = { tableId: number; positionX: number; positionY: number };

export interface AdminRepository {
  getDashboard(date: string): Promise<AdminDashboard>;
  getAnalytics(fromDate: string, toDate: string): Promise<AdminAnalytics>;
  listCustomers(search?: string): Promise<AdminCustomer[]>;
  getCustomerProfile(id: number): Promise<AdminCustomerProfile | null>;
  listReservations(date?: string): Promise<AdminReservation[]>;
  listWaitlist(date?: string): Promise<AdminWaitlistEntry[]>;
  getReservationStatus(id: number): Promise<ReservationStatus | null>;
  updateReservationStatus(id: number, fromStatus: ReservationStatus, status: ReservationStatus): Promise<void>;
  getReservationOperationState(id: number): Promise<AdminReservationOperationState | null>;
  applyReservationOperation(id: number, operation: ReservationOperation): Promise<void>;
  listReservationTimeline(id: number): Promise<AdminReservationTimelineEntry[]>;
  getReservationAssignment(id: number): Promise<AdminReservationAssignment>;
  assignReservationTables(id: number, tableIds: number[]): Promise<void>;
  updateReservationSchedule(id: number, schedule: AdminReservationSchedule): Promise<void>;
  createWalkInReservation(input: CreateWalkInReservationInput): Promise<number>;
  getWaitlistStatus(id: number): Promise<WaitlistStatus | null>;
  updateWaitlistStatus(id: number, status: WaitlistStatus): Promise<void>;
  getConfiguration(): Promise<AdminConfiguration>;
  createArea(input: CreateAreaInput): Promise<number>;
  createTableType(input: CreateTableTypeInput): Promise<number>;
  createTable(input: CreateTableInput): Promise<number>;
  createShift(input: CreateShiftInput): Promise<number>;
  createBusinessHour(input: CreateBusinessHourInput): Promise<number>;
  updateConfiguration(input: AdminConfigurationUpdate): Promise<void>;
  deactivateConfiguration(resource: ConfigurationResource, id: number): Promise<void>;
  getFloorMap(date: string, time: string): Promise<AdminFloorMap>;
  createCombination(input: CreateCombinationInput): Promise<number>;
  deactivateCombination(id: number): Promise<void>;
  createBlockedPeriod(input: CreateBlockedPeriodInput): Promise<number>;
  updateFloorPlanSettings(input: UpdateFloorPlanSettingsInput): Promise<void>;
  updateTablePosition(input: UpdateTablePositionInput): Promise<void>;
}
