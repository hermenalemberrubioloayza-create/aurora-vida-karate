@contrato @cotizaciones
Feature: Validación de Contrato OpenAPI - HU-01 Cotizador Aurora Vida

  Background:
    * url baseUrl
    * def schemas = read('helpers/schemas.json')
    * header Accept = 'application/json'

  # --------------------------------------------------------------------------
  # 1. Catálogo de Plazos
  # --------------------------------------------------------------------------
  @smoke @catalogos
  Scenario: [GET /catalogos/plazos] Validar estructura del catálogo de plazos
    Given path 'catalogos', 'plazos'
    When method GET
    Then status 200
    # Valida que sea un arreglo donde cada elemento cumpla con plazoItemSchema
    And match response == '#[] schemas.plazoItemSchema'
    And match response contains [{ valor: 5, descripcion: '5 años' }]

  # --------------------------------------------------------------------------
  # 2. Cotización Exitosa (Happy Path del Contrato)
  # --------------------------------------------------------------------------
  @positivo
  Scenario: [POST /cotizaciones] Cotización exitosa cliente 30 años (piso de S/ 20)
    Given path 'cotizaciones'
    And request
    """
    {
      "fechaNacimiento": "1996-05-20",
      "fumador": false,
      "sumaAsegurada": 100000,
      "plazo": 10
    }
    """
    When method POST
    Then status 201
    And match response == schemas.cotizacionSuccessSchema
    And match response.vigente == true
    And match response.primaNetaAnual == 126.00
    And match response.primaTotalAnual == 129.78
    And match response.primaMensual == 20.00

  # --------------------------------------------------------------------------
  # 3. El caso que calculaste en tu reto (45 años, fumador, S/ 200,000)
  # --------------------------------------------------------------------------
  @positivo @calculo-avanzado
  Scenario: [POST /cotizaciones] Cotización cliente 45 años fumador (supera piso de 20)
    Given path 'cotizaciones'
    And request
    """
    {
      "fechaNacimiento": "1981-10-13",
      "fumador": true,
      "sumaAsegurada": 200000,
      "plazo": 20
    }
    """
    When method POST
    Then status 201
    And match response == schemas.cotizacionSuccessSchema
    And match response.primaNetaAnual == 1069.50
    And match response.primaTotalAnual == 1101.59
    And match response.primaMensual == 99.14

  # --------------------------------------------------------------------------
  # 4. Validaciones Negativas: BVA Edad fuera de rango (422)
  # --------------------------------------------------------------------------
  @negativo @regla-negocio
  Scenario Outline: [POST /cotizaciones] 422 - Rechazo por edad fuera de límites legal (<descripcion>)
    Given path 'cotizaciones'
    And request
    """
    {
      "fechaNacimiento": "<fechaNacimiento>",
      "fumador": false,
      "sumaAsegurada": 100000,
      "plazo": 10
    }
    """
    When method POST
    Then status 422
    And match response == schemas.errorSchema
    And match response.codigo == 'EDAD_FUERA_RANGO'
    And match response.mensaje == 'La edad de contratación debe estar entre 18 y 65 años.'

    Examples:
      | fechaNacimiento | descripcion        |
      | 2009-10-14      | 17 años cumplidos  |
      | 1960-10-12      | 66 años cumplidos  |

  # --------------------------------------------------------------------------
  # 5. Validaciones Negativas: Formato e integridad de datos (400)
  # --------------------------------------------------------------------------
  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Suma asegurada que no es múltiplo de 10,000
    Given path 'cotizaciones'
    And request
    """
    {
      "fechaNacimiento": "1996-05-20",
      "fumador": false,
      "sumaAsegurada": 75000,
      "plazo": 10
    }
    """
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles[0].campo == 'sumaAsegurada'