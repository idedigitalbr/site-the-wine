import { isValidCpf, sanitizeCpfInput } from '@/modules/customer-auth/domain/cpf';
import type { CheckoutFormValues, CheckoutMethod } from './checkout-contract';

const namePattern = /[^\p{L}\p{M}\s'’-]/gu;
export function sanitizePersonName(value: string): string { return value.normalize('NFC').replace(namePattern, '').replace(/\s+/g, ' ').slice(0, 100); }
export function sanitizeCardNumber(value: string): string { return value.replace(/\D/g, '').slice(0, 19); }
export function formatCardNumber(value: string): string { return sanitizeCardNumber(value).replace(/(.{4})/g, '$1 ').trim(); }
export function sanitizeExpiry(value: string): string { const digits = value.replace(/\D/g, '').slice(0, 4); return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits; }
export function sanitizeCvv(value: string): string { return value.replace(/\D/g, '').slice(0, 4); }
export function luhnValid(value: string): boolean { const digits = sanitizeCardNumber(value); if (digits.length < 13 || digits.length > 19 || /^([0-9])\1+$/.test(digits)) return false; let sum = 0; let doubleDigit = false; for (let index = digits.length - 1; index >= 0; index -= 1) { let digit = Number(digits[index]); if (doubleDigit) { digit *= 2; if (digit > 9) digit -= 9; } sum += digit; doubleDigit = !doubleDigit; } return sum % 10 === 0; }
export function validExpiry(value: string, now = new Date()): boolean { if (!/^\d{2}\/\d{2}$/.test(value)) return false; const month = Number(value.slice(0, 2)); const year = 2000 + Number(value.slice(3)); if (month < 1 || month > 12) return false; return year > now.getFullYear() || year === now.getFullYear() && month >= now.getMonth() + 1; }
export function cardCvvLength(number: string): number { return /^(34|37)/.test(sanitizeCardNumber(number)) ? 4 : 3; }
export function validateActivePayment(method: CheckoutMethod | null, form: CheckoutFormValues, now = new Date()): { success: true } | { success: false; errors: Partial<Record<string, string>> } {
  if (!method) return { success: false, errors: { method: 'Selecione uma forma de pagamento.' } };
  return method === 'pix' ? validatePix(form) : validateCard(form, now);
}

function validatePix(form: CheckoutFormValues): { success: true } | { success: false; errors: Partial<Record<string, string>> } {
  const errors: Partial<Record<string, string>> = {};
  const name = sanitizePersonName(form.pix.fullName).trim();
  if (name.length < 2 || !/\p{L}/u.test(name)) errors['pix.fullName'] = 'Informe o nome completo.';
  if (!isValidCpf(sanitizeCpfInput(form.pix.cpf))) errors['pix.cpf'] = 'Confira os dígitos do CPF.';
  return resultFromErrors(errors);
}

function validateCard(form: CheckoutFormValues, now: Date): { success: true } | { success: false; errors: Partial<Record<string, string>> } {
  const errors: Partial<Record<string, string>> = {};
  const number = sanitizeCardNumber(form.card.number);
  const cvv = sanitizeCvv(form.card.cvv);
  if (sanitizePersonName(form.card.holderName).trim().length < 2) errors['card.holderName'] = 'Informe o nome no cartão.';
  if (!luhnValid(number)) errors['card.number'] = 'Confira o número do cartão.';
  if (!validExpiry(form.card.expiry, now)) errors['card.expiry'] = 'Informe uma validade válida.';
  if (cvv.length !== cardCvvLength(number)) errors['card.cvv'] = 'Confira o CVV.';
  if (form.card.installments !== 1) errors['card.installments'] = 'Selecione uma parcela válida.';
  return resultFromErrors(errors);
}

function resultFromErrors(errors: Partial<Record<string, string>>): { success: true } | { success: false; errors: Partial<Record<string, string>> } {
  return Object.keys(errors).length ? { success: false, errors } : { success: true };
}
