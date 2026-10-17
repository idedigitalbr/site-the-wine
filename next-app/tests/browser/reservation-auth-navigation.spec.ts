import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { PNG } from 'pngjs';

type MockOptions = {
  authenticated?: boolean;
  lookupStatus?: 'exists' | 'available';
  holdDelayMs?: number;
  holdDurationMs?: number;
  checkpointDelayMs?: number;
  checkpointResult?: 'session_expired' | 'account_changed' | 'network-once';
  reservationDelayMs?: number;
  reservationResponses?: Array<{
    status: number;
    body?: unknown;
    contentType?: string;
  } | 'network'>;
};

type MockState = {
  authenticated: boolean;
  stages: string[];
  reservations: number;
  reservationRequests: unknown[];
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
    reservationRequests: [],
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
      return fulfill(route, { flowId: 'flow_test_' + 'x'.repeat(33), attemptId: 'attempt_test_' + 'x'.repeat(30), revision: 0 });
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
      if (options.checkpointDelayMs) await new Promise((resolve) => setTimeout(resolve, options.checkpointDelayMs));
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
          availableTableCount: 1,
          eligibleGuestCounts: [1, 2, 3, 4],
        }],
      });
    }
    if (pathname === '/api/reservations/hold' && method === 'POST') {
      if (options.holdDelayMs) await new Promise((resolve) => setTimeout(resolve, options.holdDelayMs));
      return fulfill(route, { holdId: 1, tableIds: [1], attemptId: 'attempt_test_' + 'x'.repeat(30), revision: 1, allocatedTableCount: 1, expiresAt: Date.now() + (options.holdDurationMs ?? 15 * 60_000) });
    }
    if (pathname === '/api/reservations' && method === 'POST') {
      state.reservations += 1;
      state.reservationRequests.push(route.request().postDataJSON());
      if (options.reservationDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.reservationDelayMs));
      }
      const configuredResponse = options.reservationResponses?.shift();
      if (configuredResponse === 'network') return route.abort();
      if (configuredResponse) {
        if (configuredResponse.contentType && configuredResponse.contentType !== 'application/json') {
          return route.fulfill({
            status: configuredResponse.status,
            contentType: configuredResponse.contentType,
            body: String(configuredResponse.body ?? ''),
          });
        }
        return fulfill(route, configuredResponse.body ?? {}, configuredResponse.status);
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
  await expect(page.locator('.reservation-calendar')).toBeVisible();
  await expect(page.locator('#reservation-cpf')).toHaveCount(0);
}

async function chooseFutureDate(page: Page) {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  const label = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  for (let attempt = 0; attempt < 12 && await page.getByRole('button', { name: label, exact: true }).count() === 0; attempt += 1) {
    await page.getByRole('button', { name: 'Próximo mês' }).click();
  }
  await page.getByRole('button', { name: label, exact: true }).click();
}

