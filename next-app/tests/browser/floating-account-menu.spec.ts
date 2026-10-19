import { expect, test } from '@playwright/test';
import type { Locator, Route } from '@playwright/test';

const accountRoot = '[data-account-menu-root]';
const accountPanel = '#floating-account-menu-panel';
const authenticatedSession = {
  status: 'authenticated',
  user: { id: 'synthetic-customer-id', name: 'Pessoa de teste' },
};

function watchReservationFlowRequests(page: import('@playwright/test').Page) {
  const requests: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/reservations/flow')) requests.push(pathname);
  });
  return requests;
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function waitForPanelOpen(panel: Locator) {
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(panel).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
}

test('shows only authenticated account actions and signs out through the customer endpoint', async ({ page, context }) => {
  let sessionStatus: 'authenticated' | 'anonymous' = 'authenticated';
  let sessionCalls = 0;
  const signOutRequests: Array<{ method: string; origin?: string; cookie?: string }> = [];
  const flowRequests = watchReservationFlowRequests(page);

  await page.route('**/api/customer-auth/session', async (route) => {
    sessionCalls += 1;
    await fulfillJson(route, 200, sessionStatus === 'authenticated' ? authenticatedSession : { status: 'anonymous' });
  });
  await page.route('**/api/customer-auth/sign-out', async (route) => {
    const headers = route.request().headers();
    signOutRequests.push({
      method: route.request().method(),
      origin: headers.origin,
      cookie: headers.cookie,
    });
    sessionStatus = 'anonymous';
    await fulfillJson(route, 200, { status: 'signed_out' });
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => sessionCalls).toBe(1);
  await context.addCookies([{
    name: 'account-menu-test-session',
    value: 'synthetic-cookie',
    url: new URL(page.url()).origin,
  }]);

  await accountButton.click();
  await expect(panel).toBeVisible();
  await expect(panel.locator('a, button')).toHaveText(['Configurações da conta', 'Reservas', 'Sair']);
  await expect(panel.getByRole('link', { name: 'Configurações da conta' })).toHaveAttribute('href', '/configuracoes?tab=dados');
  await expect(panel.getByRole('link', { name: 'Reservas' })).toHaveAttribute('href', '/lista-de-reservas');
  await expect.poll(() => sessionCalls).toBe(2);

  await panel.getByRole('button', { name: 'Sair' }).click();
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  expect(signOutRequests).toHaveLength(1);
  expect(signOutRequests[0]?.method).toBe('POST');
  expect(signOutRequests[0]?.origin).toBe(new URL(page.url()).origin);
  expect(signOutRequests[0]?.cookie).toContain('account-menu-test-session=synthetic-cookie');

  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toHaveAttribute('href', '/acesso');
  await expect(panel.locator('a, button')).toHaveText(['Login/cadastro']);
  expect(flowRequests).toEqual([]);
});

test('shows only Login/cadastro for an anonymous customer and only appears on the home page', async ({ page }) => {
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, { status: 'anonymous' });
  });
  const flowRequests = watchReservationFlowRequests(page);

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);
  await accountButton.click();
  await expect(panel.locator('a, button')).toHaveText(['Login/cadastro']);
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toHaveAttribute('href', '/acesso');
  await expect(panel.getByRole('link', { name: 'Conta' })).toHaveCount(0);
  await expect(panel.getByRole('link', { name: 'Reservas' })).toHaveCount(0);
  expect(flowRequests).toEqual([]);

  await page.goto('/reservas');
  await expect(page.getByRole('button', { name: 'Minha conta' })).toHaveCount(0);
});

