export function validatePasswordBasics(password: string): boolean {
  const length = Array.from(password).length;
  return length > 0 && length <= 128 && password.trim().length > 0;
}

export function isWeakPassword(password: string, score: number): boolean {
  return Array.from(password).length < 15 || score <= 2;
}
