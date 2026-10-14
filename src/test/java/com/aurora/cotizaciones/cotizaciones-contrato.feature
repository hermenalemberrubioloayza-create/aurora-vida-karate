@contrato @cotizaciones
Feature: Validación de Contrato OpenAPI - HU-01 Cotizador Aurora Vida

  Background:
    * url baseUrl
    * def schemas = read('helpers/schemas.json')
    * configure headers = { Accept: 'application/json', 'X-Semillero': 'karate-hu01' }

    # Fijar el reloj del ambiente a la fecha oficial de prueba
    Given url testSupportUrl
    And path 'reloj'
    And request { "fechaHora": "2026-10-13T10:00:00-05:00" }
    When method PUT
    Then status 200

    # Validar catálogo de plazos de la API de negocio
    Given url baseUrl
    And path 'catalogos/plazos'
    When method GET
    Then status 200
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

  @positivo @regla-negocio
  Scenario Outline: [POST /cotizaciones] Acepta edades límite permitidas (<edad> años)
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
    Then status 201
    And match response == schemas.cotizacionSuccessSchema
    And match response.edadActuarial == <edad>

    Examples:
      | fechaNacimiento | edad |
      | 2008-10-13      | 18   |
      | 1961-10-13      | 65   |

  # --------------------------------------------------------------------------
  # 5. Validaciones Negativas: Formato e integridad de datos (400)
  # --------------------------------------------------------------------------
  @positivo @validacion
  Scenario Outline: [POST /cotizaciones] Acepta suma asegurada límite de S/ <sumaAsegurada>
    Given path 'cotizaciones'
    And request
    """
    {
      "fechaNacimiento": "1996-05-20",
      "fumador": false,
      "sumaAsegurada": <sumaAsegurada>,
      "plazo": 10
    }
    """
    When method POST
    Then status 201
    And match response == schemas.cotizacionSuccessSchema
    And match response.sumaAsegurada == <sumaAsegurada>

    Examples:
      | sumaAsegurada |
      | 50000         |
      | 500000        |

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

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Fecha de nacimiento con formato válido pero calendario imposible
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-30', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles[0].campo == 'fechaNacimiento'

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Tipo de fumador debe ser booleano
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: 'false', sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles[0].campo == 'fumador'

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Plazo debe tener tipo numérico entero permitido
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: '10' }
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles[0].campo == 'plazo'

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Falta un campo obligatorio
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000 }
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles[0].campo == 'plazo'

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - El cuerpo no es JSON válido
    Given path 'cotizaciones'
    And header Content-Type = 'application/json'
    And request '{ invalid-json'
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'

  @positivo
  Scenario: [GET /cotizaciones/{id}] Cotización vencida continúa disponible para consulta
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 201
    And match responseHeaders['X-Ambiente'][0] == 'DEV'
    And def cotizacion = response
    Given url testSupportUrl
    And path 'reloj'
    And request { fechaHora: '2026-11-12T23:59:59-05:00' }
    When method PUT
    Then status 200
    Given url baseUrl
    And path 'cotizaciones', cotizacion.id
    When method GET
    Then status 200
    And match response.id == cotizacion.id
    And match response.vigente == true
    Given url testSupportUrl
    And path 'reloj'
    And request { fechaHora: '2026-11-13T00:00:00-05:00' }
    When method PUT
    Then status 200
    Given url baseUrl
    And path 'cotizaciones', cotizacion.id
    When method GET
    Then status 200
    And match response.vigente == false

  @negativo @validacion
  Scenario: [POST /cotizaciones] 400 - Rechaza propiedades no definidas en el contrato
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: 10, extra: true }
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'

  @negativo @validacion
  Scenario: [GET /cotizaciones/{id}] 400 - Identificador no es UUID
    Given path 'cotizaciones', 'no-es-uuid'
    When method GET
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'

  @positivo @catalogos
  Scenario: [GET /api/health] Servicio disponible
    Given url healthUrl
    When method GET
    Then status 200
    And match response.status == 'ok'
    And match responseHeaders['X-Ambiente'][0] == 'DEV'