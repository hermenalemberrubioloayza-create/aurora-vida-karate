@regresion @hu-01 @consultar
Feature: HU-01 · Consultar una cotización (GET /cotizaciones/{id})

  Background:
    * url baseUrl
    * def schemas = read('helpers/schemas.json')
    * def detalleSchema = schemas.detalleSchema
    # Cada detalle de error (puede venir vacío, como en los 422 y 404) debe tener campo y mensaje
    * def detallesValidos = function(lista){ return karate.filter(lista, function(d){ return !karate.match(d, detalleSchema).pass }).length == 0 }
    * configure headers = { Accept: 'application/json', 'X-Semillero': '#(semillero)' }
    * call read('helpers/fijar-reloj.feature') { fechaHora: '2026-10-13T10:00:00-05:00' }

  @smokeTest @happypath
  Scenario: La consulta devuelve la misma cotización que se creó
    * def cotizacion = call read('helpers/crear-cotizacion.feature')
    Given path 'cotizaciones', cotizacion.id
    When method GET
    Then status 200
    And match response == schemas.cotizacionSchema
    And match response == cotizacion.creada
    And match responseHeaders['X-Ambiente'][0] == ambienteEsperado

  @happypath @ca6
  Scenario: La cotización vence 30 días después de la fecha de cotización
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 201
    And match response contains { fechaCotizacion: '2026-10-13', fechaVencimiento: '2026-11-12', vigente: true }

  @happypath @ca6
  Scenario Outline: Vigencia en el borde: consultada el <momento> → vigente <vigente>
    # Una cotización vencida se puede consultar (200); lo que cambia es "vigente"
    * def cotizacion = call read('helpers/crear-cotizacion.feature')
    * call read('helpers/fijar-reloj.feature') { fechaHora: '<fechaHora>' }
    Given path 'cotizaciones', cotizacion.id
    When method GET
    Then status 200
    And match response contains { fechaVencimiento: '2026-11-12', vigente: <vigente> }

    Examples:
      | momento                         | fechaHora                 | vigente |
      | día 30 a las 23:59:59 (12/11)   | 2026-11-12T23:59:59-05:00 | true    |
      | día 31 a las 00:00:00 (13/11)   | 2026-11-13T00:00:00-05:00 | false   |

  @negativo @ca8
  Scenario: Identificador con formato UUID que no existe → 404 COTIZACION_NO_ENCONTRADA
    Given path 'cotizaciones', '00000000-0000-4000-8000-000000000000'
    When method GET
    Then status 404
    And match response == schemas.errorSchema
    And match response.codigo == 'COTIZACION_NO_ENCONTRADA'

  @negativo @ca8
  Scenario: Identificador que no es UUID → 400 VALIDACION
    Given path 'cotizaciones', 'no-es-uuid'
    When method GET
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
