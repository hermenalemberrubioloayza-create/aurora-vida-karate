import { test, expect } from '@playwright/test';
import { CotizadorPage } from '../pages/CotizadorPage';
import { cotizadorData } from '../data/cotizadorData';

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
});

test.afterEach(async ({ page }) => {
  const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
  expect(resetResponse.status()).toBe(204);
});

test('Corrige una edad inválida, calcula la prima y verifica la cotización guardada', async ({ page }) => {
  const cotizador = new CotizadorPage(page);
  await cotizador.navegar();
  const invalidData = cotizadorData.clienteMenorDeEdad;
  await cotizador.completarFormulario(
    invalidData.fechaNacimiento,
    invalidData.fumador,
    invalidData.sumaAsegurada,
    invalidData.plazo,
  );
  await cotizador.clickCalcular();

  await expect(cotizador.errorGlobal).toContainText(invalidData.mensajeErrorEsperado);
  await expect(cotizador.tarjetaResultado).not.toBeVisible();

  const validData = cotizadorData.clienteTreintaAnios;
  await cotizador.completarFormulario(
    validData.fechaNacimiento,
    validData.fumador,
    validData.sumaAsegurada,
    validData.plazo,
  );
  const createResponse = await cotizador.calcularYCapturarCotizacion();
  expect(createResponse.status()).toBe(201);
  const quotation = await createResponse.json();

  await expect(cotizador.tarjetaResultado).toBeVisible();
  await expect(cotizador.labelPrimaMensual).toContainText(validData.esperado.primaMensual);
  const readBack = await page.request.get(`/api/v1/cotizaciones/${quotation.id}`, {
    headers: apiHeaders,
  });
  expect(readBack.status()).toBe(200);
  await expect(readBack.json()).resolves.toMatchObject({
    id: quotation.id,
    fechaNacimiento: validData.fechaNacimiento,
    vigente: true,
  });
});
