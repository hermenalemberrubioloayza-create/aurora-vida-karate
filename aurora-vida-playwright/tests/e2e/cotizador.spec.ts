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

  test('Verificar carga inicial de la página', async () => {
    await expect(cotizadorPage.tituloPagina).toBeVisible();
    await expect(cotizadorPage.inputFechaNacimiento).toBeVisible();
    await expect(cotizadorPage.btnCalcular).toBeEnabled();
    await expect(cotizadorPage.opcionesPlazo).toHaveCount(4);
  });

  test('CA-01: Cotización exitosa para cliente de 30 años y verificación de persistencia', async ({ page }) => {
    const data = cotizadorData.clienteTreintaAnios;
    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo,
    );

    const response = await cotizadorPage.calcularYCapturarCotizacion();
    expect(response.status()).toBe(201);
    const quotation = await response.json();

    await expect(cotizadorPage.tarjetaResultado).toBeVisible();
    await expect(cotizadorPage.labelPrimaMensual).toContainText(data.esperado.primaMensual);
    expect(quotation.primaTotalAnual).toBe(data.esperado.primaTotalAnual);

    const persistedResponse = await page.request.get(`/api/v1/cotizaciones/${quotation.id}`, {
      headers: apiHeaders,
    });
    expect(persistedResponse.status()).toBe(200);
    await expect(persistedResponse.json()).resolves.toMatchObject({
      id: quotation.id,
      edadActuarial: 30,
      primaTotalAnual: data.esperado.primaTotalAnual,
    });
  });

  test('CA-05: Calcula la prima de una cliente fumadora de 45 años', async () => {
    const data = cotizadorData.clienteCuarentaYCincoAnios;
    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo,
    );

    const response = await cotizadorPage.calcularYCapturarCotizacion();
    expect(response.status()).toBe(201);
    const quotation = await response.json();

    await expect(cotizadorPage.tarjetaResultado).toBeVisible();
    await expect(cotizadorPage.labelPrimaMensual).toContainText(data.esperado.primaMensual);
    expect(quotation.primaTotalAnual).toBe(data.esperado.primaTotalAnual);
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

  test('CA-02: La suma asegurada admite montos entre S/ 50,000 y S/ 500,000 en pasos de S/ 10,000', async () => {
    await expect(cotizadorPage.inputSumaAsegurada).toHaveAttribute('min', '50000');
    await expect(cotizadorPage.inputSumaAsegurada).toHaveAttribute('max', '500000');
    await expect(cotizadorPage.inputSumaAsegurada).toHaveAttribute('step', '10000');
    await expect(cotizadorPage.opcionesPlazo).toHaveText([
      '5 años',
      '10 años',
      '15 años',
      '20 años',
    ]);
  });

  test('CA-04: Los campos requeridos impiden enviar el formulario vacío', async () => {
    await cotizadorPage.inputFechaNacimiento.fill('');
    await cotizadorPage.inputSumaAsegurada.fill('');
    await cotizadorPage.clickCalcular();

    expect(await cotizadorPage.isFormValid()).toBe(false);
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
  });

  test('CA-01 (BVA Negativo): Rechaza una edad fuera del rango permitido', async () => {
    const data = cotizadorData.clienteMenorDeEdad;
    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo,
    );
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.errorGlobal).toContainText(data.mensajeErrorEsperado);
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
  });

  test('La propuesta muestra la suma asegurada y el plazo elegidos', async () => {
    const data = cotizadorData.clienteTreintaAnios;
    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo,
    );
    await cotizadorPage.clickCalcular();

    await expect(cotizadorPage.sumaAseguradaResultado).toContainText('100,000');
    await expect(cotizadorPage.plazoResultado).toHaveText('10 años');
  });
});
