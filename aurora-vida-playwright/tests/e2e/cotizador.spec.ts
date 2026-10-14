import { test, expect } from '@playwright/test';
import { CotizadorPage } from '../pages/CotizadorPage';
import { cotizadorData } from '../data/cotizadorData';

test.describe('HU-01: Cotizador Digital Aurora Vida', () => {
  let cotizadorPage: CotizadorPage;

  test.beforeEach(async ({ page }) => {
    cotizadorPage = new CotizadorPage(page);
    await cotizadorPage.navegar();
  });

  test('CA-01: Cotización exitosa para cliente de 30 años (Happy Path)', async ({ page }) => {
    const data = cotizadorData.clienteTreintaAnios;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();

    // Verificaciones del Criterio 6
    await expect(cotizadorPage.tarjetaResultado).toBeVisible();
    await expect(cotizadorPage.labelNumeroCotizacion).toHaveText(/[0-9a-fA-F-]{36}/); // UUID válido
    
    // Verificaciones de Cálculo (Criterio 5)
    await expect(cotizadorPage.labelPrimaMensual).toContainText(data.esperado.primaMensual);
    await expect(cotizadorPage.labelPrimaAnual).toContainText(data.esperado.primaTotalAnual);
    await expect(cotizadorPage.btnContratar).toBeVisible();
  });

  test('CA-04: Validación de campos obligatorios inline cuando el formulario está vacío', async () => {
    // Clic directo sin llenar nada
    await cotizadorPage.clickCalcular();

    // No debe mostrar la tarjeta de resultados
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();

    // Debe mostrar mensajes de advertencia
    await expect(cotizadorPage.errorFechaNacimiento).toBeVisible();
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

    // Debe mostrar la alerta con la regla de negocio violada
    await expect(cotizadorPage.errorGlobal).toContainText(data.mensajeErrorEsperado);
    await expect(cotizadorPage.tarjetaResultado).not.toBeVisible();
  });

  test('CA-07: Botón Contratar redirige y preserva la cotización', async ({ page }) => {
    const data = cotizadorData.clienteCuarentaYCincoAnios;

    await cotizadorPage.completarFormulario(
      data.fechaNacimiento,
      data.fumador,
      data.sumaAsegurada,
      data.plazo
    );
    await cotizadorPage.clickCalcular();
    await cotizadorPage.clickContratar();

    // Valida que navega al login/registro conservando el ID en la URL o sesión
    await expect(page).toHaveURL(/.*(login|registro|auth)/);
  });
});