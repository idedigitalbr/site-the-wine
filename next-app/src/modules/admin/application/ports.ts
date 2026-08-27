import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

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
  notes: string | null;
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

export interface AdminRepository {
  getDashboard(date: string): Promise<AdminDashboard>;
  listReservations(date?: string): Promise<AdminReservation[]>;
  getReservationStatus(id: number): Promise<ReservationStatus | null>;
  updateReservationStatus(id: number, status: ReservationStatus): Promise<void>;
  getConfiguration(): Promise<AdminConfiguration>;
  createArea(input: CreateAreaInput): Promise<number>;
  createTableType(input: CreateTableTypeInput): Promise<number>;
  createTable(input: CreateTableInput): Promise<number>;
  createShift(input: CreateShiftInput): Promise<number>;
  createBusinessHour(input: CreateBusinessHourInput): Promise<number>;
}
