@regresion @hu-01 @cotizar
Feature: HU-01 · Cotizar un seguro de vida temporal (POST /cotizaciones)

  # El reloj del espacio del semillero se fija en 2026-10-13 10:00 (hora de Lima):
  # todas las edades de este feature se calculan a esa fecha.

  Background:
    * url baseUrl
    * def schemas = read('helpers/schemas.json')
    * def detalleSchema = schemas.detalleSchema
    # Cada detalle de error (puede venir vacío, como en los 422 y 404) debe tener campo y mensaje
    * def detallesValidos = function(lista){ return karate.filter(lista, function(d){ return !karate.match(d, detalleSchema).pass }).length == 0 }
    * configure headers = { Accept: 'application/json', 'X-Semillero': '#(semillero)' }
    * call read('helpers/fijar-reloj.feature') { fechaHora: '2026-10-13T10:00:00-05:00' }
    * def solicitud = { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: 10 }

  # --------------------------------------------------------------------------
  # CA5 · Cálculo de primas
  # --------------------------------------------------------------------------
  @smokeTest @happypath @ca5
  Scenario: Cotización de 30 años no fumador: la prima mensual sube al mínimo de S/ 20
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1996-05-20', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 201
    And match response == schemas.cotizacionSchema
    And match response contains { edadActuarial: 30, fumador: false, sumaAsegurada: 100000, plazo: 10, vigente: true }
    And match response contains { primaNetaAnual: 126.00, primaTotalAnual: 129.78, primaMensual: 20.00 }

  @happypath @ca5
  Scenario: Cotización de 45 años fumador a 20 años: la prima mensual supera el mínimo
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1981-10-13', fumador: true, sumaAsegurada: 200000, plazo: 20 }
    When method POST
    Then status 201
    And match response == schemas.cotizacionSchema
    And match response contains { edadActuarial: 45, primaNetaAnual: 1069.50, primaTotalAnual: 1101.59, primaMensual: 99.14 }

  @happypath @ca5
  Scenario Outline: Tasa por tramo de edad en el borde de cada tramo: <edad> años → tasa <tasa>
    # Suma S/ 100,000, no fumador, plazo 5 (factor 1.00): prima neta = 100 × tasa
    Given path 'cotizaciones'
    And request { fechaNacimiento: '<fechaNacimiento>', fumador: false, sumaAsegurada: 100000, plazo: 5 }
    When method POST
    Then status 201
    And match response.edadActuarial == <edad>
    And match response contains { primaNetaAnual: <neta>, primaTotalAnual: <total>, primaMensual: <mensual> }

    Examples:
      | fechaNacimiento | edad | tasa | neta   | total  | mensual |
      | 1995-10-14      | 30   | 1.20 | 120.00 | 123.60 | 20.00   |
      | 1995-10-13      | 31   | 1.80 | 180.00 | 185.40 | 20.00   |
      | 1985-10-14      | 40   | 1.80 | 180.00 | 185.40 | 20.00   |
      | 1985-10-13      | 41   | 3.10 | 310.00 | 319.30 | 28.74   |
      | 1975-10-14      | 50   | 3.10 | 310.00 | 319.30 | 28.74   |
      | 1975-10-13      | 51   | 5.40 | 540.00 | 556.20 | 50.06   |
      | 1965-10-14      | 60   | 5.40 | 540.00 | 556.20 | 50.06   |
      | 1965-10-13      | 61   | 8.90 | 890.00 | 916.70 | 82.50   |

  @happypath @ca5
  Scenario Outline: Factor de plazo y de fumador: 35 años, S/ 200,000, plazo <plazo>, fumador <fumador>
    Given path 'cotizaciones'
    And request { fechaNacimiento: '1991-10-13', fumador: <fumador>, sumaAsegurada: 200000, plazo: <plazo> }
    When method POST
    Then status 201
    And match response contains { edadActuarial: 35, plazo: <plazo>, fumador: <fumador> }
    And match response contains { primaNetaAnual: <neta>, primaTotalAnual: <total>, primaMensual: <mensual> }

    Examples:
      | plazo | fumador | neta   | total  | mensual |
      | 5     | false   | 360.00 | 370.80 | 33.37   |
      | 10    | false   | 378.00 | 389.34 | 35.04   |
      | 15    | false   | 396.00 | 407.88 | 36.71   |
      | 20    | false   | 414.00 | 426.42 | 38.38   |
      | 5     | true    | 540.00 | 556.20 | 50.06   |

  # --------------------------------------------------------------------------
  # CA1 · Edad de contratación (edad cumplida a la fecha de cotización, 18 a 65)
  # --------------------------------------------------------------------------
  @happypath @ca1
  Scenario Outline: Edad permitida en el borde: <descripcion>
    Given path 'cotizaciones'
    And request { fechaNacimiento: '<fechaNacimiento>', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 201
    And match response == schemas.cotizacionSchema
    And match response.edadActuarial == <edad>

    Examples:
      | fechaNacimiento | edad | descripcion                         |
      | 2008-10-13      | 18   | cumple 18 el día de la cotización   |
      | 1961-10-13      | 65   | cumple 65 el día de la cotización   |
      | 1960-10-14      | 65   | 65 años, cumple 66 al día siguiente |
      | 1996-02-13      | 30   | 30 años y 8 meses cuenta como 30    |

  @negativo @ca1 @ca8
  Scenario Outline: Edad fuera del rango permitido: <descripcion> → 422 EDAD_FUERA_RANGO
    Given path 'cotizaciones'
    And request { fechaNacimiento: '<fechaNacimiento>', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 422
    And match response == schemas.errorSchema
    And match response.codigo == 'EDAD_FUERA_RANGO'

    Examples:
      | fechaNacimiento | descripcion                         |
      | 2008-10-14      | 17 años, cumple 18 al día siguiente |
      | 1960-10-13      | cumple 66 el día de la cotización   |

  # Quien nació un 29 de febrero cumple años el 1 de marzo en un año no bisiesto (2026)
  @negativo @ca1 @ca8
  Scenario: Nacido un 29 de febrero, el 28/02/2026 todavía tiene 17 años → 422 EDAD_FUERA_RANGO
    * call read('helpers/fijar-reloj.feature') { fechaHora: '2026-02-28T10:00:00-05:00' }
    Given path 'cotizaciones'
    And request { fechaNacimiento: '2008-02-29', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 422
    And match response == schemas.errorSchema
    And match response.codigo == 'EDAD_FUERA_RANGO'

  @happypath @ca1
  Scenario: Nacido un 29 de febrero, el 01/03/2026 cumple 18 años y puede cotizar
    * call read('helpers/fijar-reloj.feature') { fechaHora: '2026-03-01T10:00:00-05:00' }
    Given path 'cotizaciones'
    And request { fechaNacimiento: '2008-02-29', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    When method POST
    Then status 201
    And match response == schemas.cotizacionSchema
    And match response.edadActuarial == 18

  # --------------------------------------------------------------------------
  # CA2 · Suma asegurada (S/ 50,000 a S/ 500,000 en múltiplos de S/ 10,000)
  # --------------------------------------------------------------------------
  @happypath @ca2
  Scenario Outline: Suma asegurada permitida en el borde: S/ <sumaAsegurada>
    * set solicitud.sumaAsegurada = <sumaAsegurada>
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 201
    And match response == schemas.cotizacionSchema
    And match response.sumaAsegurada == <sumaAsegurada>

    Examples:
      | sumaAsegurada |
      | 50000         |
      | 500000        |

  @negativo @ca2 @ca8
  Scenario Outline: Suma asegurada no permitida: <descripcion> → 400
    * set solicitud.sumaAsegurada = <sumaAsegurada>
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles contains deep { campo: 'sumaAsegurada' }

    Examples:
      | sumaAsegurada | descripcion                  |
      | 40000         | menor al mínimo (40,000)     |
      | 510000        | mayor al máximo (510,000)    |
      | 75000         | no es múltiplo de 10,000     |

  # --------------------------------------------------------------------------
  # CA3 · Plazo (5, 10, 15 o 20 años). Los 4 valores válidos se cubren en CA5.
  # --------------------------------------------------------------------------
  @negativo @ca3 @ca8
  Scenario Outline: Plazo no permitido: <descripcion> → 400
    * set solicitud.plazo = <plazo>
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles contains deep { campo: 'plazo' }

    Examples:
      | plazo | descripcion             |
      | 7     | valor fuera del catálogo |
      | '10'  | número enviado como texto |

  # --------------------------------------------------------------------------
  # CA4 · Campos obligatorios
  # --------------------------------------------------------------------------
  @negativo @ca4 @ca8
  Scenario Outline: Falta el campo <campo> → 400 con el detalle en ese campo
    * remove solicitud.<campo>
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles contains deep { campo: '<campo>' }

    Examples:
      | campo           |
      | fechaNacimiento |
      | fumador         |
      | sumaAsegurada   |
      | plazo           |

  @negativo @ca4 @ca8
  Scenario: Cuerpo vacío → 400 con un detalle por cada campo obligatorio
    Given path 'cotizaciones'
    And request {}
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.detalles[*].campo contains only ['fechaNacimiento', 'fumador', 'sumaAsegurada', 'plazo']

  # --------------------------------------------------------------------------
  # CA8 · Formato y tipo de datos (400 VALIDACION)
  # --------------------------------------------------------------------------
  @negativo @ca8
  Scenario Outline: Dato con formato o tipo inválido: <descripcion> → 400
    * set solicitud.<campo> = <valor>
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
    And match response.detalles contains deep { campo: '<campo>' }

    Examples:
      | campo           | valor        | descripcion                          |
      | fechaNacimiento | '1996-02-30' | fecha que no existe en el calendario |
      | fechaNacimiento | '13/02/1996' | fecha que no está en formato ISO     |
      | fumador         | 'false'      | booleano enviado como texto          |

  @negativo @ca8
  Scenario: Campo no definido en el contrato → 400 con detalle general
    * set solicitud.extra = true
    Given path 'cotizaciones'
    And request solicitud
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.detalles contains deep { campo: 'general' }

  @negativo @ca8
  Scenario: Cuerpo que no es un JSON válido → 400
    Given path 'cotizaciones'
    And header Content-Type = 'application/json'
    And request '{ invalid-json'
    When method POST
    Then status 400
    And match response == schemas.errorSchema
    And match response.codigo == 'VALIDACION'
