import { test, expect } from '@playwright/test';
import { CotizadorPage } from '../pages/CotizadorPage';
import { cotizadorData } from '../data/cotizadorData';

const apiHeaders = { 'X-Semillero': 'pw-mobile' };

test.beforeEach(async ({ page }) => {
  const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
  expect(resetResponse.status()).toBe(204);
  const clockResponse = await page.request.put('/api/test/reloj', {
    data: { fechaHora: '2026-10-13T10:00:00-05:00' },
    headers: apiHeaders,
  });
  expect(clockResponse.ok()).toBeTruthy();
  await page.setExtraHTTPHeaders(apiHeaders);
  await page.setViewportSize({ width: 390, height: 844 });
});

test.afterEach(async ({ page }) => {
  const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
  expect(resetResponse.status()).toBe(204);
});

test('En móvil, cotiza, muestra el resumen sin desbordar y permite volver al cotizador', async ({ page }) => {
  const cotizador = new CotizadorPage(page);
  const data = cotizadorData.clienteTreintaAnios;
  await cotizador.navegar();
  await cotizador.completarFormulario(
    data.fechaNacimiento,
    data.fumador,
    data.sumaAsegurada,
    data.plazo,
  );
  await cotizador.clickCalcular();

  await expect(cotizador.tarjetaResultado).toBeVisible();
  await expect(cotizador.labelPrimaMensual).toContainText(data.esperado.primaMensual);
  const layout = await page.locator('#cotizador').evaluate((element) => {
    const form = element.querySelector('.form-panel')!.getBoundingClientRect();
    const result = element.querySelector('.quote-panel')!.getBoundingClientRect();
    return { formBottom: form.bottom, resultTop: result.top, pageWidth: document.documentElement.scrollWidth };
  });
  expect(layout.resultTop).toBeGreaterThanOrEqual(layout.formBottom);
  expect(layout.pageWidth).toBeLessThanOrEqual(390);

  await cotizador.clickContratar();
  await expect(page).toHaveURL(/\/login\?cotizacion=[0-9a-f-]{36}$/i);
  await expect(page.locator('#ingresar-volver-link')).toBeVisible();
});
