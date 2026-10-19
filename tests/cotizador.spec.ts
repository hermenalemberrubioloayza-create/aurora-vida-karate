import { expect, test } from '@playwright/test';
import {
  buildCotizacionWithInvalidSum,
  buildValidCotizacion,
} from '../src/builders/cotizacion.builder';
import { CotizadorPage } from '../src/pages/cotizador.page';

test.describe('HU-01: Cotizador Digital Aurora Vida', () => {
  test('Verificar carga inicial de la página del cotizador', async ({ page }) => {
    const cotizadorPage = new CotizadorPage(page);
    await cotizadorPage.open();

    await expect(cotizadorPage.heading).toBeVisible();
    await expect(cotizadorPage.quoteForm).toBeVisible();
    await expect(cotizadorPage.submitButton).toBeEnabled();
  });
  test('El cliente obtiene una cotización al completar el formulario', async ({ page }) => {
    const cotizadorPage = new CotizadorPage(page);
    await cotizadorPage.open();
    await cotizadorPage.submitQuote(buildValidCotizacion());

    await expect(cotizadorPage.quoteResult).toBeVisible();
    await expect(cotizadorPage.monthlyPremium).toContainText('S/');
  });

  test('La API informa que el servicio está disponible', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    await expect(response).toBeOK();
    await expect(response.json()).resolves.toMatchObject({ estado: 'OK' });
  });

  test('El catálogo muestra los plazos de cotización disponibles', async ({ request }) => {
    const response = await request.get('/api/v1/catalogos/plazos');

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { valor: 5, descripcion: '5 años' },
      { valor: 10, descripcion: '10 años' },
      { valor: 15, descripcion: '15 años' },
      { valor: 20, descripcion: '20 años' },
    ]);
  });

  test('Se puede crear y consultar una cotización válida', async ({ request }) => {
    const createResponse = await request.post('/api/v1/cotizaciones', {
      data: buildValidCotizacion(),
    });

    expect(createResponse.status()).toBe(201);
    const createdQuote = await createResponse.json();
    expect(createdQuote).toMatchObject({
      fechaCotizacion: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      fechaVencimiento: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      vigente: true,
      fechaNacimiento: '1996-02-13',
      edadActuarial: 30,
      fumador: false,
      sumaAsegurada: 100_000,
      plazo: 10,
    });
    expect(createdQuote.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const getResponse = await request.get(
      `/api/v1/cotizaciones/${createdQuote.id}`,
    );
    expect(getResponse.status()).toBe(200);
    await expect(getResponse.json()).resolves.toEqual(createdQuote);
  });

  test('La API rechaza una suma asegurada fuera de rango', async ({ request }) => {
    const response = await request.post('/api/v1/cotizaciones', {
      data: buildCotizacionWithInvalidSum(),
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      codigo: 'VALIDACION',
      detalles: [
        {
          campo: 'sumaAsegurada',
        },
      ],
    });
  });
});
