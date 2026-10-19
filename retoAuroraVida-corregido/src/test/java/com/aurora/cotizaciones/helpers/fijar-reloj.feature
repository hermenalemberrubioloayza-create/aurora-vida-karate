@ignore
Feature: Fija el reloj del espacio del semillero (soporte de pruebas, solo con APP_MODE=test)

  # Uso: * call read('helpers/fijar-reloj.feature') { fechaHora: '2026-10-13T10:00:00-05:00' }
  # Hereda los headers del feature que lo llama, incluido X-Semillero.
  Scenario:
    Given url testSupportUrl
    And path 'reloj'
    And request { fechaHora: '#(fechaHora)' }
    When method PUT
    Then status 200
