export const CUSTOMER_SIGNUP_PASSWORD_MIN_LENGTH = 8;
export const CUSTOMER_SIGNUP_PASSWORD_MAX_LENGTH = 20;

export function validateSignupPasswordLength(password: string): boolean {
  const length = Array.from(password).length;
  return length >= CUSTOMER_SIGNUP_PASSWORD_MIN_LENGTH
    && length <= CUSTOMER_SIGNUP_PASSWORD_MAX_LENGTH;
}

export function validatePasswordBasics(password: string): boolean {
  const length = Array.from(password).length;
  return length > 0 && length <= 128 && password.trim().length > 0;
}

export function validateSignupPasswordBasics(password: string): boolean {
  return validateSignupPasswordLength(password) && password.trim().length > 0;
}

export function isWeakPassword(password: string, score: number): boolean {
  return Array.from(password).length < 15 || score <= 2;
}

export function isSignupPasswordWeak(password: string, score: number): boolean {
  return validateSignupPasswordBasics(password) && score <= 2;
}
