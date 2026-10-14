export function sanitizeCpfInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^([0-9])\1{10}$/.test(value)) return false;

  const digits = [...value].map(Number);
  const calculateDigit = (length: number): number => {
    const sum = digits.slice(0, length).reduce((total, digit, index) => (
      total + digit * (length + 1 - index)
    ), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === digits[9] && calculateDigit(10) === digits[10];
}
