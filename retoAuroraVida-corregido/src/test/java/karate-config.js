function fn() {
  // Ambientes de Aurora Vida:
  //   local   → API en tu máquina (docker run ... o npm run dev)          http://localhost:4000
  //   efimero → API levantada por el pipeline dentro del runner (CI)     http://localhost:3000
  //   dev / certi / prod → servicios publicados en Render
  // Uso: mvn test -Dkarate.env=certi
  var env = (karate.env || 'local').toLowerCase();

  var ambientes = {
    local:   { host: 'http://localhost:4000',                   ambiente: 'LOCAL' },
    efimero: { host: 'http://localhost:3000',                   ambiente: 'LOCAL' },
    dev:     { host: 'https://aurora-vida-dev.onrender.com',    ambiente: 'DEV' },
    certi:   { host: 'https://aurora-vida-certi.onrender.com',  ambiente: 'CERTI' },
    prod:    { host: 'https://aurora-vida-prod.onrender.com',   ambiente: 'PROD' }
  };
  var elegido = ambientes[env];
  if (!elegido) {
    throw new Error('Ambiente no soportado "' + env + '". Usa local, efimero, dev, certi o prod.');
  }

  // AURORA_HOST permite apuntar a otra URL sin tocar el código (por ejemplo, otro puerto local).
  var host = java.lang.System.getenv('AURORA_HOST') || elegido.host;

  // Cada semillero usa su propio espacio de datos y reloj en los ambientes compartidos.
  // Se define con -Dsemillero=<usuario> o con la variable AURORA_SEMILLERO.
  var semillero = karate.properties['semillero'] || java.lang.System.getenv('AURORA_SEMILLERO') || 'karate-hu01';

  var config = {
    env: env,
    host: host,
    baseUrl: host + '/api/v1',
    healthUrl: host + '/api/health',
    // PROD no expone soporte de pruebas: los escenarios que lo usan no deben correr ahí.
    testSupportUrl: env === 'prod' ? null : host + '/api/test',
    // Valor esperado del header X-Ambiente que devuelve la API.
    ambienteEsperado: elegido.ambiente,
    semillero: semillero
  };

  // Los servicios gratuitos de Render tardan hasta ~1 minuto en despertar.
  var remoto = env === 'dev' || env === 'certi' || env === 'prod';
  karate.configure('connectTimeout', remoto ? 30000 : 10000);
  karate.configure('readTimeout', remoto ? 90000 : 15000);

  karate.log('Ambiente:', env, '| Host:', host, '| Semillero:', semillero);
  return config;
}
