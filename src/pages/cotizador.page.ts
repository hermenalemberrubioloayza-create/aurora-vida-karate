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
      name: /Un futuro más tranquilo empieza hoy\.|Un futuro/i,
    });
  }

  get monthlyPremium(): Locator {
    return this.page.locator('#monthly-premium, [data-testid="monthly-premium"]');
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
    return this.page.getByRole('button', { name: /Ver mi cotización|Calcular/i });
  }

  async submitQuote(quote: CotizacionRequest): Promise<void> {
    await this.page.getByLabel('Fecha de nacimiento').fill(quote.fechaNacimiento);
    await this.page.getByLabel('Suma asegurada').fill(String(quote.sumaAsegurada));
    await this.page.getByLabel(/Plazo de cobertura/i).selectOption(String(quote.plazo));

    if (quote.fumador) {
      await this.page.getByLabel(/¿Fumas actualmente\?/i).check();
    } else {
      await this.page.getByLabel(/¿Fumas actualmente\?/i).uncheck();
    }

    await this.submitButton.click();
  }
}
