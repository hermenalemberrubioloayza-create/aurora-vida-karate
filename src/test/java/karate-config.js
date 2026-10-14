function fn() {
  var env = (karate.env || 'local').toLowerCase();
  var port = karate.properties['api.port'] || '4000';
  var config = {
    env: env,
    transactionId: java.util.UUID.randomUUID().toString()
  };

  if (env === 'local' || env === 'ci') {
    var localBase = 'http://localhost:' + port;
    config.baseUrl = localBase + '/api/v1';
    config.healthUrl = localBase + '/api/health';
    config.testSupportUrl = localBase + '/api/test';
  } else if (env === 'qa' || env === 'dev' || env === 'prod') {
    config.baseUrl = java.lang.System.getenv('AURORA_BASE_URL');
    config.healthUrl = java.lang.System.getenv('AURORA_HEALTH_URL');
    config.testSupportUrl = java.lang.System.getenv('AURORA_TEST_SUPPORT_URL');
    config.apiKey = java.lang.System.getenv('API_KEY');

    if (!config.baseUrl || !config.healthUrl) {
      throw new Error('AURORA_BASE_URL and AURORA_HEALTH_URL are required for environment ' + env.toUpperCase());
    }
    if (env !== 'prod' && !config.testSupportUrl) {
      throw new Error('AURORA_TEST_SUPPORT_URL is required for environment ' + env.toUpperCase());
    }
    if (!/^https:\/\//i.test(config.baseUrl) || !/^https:\/\//i.test(config.healthUrl)) {
      throw new Error('Remote environment URLs must use HTTPS');
    }
    if (env !== 'prod' && !/^https:\/\//i.test(config.testSupportUrl)) {
      throw new Error('AURORA_TEST_SUPPORT_URL must use HTTPS');
    }

    config.baseUrl = config.baseUrl.replace(/\/+$/, '');
    config.healthUrl = config.healthUrl.replace(/\/+$/, '');
    if (config.testSupportUrl) {
      config.testSupportUrl = config.testSupportUrl.replace(/\/+$/, '');
    }
  } else {
    throw new Error('Unsupported karate.env "' + env + '". Use local, ci, qa, dev, or prod.');
  }

  karate.log('Karate environment:', env.toUpperCase());
  karate.log('API base URL:', config.baseUrl);
  karate.configure('connectTimeout', 10000);
  karate.configure('readTimeout', 15000);

  return config;
}
