export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

export type AppointmentExperience = 'jantar' | 'degustacao' | 'evento';

export type AppointmentInput = {
  reservationDate: string;
  reservationTime: string;
  guestCount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  experience?: AppointmentExperience;
  notes?: string;
};

export type AppointmentRecord = AppointmentInput & {
  id: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
};
