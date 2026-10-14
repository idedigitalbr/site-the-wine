import { expect, test, type Page, type Route } from '@playwright/test';

type MockOptions = {
  authenticated?: boolean;
  lookupStatus?: 'exists' | 'available';
  holdDelayMs?: number;
  checkpointResult?: 'session_expired' | 'account_changed' | 'network-once';
  reservationDelayMs?: number;
};

type MockState = {
  authenticated: boolean;
  stages: string[];
  reservations: number;
};

async function fulfill(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installApiMocks(page: Page, options: MockOptions = {}): Promise<MockState> {
  const state: MockState = {
    authenticated: options.authenticated ?? false,
    stages: [],
    reservations: 0,
  };
  let checkpointNetworkFailuresRemaining = options.checkpointResult === 'network-once' ? 1 : 0;

  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/customer-auth/session' && method === 'GET') {
      return fulfill(route, state.authenticated
        ? { status: 'authenticated', user: { id: 'customer-test', name: 'Cliente de teste' } }
        : { status: 'anonymous' });
    }
    if (pathname === '/api/reservations/flow' && method === 'POST') {
      return fulfill(route, { flowId: 'flow_test_' + 'x'.repeat(33) });
    }
    if (pathname === '/api/customer-auth/lookup' && method === 'POST') {
      return fulfill(route, { status: options.lookupStatus ?? 'exists' });
    }
    if (pathname === '/api/customer-auth/sign-in' && method === 'POST') {
      state.authenticated = true;
      return fulfill(route, { status: 'authenticated' });
    }
    if (pathname === '/api/customer-auth/sign-up' && method === 'POST') {
      state.authenticated = true;
      return fulfill(route, { status: 'created' });
    }
    if (pathname === '/api/customer-auth/check-session' && method === 'POST') {
      if (checkpointNetworkFailuresRemaining > 0) {
        checkpointNetworkFailuresRemaining -= 1;
        return route.abort();
      }
      if (options.checkpointResult === 'session_expired' || options.checkpointResult === 'account_changed') {
        return fulfill(route, {
          error: options.checkpointResult,
          message: 'A sessão não está mais disponível.',
        }, 401);
      }
      const body = route.request().postDataJSON() as { stage?: string };
      if (body.stage) state.stages.push(body.stage);
      return fulfill(route, { valid: true });
    }
    if (pathname === '/api/reservations/availability' && method === 'GET') {
      return fulfill(route, {
        slots: [{
          startTime: '19:00',
          endTime: '21:00',
          options: [{ tableIds: [1], combinationId: null, capacityMin: 1, capacityMax: 4 }],
        }],
      });
    }
    if (pathname === '/api/reservations/hold' && method === 'POST') {
      if (options.holdDelayMs) await new Promise((resolve) => setTimeout(resolve, options.holdDelayMs));
      return fulfill(route, { holdId: 1, tableIds: [1], expiresAt: Date.now() + 15 * 60_000 });
    }
    if (pathname === '/api/reservations' && method === 'POST') {
      state.reservations += 1;
      if (options.reservationDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.reservationDelayMs));
      }
      return fulfill(route, {
        reservationId: 1,
        publicCode: 'TW-TEST',
        secureToken: 'test-token',
        status: 'confirmed',
      });
    }

    await route.abort();
  });

  return state;
}

async function expectOnData(page: Page) {
  await expect(page.locator('input[type="date"]')).toBeVisible();
  await expect(page.locator('#reservation-cpf')).toHaveCount(0);
}

async function continueFromData(page: Page) {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  await page.locator('input[type="date"]').fill(date.toISOString().slice(0, 10));
  await page.getByLabel('Quantas pessoas?').selectOption('2');
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('logged-in user enters Data without Voltar, including after homepage return and reload', async ({ page }) => {
  await installApiMocks(page, { authenticated: true });
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto('/');
  await page.locator('header a[href="/reservas"]').first().click();
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
  const continueButton = page.getByRole('button', { name: 'Continuar' });
  const continueBox = await continueButton.boundingBox();
  const actionRow = await continueButton.locator('xpath=..').boundingBox();
  expect(continueBox).not.toBeNull();
  expect(actionRow).not.toBeNull();
  expect(Math.abs(actionRow!.x + actionRow!.width - continueBox!.x - continueBox!.width)).toBeLessThanOrEqual(3);

  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);

  await page.reload();
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
});

