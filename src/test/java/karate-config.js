function fn() {
  var env = karate.env; // Lee si ejecutas con -Dkarate.env=qa, etc.
  karate.log('Iniciando ejecución Karate en ambiente:', env);

  // Si en tu máquina el puerto 3000 está bloqueado por AMAgent, usa 3001
  var port = karate.properties['api.port'] || '4000';

  var config = {
    baseUrl: 'http://localhost:' + port + '/api/v1',
    testSupportUrl: 'http://localhost:' + port + '/api/test'
  };

  // Configuración de timeouts de red (buenas prácticas)
  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 5000);

  return config;
}