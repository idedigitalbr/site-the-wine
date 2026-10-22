import 'server-only';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

let dummyHashPromise: Promise<string> | undefined;

function getDummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('the-wine-invalid-credential-dummy-value-v1');
  return dummyHashPromise;
}

export async function burnCredentialVerificationTime(password: string): Promise<void> {
  await verifyPassword({ hash: await getDummyPasswordHash(), password });
}
