export type Customer = {
  id: number;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string | null;
  birthDate?: string | null;
  marketingConsent: boolean;
  notes?: string | null;
  firstVisitAt?: string | null;
  lastVisitAt?: string | null;
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
