import 'server-only';

import { isAPIError } from 'better-auth/api';
import { formatWhatsAppPhoneInput, changePasswordSchema, updateNotificationPreferencesSchema, updateProfileSchema, updateWhatsAppSchema, validateNewPasswordStrength } from '@/modules/account-settings/domain/account-settings-schema';
import { CustomerAuthError, isDuplicateKey } from '@/server/customer-auth/errors';
import { getCustomerAuth } from '@/server/customer-auth/provider';
import { getCustomerSession } from '@/server/customer-auth/service';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';
import {
  findAccountSettingsByUserId,
  listCustomerTransactionsByUserId,
  updateCustomerMarketingConsent,
  updateCustomerProfileInTransaction,
  updateCustomerWhatsAppInTransaction,
} from './repository';

export async function requireAuthenticatedSession(request: Request) {
  const session = await getCustomerSession(request);
  if (!session?.user?.id) {
    throw new CustomerAuthError(
      'Sua sessão expirou. Entre novamente para continuar.',
      401,
      'UNAUTHORIZED',
    );
  }
  return session;
}

export async function listCustomerAccountTransactions(userId: string) {
  return listCustomerTransactionsByUserId(userId);
}

export async function getAccountSettingsForRequest(request: Request) {
  const session = await requireAuthenticatedSession(request);
  const row = await findAccountSettingsByUserId(session.user.id);
  const transactions = await listCustomerAccountTransactions(session.user.id);
  const formattedPhone = formatWhatsAppPhoneInput(row.customerPhone ?? row.customerNormalizedPhone ?? '');

  return {
    profile: {
      name: row.customerName || row.userName,
      email: row.customerEmail || row.userEmail,
      cpf: '***.***.***-**',
    },
    notifications: {
      reservationConfirmations: true,
      reservationReminders: true,
      newsAndEvents: Boolean(row.userMarketingConsent),
      promotions: Boolean(row.userMarketingConsent),
      whatsAppConfigured: Boolean(formattedPhone),
      whatsAppNumber: formattedPhone,
    },
    transactions,
  };
}

export async function updateAccountProfileForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      400,
      'INVALID_PROFILE_INPUT',
    );
  }
  await recordRateLimitAttempt('account-profile', session.user.id, 15, 15 * 60_000);
  try {
    await updateCustomerProfileInTransaction(session.user.id, parsed.data);
  } catch (error) {
    if (isDuplicateKey(error, 'customer_auth_user_email_uq')) {
      throw new CustomerAuthError(
        'Não foi possível usar este e-mail. Verifique os dados ou informe outro endereço.',
        409,
        'EMAIL_UNAVAILABLE',
      );
    }
    throw error;
  }
  return { profile: { ...parsed.data, cpf: '***.***.***-**' } };
}

export async function changeAccountPasswordForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Dados de senha inválidos.',
      400,
      'INVALID_PASSWORD_INPUT',
    );
  }
  const strength = validateNewPasswordStrength(parsed.data.newPassword, [session.user.name, session.user.email]);
  if (!strength.valid) {
    throw new CustomerAuthError(strength.message!, 400, 'WEAK_PASSWORD_NOT_ALLOWED');
  }
  await recordRateLimitAttempt('account-password', session.user.id, 8, 15 * 60_000);
  try {
    const result = await getCustomerAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: false,
      },
      headers: request.headers,
      returnHeaders: true,
    });
    return { headers: result.headers, response: { status: 'password_updated' as const } };
  } catch (error) {
    if (isInvalidCurrentPasswordError(error)) {
      throw new CustomerAuthError(
        'A senha atual informada está incorreta.',
        400,
        'INVALID_CURRENT_PASSWORD',
      );
    }
    throw error;
  }
}

function isInvalidCurrentPasswordError(error: unknown): boolean {
  return isAPIError(error) && (error.statusCode === 400 || error.statusCode === 401);
}

export async function updateAccountWhatsAppForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateWhatsAppSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Informe um número de WhatsApp válido.',
      400,
      'INVALID_WHATSAPP_NUMBER',
    );
  }
  await recordRateLimitAttempt('account-whatsapp', session.user.id, 10, 15 * 60_000);
  try {
    await updateCustomerWhatsAppInTransaction(session.user.id, parsed.data.phone);
  } catch (error) {
    if (isDuplicateKey(error, 'customers_normalized_phone_uq')) {
      throw new CustomerAuthError(
        'Este número de WhatsApp já está vinculado a outro cadastro.',
        409,
        'PHONE_UNAVAILABLE',
      );
    }
    throw error;
  }
  return { whatsAppConfigured: true, whatsAppNumber: parsed.data.phone.formattedPhone };
}

export async function updateAccountNotificationPreferencesForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      'Preferências de notificação inválidas.',
      400,
      'INVALID_NOTIFICATION_PREFERENCES',
    );
  }
  await updateCustomerMarketingConsent(session.user.id, parsed.data.newsAndEvents || parsed.data.promotions);
  return { preferences: parsed.data };
}
