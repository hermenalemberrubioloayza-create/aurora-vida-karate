function fn() {
  var env = karate.env; // Lee el ambiente pasado por consola: -Dkarate.env=local
  if (!env) {
    env = 'local';
  }

  // Permite configurar el puerto dinámicamente
  var port = karate.properties['api.port'] || '4000';

  var config = {
    env: env,
    baseUrl: 'http://localhost:' + port + '/api/v1',
    healthUrl: 'http://localhost:' + port + '/api/health',
    testSupportUrl: 'http://localhost:' + port + '/api/test'
  };

  karate.configure('connectTimeout', 5000);
  karate.configure('readTimeout', 5000);

  return config;
}