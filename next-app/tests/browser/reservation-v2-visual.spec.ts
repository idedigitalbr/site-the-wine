import { expect, test, type Page, type Route } from '@playwright/test';

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installVisualFixture(page: Page) {
  await page.clock.install({ time: new Date('2026-10-01T12:00:00-03:00') });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/customer-auth/session' && method === 'GET') {
      return json(route, { status: 'authenticated', user: { id: 'visual-customer', name: 'Cliente de teste' } });
    }
    if (url.pathname === '/api/reservations/flow' && method === 'POST') {
      return json(route, { flowId: 'flow_visual_' + 'x'.repeat(32), attemptId: 'attempt_visual_' + 'x'.repeat(29), revision: 0 });
    }
    if (url.pathname === '/api/reservations/availability' && method === 'GET') {
      return json(route, {
        slots: ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00'].map((startTime) => ({
          startTime,
          endTime: startTime,
          availableTableCount: 14,
          eligibleGuestCounts: Array.from({ length: 12 }, (_, index) => index + 1),
          options: [],
        })),
      });
    }
    if (url.pathname === '/api/customer-auth/check-session' && method === 'POST') return json(route, { valid: true });
    if (url.pathname === '/api/reservations/hold' && method === 'POST') {
      return json(route, {
        holdId: 7,
        tableIds: [7, 8],
        allocatedTableCount: 2,
        attemptId: 'attempt_visual_' + 'x'.repeat(29),
        revision: 1,
        expiresAt: Date.now() + 15 * 60_000,
      });
    }
    if (url.pathname === '/api/reservations' && method === 'POST') {
      return json(route, { reservationId: 7, publicCode: 'TW-VISUAL', secureToken: 'visual-token', status: 'confirmed' });
    }
    return route.abort();
  });
}

async function openData(page: Page) {
  await page.goto('/reservas');
  await expect(page.locator('.reservation-calendar')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reserve sua experiência' })).toBeVisible();
}

async function chooseDateAndTime(page: Page) {
  await page.getByRole('button', { name: /22 de outubro de 2026/i }).click();
  await expect(page.getByRole('button', { name: '20:30', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '20:30', exact: true }).click();
}

test.describe('reservas V2.4 visual fixture', () => {
  test.use({ viewport: { width: 1024, height: 682 } });

  test('Data renders the authored calendar beside the time grid', async ({ page }) => {
    await installVisualFixture(page);
    await openData(page);
    await expect(page.getByText('Selecione a data da reserva')).toBeVisible();
    await expect(page.locator('.reservation-calendar-grid > .reservation-calendar-weekday')).toHaveCount(7);
    const selectedDate = page.getByRole('button', { name: /22 de outubro de 2026/i });
    await selectedDate.focus();
    await selectedDate.press('ArrowRight');
    await expect(page.getByRole('button', { name: /23 de outubro de 2026/i })).toHaveAttribute('aria-pressed', 'true');
    await chooseDateAndTime(page);
    await page.screenshot({ path: test.info().outputPath('01-data-horario.png'), fullPage: false });
    await page.locator('.reservation-calendar').screenshot({ path: test.info().outputPath('crop-calendario.png') });
    await page.locator('.reservation-wizard-actions').screenshot({ path: test.info().outputPath('crop-barra-data.png') });
  });

  test('Pessoas uses grouped disclosure and truthful pre-hold summary', async ({ page }) => {
    await installVisualFixture(page);
    await openData(page);
    await chooseDateAndTime(page);
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('.reservation-guest-trigger')).toBeVisible();
    await page.locator('.reservation-guest-trigger').click();
    await expect(page.locator('.reservation-guest-group')).toHaveCount(5);
    await expect(page.getByRole('button', { name: '6 pessoas', exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('02-pessoas-aberto.png'), fullPage: false });
    await page.locator('.reservation-guest-options').screenshot({ path: test.info().outputPath('crop-pessoas-aberto.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('.reservation-guest-trigger')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.reservation-guest-trigger')).toBeFocused();
    await page.locator('.reservation-guest-trigger').click();
    await page.getByRole('button', { name: '6 pessoas', exact: true }).click();
    await expect(page.getByText('Alocação ao continuar', { exact: true })).toBeVisible();
    await expect(page.locator('.reservation-guest-trigger').getByText('6 pessoas', { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('03-pessoas-selecionado.png'), fullPage: false });
  });

  test('Preferências uses six illustrated cards and a real counter', async ({ page }) => {
    await installVisualFixture(page);
    await openData(page);
    await chooseDateAndTime(page);
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.locator('.reservation-guest-trigger').click();
    await page.getByRole('button', { name: '6 pessoas', exact: true }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('.reservation-preference-card')).toHaveCount(6);
    await expect(page.getByText('Nenhuma', { exact: true })).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Restrição alimentar' }).check();
    await expect(page.getByText('0/500 caracteres')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('04-preferencias.png'), fullPage: false });
    await page.locator('.reservation-preference-card-selected').screenshot({ path: test.info().outputPath('crop-preferencia-marcada.png') });
  });

  test('Confirmação keeps compact review rows and a right summary', async ({ page }) => {
    await installVisualFixture(page);
    await openData(page);
    await chooseDateAndTime(page);
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.locator('.reservation-guest-trigger').click();
    await page.getByRole('button', { name: '6 pessoas', exact: true }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await page.getByRole('button', { name: /Continuar/i }).click();
    await expect(page.locator('.reservation-review-grid')).toBeVisible();
    await expect(page.locator('.reservation-review-summary')).toBeVisible();
    await expect.poll(() => page.locator('.reservation-review-summary-photo').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.reservation-review-row')).toHaveCount(4);
    const reviewRowHeights = await page.locator('.reservation-review-row').evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    expect(Math.max(...reviewRowHeights)).toBeLessThanOrEqual(64);
    await expect(page.getByText('CPF')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Editar conta/i })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('05-confirmacao.png'), fullPage: false });
    await page.locator('.reservation-review-row').nth(1).screenshot({ path: test.info().outputPath('crop-linha-revisao.png') });
  });

  test('mobile layout stacks the reservation surfaces without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installVisualFixture(page);
    await openData(page);
    await chooseDateAndTime(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const mobileTimeColumns = await page.locator('.reservation-time-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    expect(mobileTimeColumns).toBe(2);
  });
});
