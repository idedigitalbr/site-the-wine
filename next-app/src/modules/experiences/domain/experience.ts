export type Experience = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  minGuests: number;
  maxGuests: number;
  active: boolean;
};
