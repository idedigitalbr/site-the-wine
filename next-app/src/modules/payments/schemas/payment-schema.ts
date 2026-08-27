import { z } from 'zod';
import { normalizePaymentAmount } from '../domain/payment';

const idempotencyKey = z.string().trim().min(8).max(120);

export const createPaymentSchema = z.object({
  reservationId: z.number().int().positive(),
  amount: z.number().finite().refine((value) => value > 0 && value <= 99999999.99 && normalizePaymentAmount(value) === value, 'Informe um valor válido com até duas casas decimais.'),
  method: z.enum(['pix', 'card']),
  payerEmail: z.string().trim().email().max(254),
  description: z.string().trim().min(3).max(255),
  idempotencyKey,
  cardToken: z.string().trim().min(8).max(500).optional(),
  cardPaymentMethodId: z.string().trim().min(2).max(80).optional(),
}).superRefine((input, context) => {
  if (input.method === 'card' && !input.cardToken) {
    context.addIssue({ code: 'custom', path: ['cardToken'], message: 'O token do cartão é obrigatório.' });
  }
  if (input.method === 'card' && !input.cardPaymentMethodId) {
    context.addIssue({ code: 'custom', path: ['cardPaymentMethodId'], message: 'O método do cartão é obrigatório.' });
  }
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().max(255).nullable().optional(),
  idempotencyKey,
});

export type CreatePaymentCommand = z.infer<typeof createPaymentSchema>;
export type RefundPaymentCommand = z.infer<typeof refundPaymentSchema>;
