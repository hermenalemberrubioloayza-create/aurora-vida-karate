import { test, expect } from '@playwright/test';
import { CotizadorPage } from '../pages/CotizadorPage';
import { cotizadorData } from '../data/cotizadorData';

test.describe('HU-01: Cotizador Digital Aurora Vida', () => {
  let cotizadorPage: CotizadorPage;
  const apiHeaders = { 'X-Semillero': 'pw-hu01' };

  test.beforeEach(async ({ page }) => {
    const resetResponse = await page.request.post('/api/test/reset', { headers: apiHeaders });
    expect(resetResponse.status()).toBe(204);
    const clockResponse = await page.request.put('/api/test/reloj', {
      data: { fechaHora: '2026-10-13T10:00:00-05:00' },
      headers: apiHeaders,
    });
    expect(clockResponse.ok()).toBeTruthy();
    await page.setExtraHTTPHeaders(apiHeaders);
    cotizadorPage = new CotizadorPage(page);
    await cotizadorPage.navegar();
  });

  test('CA-01: Cotización exitosa para cliente de 30 años y 8 meses', async ({ page }) => {
    const data = cotizadorData.clienteTreintaAnios;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.tarjetaResultado).toBeVisible();
    await expect(cotizadorPage.labelNumeroCotizacion).toHaveText(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    await expect(cotizadorPage.labelPrimaMensual).toContainText(data.esperado.primaMensual);
    await expect(cotizadorPage.labelPrimaAnual).toContainText(data.esperado.primaTotalAnual);
    await expect(cotizadorPage.btnContratar).toBeVisible();
    await expect(page.locator('#cotizador-resumen-edad-text')).toHaveText('30 años');
    await expect(page.locator('#cotizador-resumen-fumador-text')).toHaveText('No');
    await expect(page.locator('#cotizador-fecha-cotizacion-text')).toHaveText('13/10/2026');

    const quoteId = await cotizadorPage.labelNumeroCotizacion.textContent();
    expect(quoteId).toBeTruthy();
    const persistedResponse = await page.request.get(`/api/v1/cotizaciones/${quoteId}`, {
      headers: apiHeaders,
    });
    expect(persistedResponse.status()).toBe(200);
    await expect(persistedResponse.json()).resolves.toMatchObject({
      id: quoteId,
      edadActuarial: 30,
      primaTotalAnual: 129.78,
    });
  });

  test('CA-05: Calcula la prima de cliente fumador de 45 años', async () => {
    const data = cotizadorData.clienteCuarentaYCincoAnios;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.tarjetaResultado).toBeVisible();
    await expect(cotizadorPage.labelPrimaMensual).toContainText(data.esperado.primaMensual);
    await expect(cotizadorPage.labelPrimaAnual).toContainText(data.esperado.primaTotalAnual);
  });

  test('CA-06: Una cotización vencida sigue disponible para consulta por API', async ({ page }) => {
    const data = cotizadorData.clienteTreintaAnios;
    const createResponse = await page.request.post('/api/v1/cotizaciones', {
      headers: apiHeaders,
      data: {
        fechaNacimiento: data.fechaNacimiento,
        fumador: data.fumador,
        sumaAsegurada: Number(data.sumaAsegurada),
        plazo: Number(data.plazo),
      },
    });
    expect(createResponse.status()).toBe(201);
    const quotation = await createResponse.json();

    const expiryDateResponse = await page.request.put('/api/test/reloj', {
      data: { fechaHora: `${quotation.fechaVencimiento}T23:59:59-05:00` },
      headers: apiHeaders,
    });
    expect(expiryDateResponse.ok()).toBeTruthy();
    const expiresToday = await page.request.get(`/api/v1/cotizaciones/${quotation.id}`, {
      headers: apiHeaders,
    });
    expect(expiresToday.status()).toBe(200);
    expect((await expiresToday.json()).vigente).toBe(true);

    const dayAfterExpiry = new Date(`${quotation.fechaVencimiento}T00:00:00Z`);
    dayAfterExpiry.setUTCDate(dayAfterExpiry.getUTCDate() + 1);
    const expiredClockResponse = await page.request.put('/api/test/reloj', {
      data: { fechaHora: `${dayAfterExpiry.toISOString().slice(0, 10)}T00:00:00-05:00` },
      headers: apiHeaders,
    });
    expect(expiredClockResponse.ok()).toBeTruthy();
    const expiredQuote = await page.request.get(`/api/v1/cotizaciones/${quotation.id}`, {
      headers: apiHeaders,
    });
    expect(expiredQuote.status()).toBe(200);
    expect((await expiredQuote.json()).vigente).toBe(false);
  });

  test('CA-02: El selector ofrece sumas en pasos de S/ 10,000', async ({ page }) => {
    const options = await page
      .getByLabel(/suma asegurada/i)
      .locator('option')
      .evaluateAll((items) => items.map((option) => (option as HTMLOptionElement).value));
    const sums = options.filter(Boolean).map(Number);

    expect(sums).toHaveLength(46);
    expect(sums[0]).toBe(50000);
    expect(sums[sums.length - 1]).toBe(500000);
    expect(sums.every((sum, index) => index === 0 || sum - sums[index - 1] === 10000)).toBe(true);

    const plazoOptions = page.locator('#cotizador-plazo-select option');
    await expect(plazoOptions).toHaveCount(5);
    await expect(plazoOptions).toHaveText([
      'Elige un plazo',
      '5 años',
      '10 años',
      '15 años',
      '20 años',
    ]);
  });

  test('CA-04: Validación de campos obligatorios inline cuando el formulario está vacío', async () => {
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
    await expect(cotizadorPage.errorFechaNacimiento).toBeVisible();
    await expect(cotizadorPage.errorFumador).toBeVisible();
    await expect(cotizadorPage.errorSumaAsegurada).toBeVisible();
    await expect(cotizadorPage.errorPlazo).toBeVisible();
    await expect(cotizadorPage.inputFechaNacimiento).toBeFocused();
  });

  test('CA-01 (BVA Negativo): Rechazo por edad fuera de rango (17 años)', async () => {
    const data = cotizadorData.clienteMenorDeEdad;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.errorGlobal).toContainText(data.mensajeErrorEsperado);
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
  });

  test('CA-07: Contratar inicia autenticación conservando la cotización para HU-02', async ({ page }) => {
    const data = cotizadorData.clienteTreintaAnios;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();
    await cotizadorPage.clickContratar();

    await expect(page).toHaveURL(/\/login\?cotizacion=[0-9a-f-]{36}$/i);
    await expect(page.locator('#ingresar-cotizacion-text')).toHaveText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    await expect(page.locator('#ingresar-volver-link')).toHaveAttribute('href', '/');
  });

  test('La fecha de nacimiento debe respetar dd/mm/aaaa antes de llamar a la API', async () => {
    await cotizadorPage.inputFechaNacimiento.fill('31/02/1990');
    await cotizadorPage.radioFumadorNo.check();
    await cotizadorPage.inputSumaAsegurada.selectOption('100000');
    await cotizadorPage.selectPlazo.selectOption('10');
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.errorFechaNacimiento).toBeVisible();
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
  });
});