test('reports a failed session check and retries without treating the customer as anonymous', async ({ page }) => {
  let sessionCalls = 0;
  await page.route('**/api/customer-auth/session', async (route) => {
    sessionCalls += 1;
    if (sessionCalls === 2) {
      await fulfillJson(route, 503, { error: 'session_unavailable' });
      return;
    }
    await fulfillJson(route, 200, { status: 'anonymous' });
  });

  await page.goto('/');
  await expect.poll(() => sessionCalls).toBe(1);
  await page.getByRole('button', { name: 'Minha conta' }).click();
  const panel = page.locator(accountPanel);
  await expect(panel).toContainText('Não foi possível verificar seu acesso.');
  await expect(panel.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toHaveCount(0);

  await panel.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toBeVisible();
  await expect.poll(() => sessionCalls).toBe(3);
});

test('moves keyboard focus through the loading panel to the first confirmed action', async ({ page }) => {
  let releaseSession: ((route: Route) => void) | undefined;
  const pendingSession = new Promise<Route>((resolve) => {
    releaseSession = resolve;
  });
  await page.route('**/api/customer-auth/session', async (route) => {
    releaseSession?.(route);
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const pendingRoute = await pendingSession;
  await accountButton.focus();
  await page.keyboard.press('Enter');

  const panel = page.locator(accountPanel);
  await expect(accountButton).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeFocused();
  await expect(panel).toContainText('Verificando acesso…');
  await fulfillJson(pendingRoute, 200, authenticatedSession);
  await expect(panel.getByRole('link', { name: 'Configurações da conta' })).toBeFocused();
});

test('does not steal focus when a pending session check resolves after focus leaves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseSession: ((route: Route) => void) | undefined;
  const pendingSession = new Promise<Route>((resolve) => {
    releaseSession = resolve;
  });
  await page.route('**/api/customer-auth/session', async (route) => {
    releaseSession?.(route);
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const pendingRoute = await pendingSession;
  await accountButton.focus();
  await page.keyboard.press('Enter');
  const panel = page.locator(accountPanel);
  await expect(panel).toBeFocused();

  const hamburger = page.locator('#hamburgerBtn');
  await hamburger.focus();
  await expect(hamburger).toBeFocused();
  await fulfillJson(pendingRoute, 200, authenticatedSession);

  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  await expect(hamburger).toBeFocused();
});

test('closes on Escape with focus restoration and on outside navigation without stealing focus', async ({ page }) => {
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, { status: 'anonymous' });
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  await accountButton.click();
  await expect(page.locator(accountPanel).getByRole('link', { name: 'Login/cadastro' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  await expect(accountButton).toBeFocused();

  await accountButton.click();
  const homeLink = page.locator('header a[href="/#home"]').first();
  await homeLink.click();
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  await expect(homeLink).toBeFocused();
});

test('keeps logout pending, allows closing, and never reopens after the response', async ({ page }) => {
  let sessionStatus: 'authenticated' | 'anonymous' = 'authenticated';
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, sessionStatus === 'authenticated' ? authenticatedSession : { status: 'anonymous' });
  });

  let releaseSignOut: ((route: Route) => void) | undefined;
  const pendingSignOut = new Promise<Route>((resolve) => {
    releaseSignOut = resolve;
  });
  let signOutCalls = 0;
  await page.route('**/api/customer-auth/sign-out', async (route) => {
    signOutCalls += 1;
    releaseSignOut?.(route);
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);
  await accountButton.click();
  await panel.getByRole('button', { name: 'Sair' }).click();
  const pendingRoute = await pendingSignOut;
  await expect(panel).toContainText('Saindo…');
  await expect(panel.getByRole('button', { name: 'Sair' })).toHaveCount(0);
  expect(signOutCalls).toBe(1);

  await accountButton.click();
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  sessionStatus = 'anonymous';
  await fulfillJson(pendingRoute, 200, { status: 'signed_out' });
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');

  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toBeVisible();
});

test('keeps the authenticated menu available after logout failure and permits retry', async ({ page }) => {
  let signOutCalls = 0;
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, authenticatedSession);
  });
  await page.route('**/api/customer-auth/sign-out', async (route) => {
    signOutCalls += 1;
    await fulfillJson(route, signOutCalls === 1 ? 503 : 200, signOutCalls === 1
      ? { error: 'sign_out_unavailable' }
      : { status: 'signed_out' });
  });

  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  await accountButton.click();
  const panel = page.locator(accountPanel);
  await panel.getByRole('button', { name: 'Sair' }).click();
  await expect(panel).toContainText('Não foi possível sair. Tente novamente.');
  await expect(panel.getByRole('button', { name: 'Sair' })).toBeEnabled();

  await panel.getByRole('button', { name: 'Sair' }).click();
  await expect(accountButton).toHaveAttribute('aria-expanded', 'false');
  expect(signOutCalls).toBe(2);
});

test('hides account controls behind existing overlays and positions the panel at desktop and mobile sizes', async ({ page }) => {
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, { status: 'anonymous' });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);

  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toBeVisible();
  await waitForPanelOpen(panel);
  const buttonBounds = await accountButton.boundingBox();
  const panelBounds = await panel.boundingBox();
  expect(buttonBounds).not.toBeNull();
  expect(panelBounds).not.toBeNull();
  expect(Math.abs(buttonBounds!.x - panelBounds!.x - panelBounds!.width - 12)).toBeLessThanOrEqual(1);
  expect(Math.abs(buttonBounds!.y + buttonBounds!.height - panelBounds!.y - panelBounds!.height)).toBeLessThanOrEqual(1);
});

