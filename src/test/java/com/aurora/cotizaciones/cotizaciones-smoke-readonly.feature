@smoke @readonly @cotizaciones
Feature: Verificación de disponibilidad de Aurora Vida sin modificar datos

  Scenario: El endpoint de salud está disponible
    Given url healthUrl
    When method GET
    Then status 200
    And match response == { status: 'ok' }

  Scenario: El catálogo de plazos está disponible
    Given url baseUrl
    And path 'catalogos/plazos'
    When method GET
    Then status 200
    And match response == '#[4]'
    And match each response contains { valor: '#number', descripcion: '#string' }
