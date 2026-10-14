import { Page, Locator, expect } from '@playwright/test';

export class CotizadorPage {
  readonly page: Page;

  // Localizadores del Formulario
  readonly inputFechaNacimiento: Locator;
  readonly selectFumador: Locator;
  readonly inputSumaAsegurada: Locator;
  readonly selectPlazo: Locator;
  readonly btnCalcular: Locator;

  // Localizadores de Errores Inline
  readonly errorFechaNacimiento: Locator;
  readonly errorSumaAsegurada: Locator;
  readonly errorGlobal: Locator;

  // Localizadores del Resumen de Cotización
  readonly tarjetaResultado: Locator;
  readonly labelNumeroCotizacion: Locator;
  readonly labelFechaCotizacion: Locator;
  readonly labelPrimaMensual: Locator;
  readonly labelPrimaAnual: Locator;
  readonly btnContratar: Locator;

  constructor(page: Page) {
    this.page = page;

    // Inputs (Uso de labels accesibles recomendados por Playwright)
    this.inputFechaNacimiento = page.getByLabel(/fecha de nacimiento/i);
    this.selectFumador = page.getByLabel(/¿fumas\?/i);
    this.inputSumaAsegurada = page.getByLabel(/suma asegurada/i);
    this.selectPlazo = page.getByLabel(/plazo/i);
    this.btnCalcular = page.getByRole('button', { name: /calcular/i });

    // Mensajes de error
    this.errorFechaNacimiento = page.locator('#error-fechaNacimiento, [data-error="fechaNacimiento"]');
    this.errorSumaAsegurada = page.locator('#error-sumaAsegurada, [data-error="sumaAsegurada"]');
    this.errorGlobal = page.getByRole('alert');

    // Resultados
    this.tarjetaResultado = page.locator('#resultado-cotizacion, [data-testid="resultado-cotizacion"]');
    this.labelNumeroCotizacion = page.locator('#numero-cotizacion, [data-testid="cotizacion-id"]');
    this.labelFechaCotizacion = page.locator('#fecha-cotizacion, [data-testid="cotizacion-fecha"]');
    this.labelPrimaMensual = page.locator('#prima-mensual, [data-testid="prima-mensual"]');
    this.labelPrimaAnual = page.locator('#prima-total-anual, [data-testid="prima-anual"]');
    this.btnContratar = page.getByRole('button', { name: /contratar/i });
  }

  // Acciones
  async navegar() {
    await this.page.goto('/');
  }

  async completarFormulario(fechaNac: string, fumador: boolean, suma: string, plazo: string) {
    await this.inputFechaNacimiento.fill(fechaNac);
    
    // Si fumador es select o radio button
    if (await this.selectFumador.isVisible()) {
      await this.selectFumador.selectOption(fumador ? 'si' : 'no');
    }

    await this.inputSumaAsegurada.fill(suma);
    await this.selectPlazo.selectOption(plazo);
  }

  async clickCalcular() {
    await this.btnCalcular.click();
  }

  async clickContratar() {
    await this.btnContratar.click();
  }
}