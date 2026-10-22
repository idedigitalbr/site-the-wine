import 'server-only';
import { isAPIError } from 'better-auth/api';
import { getSessionCookie } from 'better-auth/cookies';
import { customerSignupSchema } from '@/modules/customer-auth/domain/customer-auth-schema';
import { hashCustomerCpf } from './crypto';
import { burnCredentialVerificationTime } from './credential-timing';
import { CustomerAuthError, isDuplicateKey } from './errors';
import { ensureCustomerForAuthUser, findCustomerAccountByCpf } from './repository';
import { getCustomerAuth } from './provider';
import { PasswordCompromiseCheckUnavailable } from './password-compromise';
import { assessSignupPassword } from './signup-password';

type AuthApiResult<T> = { response: T; headers: Headers };

export async function signInCustomer(request: Request, cpf: string, password: string): Promise<AuthApiResult<{ user: { id: string; name: string } }>> {
  const account = await findCustomerAccountByCpf(cpf);
  if (!account) {
    await burnCredentialVerificationTime(password);
    throw new CustomerAuthError('CPF ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
  }
  try {
    const result = await getCustomerAuth().api.signInEmail({
      body: { email: account.email, password, rememberMe: true },
      headers: request.headers,
      returnHeaders: true,
    });
    return {
      headers: result.headers,
      response: { user: { id: result.response.user.id, name: result.response.user.name } },
    };
  } catch (error) {
    if (isAPIError(error) && error.statusCode === 401) {
      throw new CustomerAuthError('CPF ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    }
    throw new CustomerAuthError('Não foi possível verificar seu acesso. Tente novamente em instantes.', 503, 'SIGN_IN_UNAVAILABLE');
  }
}

export async function signUpCustomer(
  request: Request,
  body: unknown,
): Promise<AuthApiResult<{ user: { id: string; name: string } }>> {
  const input = parseSignupInput(body);
  await assertSignupPasswordAllowed(input);
  await assertCpfAvailable(input.cpf);

  try {
    const created = await getCustomerAuth().api.signUpEmail({
      body: {
        name: input.name,
        email: input.recoveryEmail,
        password: input.password,
        cpfLookupHash: hashCustomerCpf(input.cpf),
        birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
        termsAcceptedAt: new Date(),
        termsVersion: 'placeholder-v1',
        marketingConsent: input.marketingConsent,
      },
      headers: request.headers,
      returnHeaders: true,
    });

    const profile = await ensureCustomerForAuthUser(created.response.user.id);
    const session = await getCustomerAuth().api.signInEmail({
      body: { email: created.response.user.email, password: input.password, rememberMe: true },
      headers: request.headers,
      returnHeaders: true,
    });
    return {
      headers: session.headers,
      response: { user: { id: session.response.user.id, name: profile.name } },
    };
  } catch (error) {
    if (isAccountConflict(error)) throw accountUnavailableError();
    if (error instanceof CustomerAuthError) throw error;
    throw new CustomerAuthError('Não foi possível concluir o cadastro e o acesso. Tente entrar novamente.', 503, 'SIGNUP_UNAVAILABLE');
  }
}

function parseSignupInput(body: unknown) {
  const parsed = customerSignupSchema.safeParse(body);
  if (!parsed.success) throw invalidSignupError(parsed.error.issues[0]?.path.join('.') ?? 'form');
  return parsed.data;
}

async function assertSignupPasswordAllowed(input: Awaited<ReturnType<typeof parseSignupInput>>): Promise<void> {
  let passwordAssessment: Awaited<ReturnType<typeof assessSignupPassword>>;
  try {
    passwordAssessment = await assessSignupPassword(input.password, [input.name, input.cpf, input.birthDate, input.recoveryEmail]);
  } catch (error) {
    if (error instanceof PasswordCompromiseCheckUnavailable) {
      throw new CustomerAuthError('Não foi possível verificar a segurança da senha agora. Tente novamente.', 503, 'PASSWORD_POLICY_UNAVAILABLE');
    }
    throw error;
  }
  if (passwordAssessment.weak && !input.acceptWeakPassword) throw new CustomerAuthError('Confirme que deseja usar uma senha fraca para continuar.', 400, 'WEAK_PASSWORD');
}

function isAccountConflict(error: unknown): boolean {
  return isDuplicateKey(error, 'customer_auth_user_cpf_lookup_hash_uq') || isDuplicateKey(error, 'customer_auth_user_email_uq') || isAPIError(error) && error.statusCode === 422;
}

function invalidSignupError(field: string): CustomerAuthError {
  return new CustomerAuthError('Confira os dados destacados e tente novamente.', 400, `INVALID_${field.toUpperCase().replaceAll('.', '_')}`);
}

async function assertCpfAvailable(cpf: string): Promise<void> {
  if (await findCustomerAccountByCpf(cpf)) throw accountUnavailableError();
}

function accountUnavailableError(): CustomerAuthError {
  return new CustomerAuthError('Não foi possível criar a conta com esses dados. Tente entrar ou use outro e-mail.', 409, 'ACCOUNT_UNAVAILABLE');
}

export async function getCustomerSession(request: Request) {
  if (!getSessionCookie(request)) return null;

  const result = await getCustomerAuth().api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!result) return null;
  return {
    user: { id: result.user.id, name: result.user.name, email: result.user.email },
    expiresAt: result.session.expiresAt,
  };
}

export async function signOutCustomer(request: Request): Promise<Headers> {
  const result = await getCustomerAuth().api.signOut({ headers: request.headers, returnHeaders: true });
  return result.headers;
}
