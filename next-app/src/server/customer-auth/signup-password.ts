import 'server-only';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';

export function assessSignupPassword(password: string, userInputs: string[]) {
  return assessPassword(password, userInputs);
}