test('logged-in user can return through reservation stages to Data without reaching CPF', async ({ page }) => {
  const api = await installApiMocks(page, { authenticated: true, reservationDelayMs: 3000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reservas');
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);

  await continueFromData(page);
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  await page.getByRole('button', { name: '19:00' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Necessidades especiais')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira os detalhes')).toBeVisible();

  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
  await expect(page.locator('input[type="date"]')).toHaveValue(/.+/);
  await expect(page.getByLabel('Quantas pessoas?')).toHaveValue('2');

  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira os detalhes')).toBeVisible();
  const reservationRequest = page.waitForRequest((request) => request.url().endsWith('/api/reservations') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await reservationRequest;
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  await expect(page.getByText('Reserva recebida')).toBeVisible();

  expect(api.stages).toEqual(['data', 'time', 'preferences']);
  expect(api.reservations).toBe(1);
});

test('login completed inside reservation applies the same Data boundary', async ({ page }) => {
  await installApiMocks(page, { lookupStatus: 'exists' });
  await page.goto('/reservas');
  await expect(page.locator('#reservation-cpf')).toBeVisible();
  await page.locator('#reservation-cpf').fill('52998224725');
  await expect(page.getByRole('heading', { name: /Este CPF já possui cadastro/ })).toBeVisible();
  await page.getByRole('button', { name: 'Acessar conta' }).click();
  await page.locator('#reservation-password').fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar e continuar' }).click();

  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
});

test('signup completed inside reservation applies the same Data boundary', async ({ page }) => {
  await installApiMocks(page, { lookupStatus: 'available' });
  await page.goto('/reservas');
  await page.locator('#reservation-cpf').fill('52998224725');
  await expect(page.getByRole('heading', { name: 'Seus dados de acesso' })).toBeVisible();

  await page.locator('#signup-name').fill('Cliente de teste');
  await page.locator('#signup-birth-date').fill('1990-01-01');
  await page.locator('#signup-email').fill('cliente@example.test');
  await page.locator('#signup-email-confirmation').fill('cliente@example.test');
  await page.locator('#signup-password').fill('LongRandomWinePassphrase42');
  await page.locator('#signup-password-confirmation').fill('LongRandomWinePassphrase42');
  await page.locator('#signup-accept-terms').check();
  await page.getByRole('button', { name: 'Criar conta e continuar' }).click();

  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
});

test('Voltar is disabled while a table hold is pending', async ({ page }) => {
  await installApiMocks(page, { authenticated: true, holdDelayMs: 350 });
  await page.goto('/reservas');
  await continueFromData(page);
  await page.getByRole('button', { name: '19:00' }).click();

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
});

for (const [reason, redirectState] of [['session_expired', 'expired'], ['account_changed', 'changed']] as const) {
  test('session loss (' + reason + ') exits the reservation instead of reopening login', async ({ page }) => {
    await installApiMocks(page, { authenticated: true, checkpointResult: reason });
    await page.goto('/reservas');
    await continueFromData(page);

    await expect(page).toHaveURL(new RegExp('/\\?auth=' + redirectState + '$'));
    await expect(page.locator('#reservation-cpf')).toHaveCount(0);
  });
}

test('checkpoint network failure leaves the reservation in place with a retryable error', async ({ page }) => {
  const api = await installApiMocks(page, { authenticated: true, checkpointResult: 'network-once' });
  await page.goto('/reservas');
  await continueFromData(page);

  await expect(page).toHaveURL(/\/reservas$/);
  await expect(page.getByText('Não foi possível verificar sua conexão. Tente novamente.')).toBeVisible();
  await expect(page.locator('input[type="date"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  expect(api.stages).toEqual(['data']);
});

test('Voltar is disabled while reservation confirmation is pending', async ({ page }) => {
  await installApiMocks(page, { authenticated: true, reservationDelayMs: 3000 });
  await page.goto('/reservas');
  await continueFromData(page);
  await page.getByRole('button', { name: '19:00' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira os detalhes')).toBeVisible();

  const reservationRequest = page.waitForRequest((request) => request.url().endsWith('/api/reservations') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await reservationRequest;
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  await expect(page.getByText('Reserva recebida')).toBeVisible();
});
