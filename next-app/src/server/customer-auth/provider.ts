import 'server-only';
import { betterAuth } from 'better-auth';
import { randomUUID } from 'node:crypto';
import { getDatabasePool } from '@/server/db';
import { getTrustedCustomerAuthOrigins } from './origin';

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}

function createCustomerAuth() {
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_APP_URL;
  if (!baseURL) throw new Error('BETTER_AUTH_URL or PUBLIC_APP_URL is required');

  return betterAuth({
    appName: 'The Wine',
    baseURL,
    trustedOrigins: getTrustedCustomerAuthOrigins(baseURL),
    secret: requiredSecret('BETTER_AUTH_SECRET'),
    database: getDatabasePool(),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: false,
      minPasswordLength: 1,
      maxPasswordLength: 128,
    },
    user: {
      modelName: 'user',
      additionalFields: {
        cpfLookupHash: {
          type: 'string',
          required: true,
          input: true,
          returned: false,
          unique: true,
          fieldName: 'cpf_lookup_hash',
        },
        birthDate: {
          type: 'date',
          required: true,
          input: true,
          returned: false,
          fieldName: 'birth_date',
        },
        termsAcceptedAt: {
          type: 'date',
          required: true,
          input: true,
          returned: false,
          fieldName: 'terms_accepted_at',
        },
        termsVersion: {
          type: 'string',
          required: true,
          input: true,
          returned: false,
          fieldName: 'terms_version',
        },
        marketingConsent: {
          type: 'boolean',
          required: true,
          input: true,
          returned: false,
          defaultValue: false,
          fieldName: 'marketing_consent',
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      database: { generateId: () => randomUUID() },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
  });
}

let customerAuth: ReturnType<typeof createCustomerAuth> | undefined;

export function getCustomerAuth() {
  if (!customerAuth) customerAuth = createCustomerAuth();
  return customerAuth;
}