test('makes the account root inert while an existing modal blocks the page', async ({ page }) => {
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, { status: 'anonymous' });
  });
  await page.goto('/');
  const root = page.locator(accountRoot);

  await page.locator('#bookingModal').evaluate((modal) => modal.classList.add('active'));
  await expect(root).toHaveAttribute('inert', '');
  await expect(root).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#bookingModal').evaluate((modal) => modal.classList.remove('active'));
  await expect(root).not.toHaveAttribute('inert');
});

test('positions the menu above the mobile button and fits 320px with reduced motion', async ({ page }) => {
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, authenticatedSession);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);

  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Configurações da conta' })).toBeVisible();
  await waitForPanelOpen(panel);
  const buttonBounds = await accountButton.boundingBox();
  const panelBounds = await panel.boundingBox();
  expect(buttonBounds).not.toBeNull();
  expect(panelBounds).not.toBeNull();
  expect(Math.abs(buttonBounds!.x + buttonBounds!.width - panelBounds!.x - panelBounds!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(buttonBounds!.y - panelBounds!.y - panelBounds!.height - 12)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 320, height: 720 });
  const narrowBounds = await panel.boundingBox();
  expect(narrowBounds).not.toBeNull();
  expect(narrowBounds!.x).toBeGreaterThanOrEqual(0);
  expect(narrowBounds!.x + narrowBounds!.width).toBeLessThanOrEqual(320);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(panel).toHaveCSS('transition-duration', '0s');
});

test('captures anonymous and authenticated menu states on desktop and mobile', async ({ page }) => {
  let sessionStatus: 'authenticated' | 'anonymous' = 'anonymous';
  await page.route('**/api/customer-auth/session', async (route) => {
    await fulfillJson(route, 200, sessionStatus === 'authenticated' ? authenticatedSession : { status: 'anonymous' });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const accountButton = page.getByRole('button', { name: 'Minha conta' });
  const panel = page.locator(accountPanel);

  await page.screenshot({ path: 'test-results/floating-account-menu/anonymous-desktop-closed.png' });
  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toBeVisible();
  await waitForPanelOpen(panel);
  await page.screenshot({ path: 'test-results/floating-account-menu/anonymous-desktop-open.png' });
  await accountButton.click();
  await expect(panel).toHaveCSS('opacity', '0');

  sessionStatus = 'authenticated';
  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Configurações da conta' })).toBeVisible();
  await waitForPanelOpen(panel);
  await page.screenshot({ path: 'test-results/floating-account-menu/authenticated-desktop-open.png' });
  await accountButton.click();
  await expect(panel).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/floating-account-menu/authenticated-desktop-closed.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  sessionStatus = 'anonymous';
  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Login/cadastro' })).toBeVisible();
  await waitForPanelOpen(panel);
  await page.screenshot({ path: 'test-results/floating-account-menu/anonymous-mobile-open.png' });
  await accountButton.click();
  await expect(panel).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/floating-account-menu/anonymous-mobile-closed.png' });

  sessionStatus = 'authenticated';
  await accountButton.click();
  await expect(panel.getByRole('link', { name: 'Configurações da conta' })).toBeVisible();
  await waitForPanelOpen(panel);
  await page.screenshot({ path: 'test-results/floating-account-menu/authenticated-mobile-open.png' });
  await accountButton.click();
  await expect(panel).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/floating-account-menu/authenticated-mobile-closed.png' });
});
