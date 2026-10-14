import 'server-only';
import { isAPIError } from 'better-auth/api';
import { getSessionCookie } from 'better-auth/cookies';
import { customerSignupSchema } from '@/modules/customer-auth/domain/customer-auth-schema';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import { hashCustomerCpf } from './crypto';
import { CustomerAuthError, isDuplicateKey } from './errors';
import { ensureCustomerForAuthUser, findCustomerAccountByCpf } from './repository';
import { getCustomerAuth } from './provider';

type AuthApiResult<T> = { response: T; headers: Headers };

export async function findAccountForCpf(cpf: string) {
  return findCustomerAccountByCpf(cpf);
}

export async function signInCustomer(request: Request, cpf: string, password: string): Promise<AuthApiResult<{ user: { id: string; name: string } }>> {
  const account = await findCustomerAccountByCpf(cpf);
  if (!account) throw new CustomerAuthError('CPF ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
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
  const parsed = customerSignupSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join('.') ?? 'form';
    throw new CustomerAuthError('Confira os dados destacados e tente novamente.', 400, `INVALID_${field.toUpperCase().replaceAll('.', '_')}`);
  }
  const input = parsed.data;
  const passwordAssessment = assessPassword(input.password, [input.name, input.cpf, input.birthDate, input.recoveryEmail]);
  if (passwordAssessment.weak && !input.acceptWeakPassword) {
    throw new CustomerAuthError('Marque que deseja continuar com esta senha fraca.', 400, 'WEAK_PASSWORD_ACK_REQUIRED');
  }
  if (await findCustomerAccountByCpf(input.cpf)) {
    throw new CustomerAuthError('Não foi possível criar a conta. Recarregue a página e tente novamente.', 409, 'CPF_ALREADY_REGISTERED');
  }

  try {
    const created = await getCustomerAuth().api.signUpEmail({
      body: {
        name: input.name,
        email: input.recoveryEmail.trim().toLowerCase(),
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
    if (isDuplicateKey(error, 'customer_auth_user_cpf_lookup_hash_uq')) {
      throw new CustomerAuthError('Não foi possível criar a conta. Recarregue a página e tente novamente.', 409, 'CPF_ALREADY_REGISTERED');
    }
    if (isDuplicateKey(error, 'customer_auth_user_email_uq')) {
      throw new CustomerAuthError('Este e-mail já está em uso. Use outro e-mail ou acesse sua conta.', 409, 'EMAIL_ALREADY_REGISTERED');
    }
    if (isAPIError(error) && error.statusCode === 422) {
      throw new CustomerAuthError('Este e-mail já está em uso. Use outro e-mail ou acesse sua conta.', 409, 'EMAIL_ALREADY_REGISTERED');
    }
    if (error instanceof CustomerAuthError) throw error;
    throw new CustomerAuthError('Não foi possível concluir o cadastro e o acesso. Tente entrar novamente.', 503, 'SIGNUP_UNAVAILABLE');
  }
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
