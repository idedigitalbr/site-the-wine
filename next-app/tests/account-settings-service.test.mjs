import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const ts = requireFromTest('typescript');

class TestCustomerAuthError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const mocks = {
  customerAuth: { getCustomerSession: async () => ({ user: { id: 'user-1', name: 'Ana Wine', email: 'ana@example.com' } }) },
  errors: {
    CustomerAuthError: TestCustomerAuthError,
    isDuplicateKey: (error, keyName) => error?.code === 'ER_DUP_ENTRY' && `${error.sqlMessage ?? ''} ${error.message ?? ''}`.includes(keyName),
  },
  repository: {
    findAccountSettingsByUserId: async () => ({
      userName: 'Ana Wine',
      userEmail: 'ana@example.com',
      userMarketingConsent: 1,
      customerName: 'Ana Wine',
      customerEmail: 'ana@example.com',
      customerPhone: '(91) 98765-4321',
      customerNormalizedPhone: '91987654321',
    }),
    listCustomerTransactionsByUserId: async () => {
      transactionListCalls += 1;
      return [];
    },
    updateCustomerProfileInTransaction: async () => undefined,
    updateCustomerWhatsAppInTransaction: async () => undefined,
    updateCustomerMarketingConsent: async () => undefined,
  },
  rate: { recordRateLimitAttempt: async () => undefined },
  provider: { getCustomerAuth: () => ({ api: { changePassword: async () => ({ headers: new Headers() }) } }) },
  betterAuthApi: { isAPIError: (error) => Boolean(error?.statusCode) },
};

const moduleCache = new Map();
let transactionListCalls = 0;

