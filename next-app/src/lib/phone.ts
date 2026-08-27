export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 13);
}

export function formatPhoneInput(value: string): string {
  const digits = phoneDigits(value);
  const national = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;

  if (national.length <= 2) return national;
  const areaCode = national.slice(0, 2);
  const number = national.slice(2);
  if (number.length <= 4) return `(${areaCode}) ${number}`;
  const prefixLength = national.length >= 11 ? 5 : 4;
  return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}
