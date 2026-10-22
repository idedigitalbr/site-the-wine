const NAME_ALLOWED_CHARACTERS = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
const NAME_CONTROL_OR_FORMATTING = /[\p{Cc}\p{Cf}]/u;
const NAME_INPUT_CHARACTERS = /^[\p{L}\p{M}'’ -]+$/u;

export const CUSTOMER_NAME_MAX_LENGTH = 160;

export function normalizeNameInput(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/[^\p{L}\p{M}'’ -]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isValidCustomerName(value: string): boolean {
  if (!value || NAME_CONTROL_OR_FORMATTING.test(value) || !NAME_INPUT_CHARACTERS.test(value)) return false;
  const normalized = normalizeNameInput(value);
  const length = Array.from(normalized).length;
  return length >= 2
    && length <= CUSTOMER_NAME_MAX_LENGTH
    && NAME_ALLOWED_CHARACTERS.test(normalized);
}
