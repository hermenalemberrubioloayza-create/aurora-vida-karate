@ignore
Feature: Crea una cotización válida para usarla como dato de prueba (preparación, no es lo que se prueba)

  # Uso: * def cotizacion = call read('helpers/crear-cotizacion.feature')
  #      → cotizacion.id, cotizacion.creada (respuesta completa)
  # Hereda los headers del feature que lo llama, incluido X-Semillero.
  Scenario:
    * url baseUrl
    * path 'cotizaciones'
    * request { fechaNacimiento: '1996-02-13', fumador: false, sumaAsegurada: 100000, plazo: 10 }
    * method POST
    * status 201
    * def creada = response
    * def id = response.id
