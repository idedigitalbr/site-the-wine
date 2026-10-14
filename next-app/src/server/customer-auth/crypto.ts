import 'server-only';
import { createHash, createHmac, randomBytes } from 'node:crypto';

function cpfLookupSecret(): string {
  const value = process.env.CUSTOMER_CPF_LOOKUP_SECRET;
  if (!value || value.length < 32) throw new Error('CUSTOMER_CPF_LOOKUP_SECRET must contain at least 32 characters');
  return value;
}

export function hashCustomerCpf(cpf: string): string {
  return createHmac('sha256', cpfLookupSecret()).update(cpf).digest('hex');
}

export function createReservationFlowId(): string {
  return randomBytes(32).toString('base64url');
}

export function hashReservationFlowId(flowId: string): string {
  return createHash('sha256').update(flowId).digest('hex');
}
