import 'server-only';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import { isSignupPasswordWeak, validateSignupPasswordBasics } from '@/modules/customer-auth/domain/password-policy';
import { isCompromisedPassword } from './password-compromise';

export async function assessSignupPassword(password: string, userInputs: string[]) {
  const assessment = assessPassword(password, userInputs);
  if (!validateSignupPasswordBasics(password)) return { ...assessment, compromised: false };
  const compromised = await isCompromisedPassword(password);
  return { ...assessment, compromised, weak: isSignupPasswordWeak(password, assessment.score) || compromised };
}
