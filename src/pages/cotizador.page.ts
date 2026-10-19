import type { Locator, Page } from '@playwright/test';
import type { CotizacionRequest } from '../builders/cotizacion.builder';

export class CotizadorPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  get heading(): Locator {
    return this.page.getByRole('heading', {
      level: 1,
      name: /¿Cuánto cuesta proteger a tu familia|Un futuro/i,
    });
  }

  get monthlyPremium(): Locator {
    return this.page.getByTestId('cotizador-prima-mensual-text');
  }

  get quoteError(): Locator {
    return this.page.getByRole('alert');
  }

  get quoteResult(): Locator {
    return this.page.getByRole('heading', { name: /Tu cotización|Tu protección/i });
  }

  get quoteForm(): Locator {
    return this.page.locator('form');
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /Calcular/i });
  }

  async submitQuote(quote: CotizacionRequest): Promise<void> {
    await this.page.getByLabel('Fecha de nacimiento').fill(quote.fechaNacimiento);
    await this.page.getByLabel('Suma asegurada').selectOption(String(quote.sumaAsegurada));
    await this.page.getByLabel(/Plazo/i).selectOption(String(quote.plazo));

        if (quote.fumador) {
      await this.page.locator('#cotizador-fumador-si-radio, [data-testid="cotizador-fumador-si-radio"], input[value="si"], input[value="true"]').check().catch(async () => { await this.page.getByLabel(/^Sí$/i).check(); });
    } else {
      await this.page.locator('#cotizador-fumador-no-radio, [data-testid="cotizador-fumador-no-radio"], input[value="no"], input[value="false"]').check().catch(async () => { await this.page.getByLabel(/^No$/i).check(); });
    }

    await this.submitButton.click();
  }
}
