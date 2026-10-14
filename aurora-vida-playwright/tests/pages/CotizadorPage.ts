import { Page, Locator, expect } from '@playwright/test';

export class CotizadorPage {
  readonly page: Page;
  readonly inputFechaNacimiento: Locator;
  readonly radioFumadorSi: Locator;
  readonly radioFumadorNo: Locator;
  readonly inputSumaAsegurada: Locator;
  readonly selectPlazo: Locator;
  readonly btnCalcular: Locator;
  readonly errorFechaNacimiento: Locator;
  readonly errorFumador: Locator;
  readonly errorSumaAsegurada: Locator;
  readonly errorPlazo: Locator;
  readonly errorGlobal: Locator;
  readonly tarjetaResultado: Locator;
  readonly labelNumeroCotizacion: Locator;
  readonly labelFechaCotizacion: Locator;
  readonly labelPrimaMensual: Locator;
  readonly labelPrimaAnual: Locator;
  readonly btnContratar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inputFechaNacimiento = page.locator('#cotizador-fecha-nacimiento-input');
    this.radioFumadorSi = page.locator('#cotizador-fumador-si-radio');
    this.radioFumadorNo = page.locator('#cotizador-fumador-no-radio');
    this.inputSumaAsegurada = page.locator('#cotizador-suma-asegurada-select');
    this.selectPlazo = page.locator('#cotizador-plazo-select');
    this.btnCalcular = page.locator('#cotizador-calcular-btn');
    this.errorFechaNacimiento = page.locator('#cotizador-fecha-nacimiento-error-msg');
    this.errorFumador = page.locator('#cotizador-fumador-error-msg');
    this.errorSumaAsegurada = page.locator('#cotizador-suma-asegurada-error-msg');
    this.errorPlazo = page.locator('#cotizador-plazo-error-msg');
    this.errorGlobal = page.getByRole('alert');
    this.tarjetaResultado = page.locator('#cotizador-resultado');
    this.labelNumeroCotizacion = page.locator('#cotizador-numero-text');
    this.labelFechaCotizacion = page.locator('#cotizador-fecha-cotizacion-text');
    this.labelPrimaMensual = page.locator('#cotizador-prima-mensual-text');
    this.labelPrimaAnual = page.locator('#cotizador-prima-anual-text');
    this.btnContratar = page.locator('#cotizador-contratar-btn');
  }

  async navegar() {
    await this.page.goto('/');
  }

  async completarFormulario(fechaNac: string, fumador: boolean, suma: string, plazo: string) {
    const fechaVisible = /^\d{4}-\d{2}-\d{2}$/.test(fechaNac)
      ? `${fechaNac.slice(8, 10)}/${fechaNac.slice(5, 7)}/${fechaNac.slice(0, 4)}`
      : fechaNac;
    await this.inputFechaNacimiento.fill(fechaVisible);
    await (fumador ? this.radioFumadorSi : this.radioFumadorNo).check();
    await this.inputSumaAsegurada.selectOption(suma);
    await this.selectPlazo.selectOption(plazo);
  }

  async clickCalcular() {
    await this.btnCalcular.click();
  }

  async clickContratar() {
    await this.btnContratar.click();
  }
}