async function continueFromData(page: Page) {
  await chooseFutureDate(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function continueFromTime(page: Page) {
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  await page.getByRole('button', { name: '19:00' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.reservation-guest-trigger')).toBeVisible();
}

async function continueFromPeople(page: Page) {
  await page.locator('.reservation-guest-trigger').click();
  await page.locator('.reservation-guest-options').getByRole('button', { name: '2 pessoas', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: /Necessidades especiais/ })).toBeVisible();
}

async function continueToConfirmation(page: Page) {
  await continueFromTime(page);
  await continueFromPeople(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira sua reserva')).toBeVisible();
}

test('reservation stepper keeps every label on one line and aligns its markers', async ({ page }) => {
  await installApiMocks(page, { authenticated: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/reservas');

  const stepper = page.locator('.reservation-stepper-container');
  const labels = stepper.locator(':scope > div > div > span:last-child');
  const markers = stepper.locator(':scope > div > div > span:first-child');
  await expect(labels).toHaveCount(5);
  await expect(markers).toHaveCount(5);

  const labelMetrics = await labels.evaluateAll((elements) => elements.map((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return { text: element.textContent, lineCount: range.getClientRects().length };
  }));
  expect(labelMetrics).toEqual([
    { text: 'Seus dados', lineCount: 1 },
    { text: 'Data', lineCount: 1 },
    { text: 'Pessoas', lineCount: 1 },
    { text: 'Preferências', lineCount: 1 },
    { text: 'Confirmação', lineCount: 1 },
  ]);

  const markerTops = await markers.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
  expect(Math.max(...markerTops) - Math.min(...markerTops)).toBeLessThanOrEqual(1);

  const markerCenters = await markers.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }));
  const markerHorizontalCenters = await markers.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }));
  const markerGaps = markerHorizontalCenters.slice(1).map((center, index) => center - markerHorizontalCenters[index]);
  expect(Math.max(...markerGaps) - Math.min(...markerGaps)).toBeLessThanOrEqual(1);
  const connectors = stepper.locator(':scope > div > span');
  await expect(connectors).toHaveCount(4);
  const markerHorizontalRects = await markers.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  }));
  const connectorRects = await connectors.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  }));
  connectorRects.forEach((rect, index) => {
    expect(rect.left - markerHorizontalRects[index].right).toBeGreaterThanOrEqual(4);
    expect(markerHorizontalRects[index + 1].left - rect.right).toBeGreaterThanOrEqual(4);
  });
  const connectorCenters = await connectors.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top + rect.height / 2;
  }));
  connectorCenters.forEach((center, index) => {
    expect(Math.abs(center - markerCenters[index])).toBeLessThanOrEqual(1);
  });
});

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
  await continueFromTime(page);
  await continueFromPeople(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira sua reserva')).toBeVisible();

  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expectOnData(page);
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
  await expect(page.locator('.reservation-calendar-day-selected')).toHaveCount(1);

  await page.getByRole('button', { name: 'Continuar' }).click();
  await continueFromPeople(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Confira sua reserva')).toBeVisible();
  const reservationRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/reservations' && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await reservationRequest;
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  const sending = page.getByRole('button', { name: 'Enviando...' });
  await expect(sending).toBeDisabled();
  await sending.hover({ force: true });
  await expect.poll(() => activeFill(sending)).toBe('0');
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
  await continueFromTime(page);
  await page.locator('.reservation-guest-trigger').click();
  await page.locator('.reservation-guest-options').getByRole('button', { name: '2 pessoas', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
});

for (const [reason, redirectState] of [['session_expired', 'expired'], ['account_changed', 'changed']] as const) {
  test('session loss (' + reason + ') exits the reservation instead of reopening login', async ({ page }) => {
    await installApiMocks(page, { authenticated: true, checkpointResult: reason });
    await page.goto('/reservas');
    await continueFromData(page);
    await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
    await page.getByRole('button', { name: '19:00' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page).toHaveURL(new RegExp('/\\?auth=' + redirectState + '$'));
    await expect(page.locator('#reservation-cpf')).toHaveCount(0);
  });
}

test('checkpoint network failure leaves the reservation in place with a retryable error', async ({ page }) => {
  const api = await installApiMocks(page, { authenticated: true, checkpointResult: 'network-once' });
  await page.goto('/reservas');
  await continueFromData(page);
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  await page.getByRole('button', { name: '19:00' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(/\/reservas$/);
  await expect(page.getByText('Não foi possível verificar sua conexão. Tente novamente.')).toBeVisible();
  await expect(page.locator('.reservation-calendar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.reservation-guest-trigger')).toBeVisible();
  expect(api.stages).toEqual(['data']);
});

test('Voltar is disabled while reservation confirmation is pending', async ({ page }) => {
  await installApiMocks(page, { authenticated: true, reservationDelayMs: 3000 });
  await page.goto('/reservas');
  await continueFromData(page);
  await continueToConfirmation(page);

  const reservationRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/reservations' && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await reservationRequest;
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  await expect(page.getByText('Reserva recebida')).toBeVisible();
});

test('confirmation 503 with the new service error shows a technical retry message', async ({ page }) => {
  await installApiMocks(page, {
    authenticated: true,
    reservationResponses: [{
      status: 503,
      body: { error: 'reservation_service_unavailable', message: 'Não foi possível concluir agora. Tente novamente.' },
    }],
  });
  await page.goto('/reservas');
  await continueFromData(page);
  await continueToConfirmation(page);
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('Não foi possível concluir agora. Tente novamente.')).toBeVisible();
  await expect(page.getByText('Esse horário acabou de ser ocupado. Escolha outro horário, por favor.')).toHaveCount(0);
});

test('confirmation 503 with the legacy occupied code still shows a technical retry message', async ({ page }) => {
  await installApiMocks(page, {
    authenticated: true,
    reservationResponses: [{ status: 503, body: { error: 'reservation_unavailable' } }],
  });
  await page.goto('/reservas');
  await continueFromData(page);
  await continueToConfirmation(page);
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('Não foi possível concluir agora. Tente novamente.')).toBeVisible();
  await expect(page.getByText('Esse horário acabou de ser ocupado. Escolha outro horário, por favor.')).toHaveCount(0);
});

test('confirmation 409 reservation_unavailable still shows the occupied message', async ({ page }) => {
  await installApiMocks(page, {
    authenticated: true,
    reservationResponses: [{ status: 409, body: { error: 'reservation_unavailable' } }],
  });
  await page.goto('/reservas');
  await continueFromData(page);
  await continueToConfirmation(page);
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('Esse horário acabou de ser ocupado. Escolha outro horário, por favor.')).toBeVisible();
  await expect(page.getByText('Não foi possível concluir agora. Tente novamente.')).toHaveCount(0);
});

for (const [label, response] of [
  ['HTML response', { status: 503, contentType: 'text/html', body: '<html>Service Unavailable</html>' }],
  ['network failure', 'network' as const],
] as const) {
  test(`confirmation ${label} shows a technical retry message`, async ({ page }) => {
    await installApiMocks(page, { authenticated: true, reservationResponses: [response] });
    await page.goto('/reservas');
    await continueFromData(page);
    await continueToConfirmation(page);
    await page.getByRole('button', { name: 'Confirmar reserva' }).click();

    await expect(page.getByText('Não foi possível concluir agora. Tente novamente.')).toBeVisible();
  });
}

test('technical confirmation failure can be retried with the same submission identifiers', async ({ page }) => {
  const api = await installApiMocks(page, {
    authenticated: true,
    reservationResponses: [
      { status: 503, body: { error: 'reservation_service_unavailable' } },
    ],
  });
  await page.goto('/reservas');
  await continueFromData(page);
  await continueToConfirmation(page);

  const firstRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/reservations' && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await firstRequest;
  await expect(page.getByText('Não foi possível concluir agora. Tente novamente.')).toBeVisible();

  const firstPayload = api.reservationRequests[0] as Record<string, unknown>;
  expect(firstPayload.submissionId).toEqual(expect.any(String));
  expect(firstPayload.attemptId).toEqual(expect.any(String));
  expect(firstPayload.expectedRevision).toEqual(expect.any(Number));

  const secondRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/reservations' && request.method() === 'POST');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();
  await secondRequest;
  await expect(page.getByText('Reserva recebida')).toBeVisible();

  const secondPayload = api.reservationRequests[1] as Record<string, unknown>;
  expect(secondPayload.submissionId).toBe(firstPayload.submissionId);
  expect(secondPayload.attemptId).toBe(firstPayload.attemptId);
  expect(secondPayload.expectedRevision).toBe(firstPayload.expectedRevision);
});

async function activeFill(button: Locator) {
  return button.evaluate((element) => getComputedStyle(element, '::after').opacity);
}

async function restingFill(button: Locator) {
  return button.evaluate((element) => getComputedStyle(element, '::before').backgroundImage);
}

async function expectReadableHoveredLabel(button: Locator) {
  await button.hover();
  await expect.poll(() => activeFill(button)).toBe('1');
  const box = (await button.boundingBox())!;
  const lines = await button.locator('span').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return Array.from(range.getClientRects(), (rect) => ({ left: rect.left, right: rect.right }));
  });
  const image = PNG.sync.read(await button.screenshot());
  await expect(button).toHaveCSS('color', 'rgb(5, 5, 5)');
  const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const textLuminance = linear(5 / 255);
  for (const line of lines) {
    for (const edge of [line.left, line.right - 1]) {
      const x = Math.max(0, Math.min(image.width - 1, Math.floor((edge - box.x) * image.width / box.width)));
      // Gradient is horizontal: sample above the glyphs, at their actual x positions.
      const offset = (4 * image.width + x) * 4;
      const luminance = 0.2126 * linear(image.data[offset] / 255)
        + 0.7152 * linear(image.data[offset + 1] / 255)
        + 0.0722 * linear(image.data[offset + 2] / 255);
      expect((luminance + 0.05) / (textLuminance + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  }
}

async function openTimeStep(page: Page, options: MockOptions = {}) {
  const api = await installApiMocks(page, { authenticated: true, ...options });
  await page.goto('/reservas');
  await continueFromData(page);
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  return api;
}

async function openEditablePeopleStep(page: Page, options: MockOptions = {}) {
  const api = await openTimeStep(page, options);
  await continueFromTime(page);
  await expect(page.locator('.reservation-guest-trigger')).toBeVisible();
  return api;
}

test('navigation hover is independent and its central gap stays inert', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  const api = await openEditablePeopleStep(page);
  await page.locator('.reservation-guest-trigger').click();
  await page.locator('.reservation-guest-options').getByRole('button', { name: '2 pessoas', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  const back = page.getByRole('button', { name: 'Voltar', exact: true });
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  const row = next.locator('..');
  await row.screenshot({ path: test.info().outputPath('desktop-rest.png') });
  const backBox = (await back.boundingBox())!;
  const nextBox = (await next.boundingBox())!;
  const rowBox = (await row.boundingBox())!;
  expect(backBox.width / rowBox.width).toBeLessThanOrEqual(0.35);
  expect(nextBox.width / rowBox.width).toBeLessThanOrEqual(0.35);
  expect(nextBox.x - backBox.x - backBox.width).toBeGreaterThanOrEqual(rowBox.width * 0.3);
  await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
  await expect.poll(() => activeFill(back)).toBe('0');
  await expect.poll(() => activeFill(next)).toBe('0');
  await row.screenshot({ path: test.info().outputPath('desktop-rest.png') });
  await back.hover();
  await expect.poll(() => activeFill(back)).toBe('1');
  await expect.poll(() => activeFill(next)).toBe('0');
  await expect(back).toHaveCSS('color', 'rgb(5, 5, 5)');
  await expect(next).toHaveCSS('color', 'rgb(255, 255, 255)');
  await row.screenshot({ path: test.info().outputPath('desktop-back-hover.png') });
  await next.hover();
  await expect.poll(() => activeFill(next)).toBe('1');
  await expect.poll(() => activeFill(back)).toBe('0');
  await row.screenshot({ path: test.info().outputPath('desktop-next-hover.png') });
  const backAfter = (await back.boundingBox())!;
  const nextAfter = (await next.boundingBox())!;
  const currentRow = (await row.boundingBox())!;
  // Screenshots can scroll the document; compare button geometry inside the strip.
  expect({ ...backAfter, y: backAfter.y - currentRow.y }).toEqual({ ...backBox, y: backBox.y - rowBox.y });
  expect({ ...nextAfter, y: nextAfter.y - currentRow.y }).toEqual({ ...nextBox, y: nextBox.y - rowBox.y });
  expect(currentRow.height).toBe(rowBox.height);
  await page.mouse.click(currentRow.x + currentRow.width / 2, currentRow.y + currentRow.height / 2);
  await expect.poll(() => activeFill(next)).toBe('0');
  await expect(back).toBeVisible();
  await expect(page.locator('.reservation-guest-trigger')).toBeVisible();
  expect(api.stages).toEqual(['data']);
  expect(api.reservations).toBe(0);
});

test('forward hover requires a selected time while Back stays available', async ({ page }) => {
  await openEditablePeopleStep(page);
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  await expect(next).toHaveAttribute('data-hover-enabled', 'false');
  const unavailableRest = await restingFill(next);
  await next.hover();
  await expect.poll(() => activeFill(next)).toBe('0');
  await page.locator('.reservation-guest-trigger').click();
  await page.locator('.reservation-guest-options').getByRole('button', { name: '2 pessoas', exact: true }).click();
  await expect(next).toHaveAttribute('data-hover-enabled', 'true');
  const availableRest = await restingFill(next);
  expect(availableRest).not.toBe(unavailableRest);
  await next.hover();
  await expect.poll(() => activeFill(next)).toBe('1');
});

test('confirmation hover stops when the temporary table hold expires', async ({ page }) => {
  await page.clock.install();
  await openTimeStep(page, { holdDurationMs: 60_000 });
  await continueFromTime(page);
  await continueFromPeople(page);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Necessidades especiais')).toHaveCount(0);
  const confirm = page.getByRole('button', { name: 'Confirmar reserva' });
  await confirm.hover();
  await expect.poll(() => activeFill(confirm)).toBe('1');
  await page.clock.fastForward(61_000);
  await expect.poll(() => activeFill(confirm)).toBe('0');
  await expect(confirm).toBeEnabled();
});

test('hidden back action has no decoration and keyboard focus does not trigger hover', async ({ page }) => {
  await installApiMocks(page, { authenticated: true });
  await page.goto('/reservas');
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  await expect(next).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toHaveCount(0);
  await expect(page.locator('.reservation-wizard-action--back')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await next.focus();
  await expect(next).toBeFocused();
  await expect(next).toHaveCSS('outline-style', 'solid');
  await expect.poll(() => activeFill(next)).toBe('0');
  await next.hover();
  await expect.poll(() => activeFill(next)).toBe('0');
  await chooseFutureDate(page);
  await next.hover();
  await expect.poll(() => activeFill(next)).toBe('0');
  await next.click();
  await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
  await expect(next).toBeEnabled();
  await expect(page.locator('.reservation-wizard-actions')).toHaveCount(1);
});

test('busy checkpoint and hold cancel hovered fill on both actions', async ({ page }) => {
  await openEditablePeopleStep(page, { holdDelayMs: 1800 });
  const back = page.getByRole('button', { name: 'Voltar', exact: true });
  await back.hover();
  await expect.poll(() => activeFill(back)).toBe('1');
  await page.locator('.reservation-guest-trigger').click();
  await page.locator('.reservation-guest-options').getByRole('button', { name: '2 pessoas', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const holding = page.getByRole('button', { name: 'Reservando...' });
  await expect(holding).toBeDisabled();
  await expect(back).toBeDisabled();
  await holding.hover({ force: true });
  await expect.poll(() => activeFill(holding)).toBe('0');
  await back.hover({ force: true });
  await expect.poll(() => activeFill(back)).toBe('0');
  await expect(page.getByRole('heading', { name: /Necessidades especiais/ })).toBeVisible();
});

for (const width of [1366, 741, 390, 320]) {
  test(`navigation fits ${width}px and keeps its actions separated`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openEditablePeopleStep(page);
    const row = page.locator('.reservation-wizard-actions');
    await expect(row).toBeVisible();
    const back = (await page.getByRole('button', { name: 'Voltar', exact: true }).boundingBox())!;
    const next = (await page.getByRole('button', { name: 'Continuar', exact: true }).boundingBox())!;
    const bounds = (await row.boundingBox())!;
    expect(next.x - back.x - back.width).toBeGreaterThanOrEqual(12);
    expect(back.x).toBeGreaterThanOrEqual(bounds.x);
    expect(next.x + next.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await row.screenshot({ path: test.info().outputPath(`navigation-${width}.png`) });
    await continueFromPeople(page);
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    const confirm = page.getByRole('button', { name: 'Confirmar reserva' });
    await expect(page.getByText('Necessidades especiais')).toHaveCount(0);
    await expect(confirm).toHaveAttribute('type', 'submit');
    expect(await confirm.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await row.screenshot({ path: test.info().outputPath(`confirmation-${width}.png`) });
    await expectReadableHoveredLabel(confirm);
    await row.screenshot({ path: test.info().outputPath(`confirmation-hover-${width}.png`) });
    const label = confirm.locator('span');
    if (width <= 390) {
      // Whole words fit on separate lines; avoid splitting "Confirmar" mid-word.
      expect(await label.evaluate((element) => {
        const range = document.createRange();
        range.setStart(element.firstChild!, 0);
        range.setEnd(element.firstChild!, 'Confirmar'.length);
        return range.getClientRects().length;
      })).toBe(1);
    }
  });
}

test('navigation remains legible with doubled page sizing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTimeStep(page);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  await expect(next).toBeVisible();
  expect(await next.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.locator('.reservation-wizard-actions').screenshot({ path: test.info().outputPath('navigation-double-size.png') });
});

test.describe('touch navigation', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test('tap navigates without a persistent hover fill', async ({ page }) => {
    await openEditablePeopleStep(page);
    const back = page.getByRole('button', { name: 'Voltar', exact: true });
    expect(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)).toBe(false);
    await back.tap();
    await expect(page.getByRole('button', { name: '19:00' })).toBeVisible();
    const next = page.getByRole('button', { name: 'Continuar', exact: true });
    await expect.poll(() => activeFill(next)).toBe('0');
    await next.tap();
    await expect(back).toBeVisible();
    await expect.poll(() => activeFill(back)).toBe('0');
  });
});
