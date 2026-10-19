@regresion @smokeTest @happypath @readonly
Feature: Disponibilidad de Aurora Vida sin crear ni modificar datos (apto para PROD)

  Background:
    * def schemas = read('helpers/schemas.json')

  Scenario: El servicio responde e informa el ambiente correcto
    # /api/health no está documentado en el contrato: solo se valida que responda.
    Given url healthUrl
    When method GET
    Then status 200
    And match responseHeaders['X-Ambiente'][0] == ambienteEsperado

  Scenario: El catálogo de plazos devuelve 5, 10, 15 y 20 años
    Given url baseUrl
    And path 'catalogos', 'plazos'
    When method GET
    Then status 200
    And match response == '#[4] schemas.plazoItemSchema'
    And match response[*].valor == [5, 10, 15, 20]