function loadTypeScript(relativePath) {
  const filename = isAbsolute(relativePath)
    ? relativePath
    : fileURLToPath(new URL(relativePath, import.meta.url));
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const loaded = { exports: {} };
  moduleCache.set(filename, loaded);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    const aliases = {
      '@/modules/account-settings/domain/account-settings-schema': '../src/modules/account-settings/domain/account-settings-schema.ts',
      '@/modules/customer-auth/domain/password-policy': '../src/modules/customer-auth/domain/password-policy.ts',
      '@/modules/customer-auth/domain/password-strength': '../src/modules/customer-auth/domain/password-strength.ts',
    };
    if (Object.hasOwn(aliases, specifier)) return loadTypeScript(aliases[specifier]);
    if (specifier === './repository') return mocks.repository;
    if (specifier.startsWith('.')) {
      let dependency = resolve(dirname(filename), specifier);
      if (!extname(dependency)) dependency += '.ts';
      return loadTypeScript(dependency);
    }
    if (specifier === '@/server/customer-auth/service') return mocks.customerAuth;
    if (specifier === '@/server/customer-auth/errors') return mocks.errors;
    if (specifier === '@/server/customer-auth/repository') return mocks.repository;
    if (specifier === '@/server/customer-auth/rate-limit') return mocks.rate;
    if (specifier === '@/server/customer-auth/provider') return mocks.provider;
    if (specifier === 'better-auth/api') return mocks.betterAuthApi;
    if (specifier === 'server-only') return {};
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

const service = loadTypeScript('../src/server/account-settings/service.ts');

function request(body = undefined) {
  return new Request('https://thewineexperience.com.br/api/account/settings', body === undefined
    ? { headers: { cookie: 'session=1' } }
    : { method: 'PUT', headers: { cookie: 'session=1', 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('returns real account settings for an authenticated session', async () => {
  transactionListCalls = 0;
  const result = await service.getAccountSettingsForRequest(request());
  assert.equal(result.userId, 'user-1');
  assert.equal(result.profile.name, 'Ana Wine');
  assert.equal(result.profile.cpf, '***.***.***-**');
  assert.equal(result.notifications.whatsAppNumber, '(91) 98765-4321');
  assert.equal('transactions' in result, false);
  assert.equal(transactionListCalls, 0);
});

test('returns account transactions for the authenticated session only', async () => {
  transactionListCalls = 0;
  mocks.repository.listCustomerTransactionsByUserId = async (userId) => {
    transactionListCalls += 1;
    assert.equal(userId, 'user-1');
    return [{ id: 'pay-1' }];
  };
  const result = await service.getAccountTransactionsForRequest(request());
  assert.equal(result.userId, 'user-1');
  assert.deepEqual(result.transactions, [{ id: 'pay-1' }]);
  assert.equal(transactionListCalls, 1);
  mocks.repository.listCustomerTransactionsByUserId = async () => {
    transactionListCalls += 1;
    return [];
  };
});

test('rejects anonymous account-settings requests with 401', async () => {
  mocks.customerAuth.getCustomerSession = async () => null;
  await assert.rejects(
    () => service.getAccountSettingsForRequest(request()),
    (error) => error instanceof TestCustomerAuthError && error.status === 401 && error.code === 'UNAUTHORIZED',
  );
  mocks.customerAuth.getCustomerSession = async () => ({ user: { id: 'user-1', name: 'Ana Wine', email: 'ana@example.com' } });
});

test('rejects anonymous transaction requests without querying history', async () => {
  transactionListCalls = 0;
  mocks.customerAuth.getCustomerSession = async () => null;
  await assert.rejects(
    () => service.getAccountTransactionsForRequest(request()),
    (error) => error instanceof TestCustomerAuthError && error.status === 401 && error.code === 'UNAUTHORIZED',
  );
  assert.equal(transactionListCalls, 0);
  mocks.customerAuth.getCustomerSession = async () => ({ user: { id: 'user-1', name: 'Ana Wine', email: 'ana@example.com' } });
});

test('translates duplicate profile email into a 409 conflict', async () => {
  mocks.repository.updateCustomerProfileInTransaction = async () => {
    throw { code: 'ER_DUP_ENTRY', sqlMessage: 'customer_auth_user_email_uq' };
  };
  await assert.rejects(
    () => service.updateAccountProfileForRequest(request({ name: 'Ana Wine', email: 'other@example.com' }), { name: 'Ana Wine', email: 'other@example.com' }),
    (error) => error instanceof TestCustomerAuthError && error.status === 409 && error.code === 'EMAIL_UNAVAILABLE',
  );
  mocks.repository.updateCustomerProfileInTransaction = async () => undefined;
});

test('translates duplicate WhatsApp numbers into a 409 conflict', async () => {
  mocks.repository.updateCustomerWhatsAppInTransaction = async () => {
    throw { code: 'ER_DUP_ENTRY', sqlMessage: 'customers_normalized_phone_uq' };
  };
  await assert.rejects(
    () => service.updateAccountWhatsAppForRequest(request({ phone: '91987654321' }), { phone: '91987654321' }),
    (error) => error instanceof TestCustomerAuthError && error.status === 409 && error.code === 'PHONE_UNAVAILABLE',
  );
  mocks.repository.updateCustomerWhatsAppInTransaction = async () => undefined;
});

test('translates Better Auth invalid current password into a 400 error', async () => {
  mocks.provider.getCustomerAuth = () => ({ api: { changePassword: async () => { throw { statusCode: 401 }; } } });
  await assert.rejects(
    () => service.changeAccountPasswordForRequest(request({ currentPassword: 'current password 123', newPassword: 'A secure wine password 2026!', confirmPassword: 'A secure wine password 2026!' }), {
      currentPassword: 'current password 123',
      newPassword: 'A secure wine password 2026!',
      confirmPassword: 'A secure wine password 2026!',
    }),
    (error) => error instanceof TestCustomerAuthError && error.status === 400 && error.code === 'INVALID_CURRENT_PASSWORD',
  );
  mocks.provider.getCustomerAuth = () => ({ api: { changePassword: async () => ({ headers: new Headers() }) } });
});
