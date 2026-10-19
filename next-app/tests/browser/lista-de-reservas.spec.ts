import { expect, test } from '@playwright/test';
import { customerReservationsFixture } from './fixtures/customer-reservations';

test('anonymous access never renders the reservations list and goes to the existing access flow', async ({ page }) => {
  await page.goto('/lista-de-reservas');
  await expect(page).toHaveURL(/\/reservas(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Lista de reservas' })).toHaveCount(0);
  await expect(page.locator('[data-reservation-card]')).toHaveCount(0);
});

test('legacy route redirects to the canonical route before its session guard', async ({ request }) => {
  const response = await request.get('/area-de-reservas', { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers().location).toBe('/lista-de-reservas');
});

test('anonymous API access returns the safe auth response and never accepts external identity', async ({ request }) => {
  const response = await request.get('/api/reservations/my?customerId=11');
  expect(response.status()).toBe(401);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(response.headers().pragma).toBe('no-cache');
  expect(await response.json()).toMatchObject({ error: 'unauthorized' });
});

test('the synthetic fixture remains the single browser reference for the authenticated visual suite', async () => {
  expect(customerReservationsFixture.reservations.map(({ id }) => id)).toEqual([101, 102, 103]);
});

test.describe('authenticated browser scenarios', () => {
  test.skip(true, 'Requires the isolated server-side synthetic session provider described by the spec; no production auth bypass is installed.');

  test('renders the fixture and paginates without leaking account data', async ({ page }) => {
    await page.route('**/api/reservations/my*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(customerReservationsFixture) });
    });
    await page.goto('/lista-de-reservas');
    await expect(page.getByText('23 de outubro de 2026')).toBeVisible();
  });
});
