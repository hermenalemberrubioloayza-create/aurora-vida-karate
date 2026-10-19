import { Locator, Page, Response } from '@playwright/test';

export class CotizadorPage {
  readonly page: Page;
  readonly tituloPagina: Locator;
  readonly inputFechaNacimiento: Locator;
  readonly checkboxFumador: Locator;
  readonly inputSumaAsegurada: Locator;
  readonly selectPlazo: Locator;
  readonly opcionesPlazo: Locator;
  readonly btnCalcular: Locator;
  readonly errorGlobal: Locator;
  readonly tarjetaResultado: Locator;
  readonly labelPrimaMensual: Locator;
  readonly sumaAseguradaResultado: Locator;
  readonly plazoResultado: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tituloPagina = page.getByRole('heading', {
      name: 'Un futuro más tranquilo empieza hoy.',
      level: 1,
    });
    this.inputFechaNacimiento = page.getByLabel('Fecha de nacimiento');
    this.checkboxFumador = page.getByLabel('¿Fumas actualmente?');
    this.inputSumaAsegurada = page.getByLabel('Suma asegurada');
    this.selectPlazo = page.getByLabel('Plazo de cobertura');
    this.opcionesPlazo = this.selectPlazo.locator('option');
    this.btnCalcular = page.getByRole('button', { name: 'Ver mi cotización' });
    this.errorGlobal = page.getByRole('alert');
    this.tarjetaResultado = page.getByRole('heading', { name: 'Tu protección está lista' });
    this.labelPrimaMensual = page.getByTestId('monthly-premium');
    this.sumaAseguradaResultado = page.getByTestId('result-amount');
    this.plazoResultado = page.getByTestId('result-term');
  }

  async navegar() {
    await this.page.goto('/');
  }

  async completarFormulario(fechaNacimiento: string, fumador: boolean, suma: string, plazo: string) {
    await this.inputFechaNacimiento.fill(fechaNacimiento);
    await this.checkboxFumador.setChecked(fumador);
    await this.inputSumaAsegurada.fill(suma);
    await this.selectPlazo.selectOption(plazo);
  }

  async clickCalcular() {
    await this.btnCalcular.click();
  }

  async calcularYCapturarCotizacion(): Promise<Response> {
    const response = this.page.waitForResponse((candidate) =>
      candidate.url().includes('/api/v1/cotizaciones') &&
      candidate.request().method() === 'POST',
    );
    await this.clickCalcular();
    return response;
  }

  async getDocumentScrollWidth(): Promise<number> {
    return this.page.evaluate(() => document.documentElement.scrollWidth);
  }

  async isFormValid(): Promise<boolean> {
    return this.page
      .getByRole('form', { name: 'Cotización de seguro de vida' })
      .evaluate((form) => (form as HTMLFormElement).checkValidity());
  }
}
