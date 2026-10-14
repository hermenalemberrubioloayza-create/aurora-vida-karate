import { test, expect } from '@playwright/test';

const apiHeaders = { 'X-Semillero': 'pw-validation' };

test.beforeEach(async ({ page }) => {
  const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
  expect(resetResponse.status()).toBe(204);
  const clockResponse = await page.request.put('/api/test/reloj', {
    data: { fechaHora: '2026-10-13T10:00:00-05:00' },
    headers: apiHeaders,
  });
  expect(clockResponse.ok()).toBeTruthy();
  await page.setExtraHTTPHeaders(apiHeaders);
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
  expect(resetResponse.status()).toBe(204);
});

test('Corrige una fecha inválida, calcula la prima y verifica la cotización guardada', async ({ page }) => {
  await page.locator('#cotizador-fecha-nacimiento-input').fill('31/02/1990');
  await page.locator('#cotizador-fumador-no-radio').check();
  await page.locator('#cotizador-suma-asegurada-select').selectOption('100000');
  await page.locator('#cotizador-plazo-select').selectOption('10');
  await page.locator('#cotizador-calcular-btn').click();

  await expect(page.locator('#cotizador-fecha-nacimiento-error-msg')).toBeVisible();
  await expect(page.locator('#cotizador-resultado')).not.toBeVisible();

  await page.locator('#cotizador-fecha-nacimiento-input').fill('13/02/1996');
  const [createResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/v1/cotizaciones') &&
      response.request().method() === 'POST',
    ),
    page.locator('#cotizador-calcular-btn').click(),
  ]);
  expect(createResponse.status()).toBe(201);
  const quotation = await createResponse.json();

  await expect(page.locator('#cotizador-resultado')).toBeVisible();
  await expect(page.locator('#cotizador-resumen-edad-text')).toHaveText('30 años');
  const readBack = await page.request.get(`/api/v1/cotizaciones/${quotation.id}`, {
    headers: apiHeaders,
  });
  expect(readBack.status()).toBe(200);
  await expect(readBack.json()).resolves.toMatchObject({
    id: quotation.id,
    fechaNacimiento: '1996-02-13',
    vigente: true,
  });
});
