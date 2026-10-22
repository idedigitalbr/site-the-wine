import { z } from 'zod';
import type { CheckoutEligibility } from '@/modules/reservations/domain/checkout-policy';

export const checkoutMethods = ['pix', 'credit', 'debit'] as const;
export type CheckoutMethod = typeof checkoutMethods[number];

export const checkoutContextSchema = z.object({
  mode: z.enum(['demo', 'gateway']),
  reservation: z.object({ id: z.number().int().positive(), publicCode: z.string().min(1), status: z.string().min(1) }),
  summary: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), durationMinutes: z.number().int().positive(), guestCount: z.number().int().positive(), specialNeeds: z.array(z.string()) }),
  quote: z.object({ id: z.string().min(1), currency: z.literal('BRL'), unitAmountCents: z.number().int().positive(), totalAmountCents: z.number().int().positive(), pricingVersion: z.string().min(1), illustrative: z.boolean() }),
  capabilities: z.object({ methods: z.array(z.enum(checkoutMethods)).min(1), installments: z.array(z.number().int().positive()).min(1), pixTtlSeconds: z.number().int().positive(), canCharge: z.boolean() }),
  serverNow: z.string().datetime({ offset: true }),
  checkoutStartedAt: z.string().datetime({ offset: true }).nullable(),
  seatGuaranteeExpiresAt: z.string().datetime({ offset: true }).nullable(),
  paymentDeadlineAt: z.string().datetime({ offset: true }).nullable(),
  timeZone: z.string().min(1),
  guaranteeActive: z.boolean(),
  checkoutProgress: z.enum(['pending', 'pix_pending', 'demo_completed', 'paid']),
  eligibility: z.object({ allowed: z.boolean(), reason: z.string().nullable() }),
  resume: z.object({ method: z.enum(checkoutMethods).nullable(), state: z.string().nullable(), pixExpiresAt: z.string().datetime({ offset: true }).nullable(), paymentId: z.string().nullable(), pixDisplayCode: z.string().nullable(), pixQrValue: z.string().nullable(), paidAt: z.string().datetime({ offset: true }).nullable() }),
});

export type CheckoutContext = z.infer<typeof checkoutContextSchema>;
export type CheckoutFormValues = { method: CheckoutMethod | null; pix: { fullName: string; cpf: string }; card: { holderName: string; number: string; expiry: string; cvv: string; installments: number } };
export type CheckoutPaymentResult = { paymentId: string; reservationId: number; method: CheckoutMethod; mode: 'demo' | 'gateway'; totalAmountCents: number } & ({ status: 'pending'; pix: { displayCode: string; qrValue: string; expiresAt: string } } | { status: 'paid'; paidAt: string; demonstrative?: boolean } | { status: 'failed' | 'expired' | 'cancelled'; message: string });

export type CheckoutApiError = { error: string; message: string; reason?: CheckoutEligibility['reason'] };
