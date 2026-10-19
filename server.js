const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());

// ENCABEZADO OFICIAL REQUERIDO: X-Ambiente: LOCAL
app.use((req, res, next) => {
  res.setHeader('X-Ambiente', 'LOCAL');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let relojSimulado = {
  fechaHora: "2026-10-13T10:00:00-05:00",
  simulado: true
};

const cotizacionesDB = {};
const camposCotizacion = ['fechaNacimiento', 'fumador', 'sumaAsegurada', 'plazo'];

function enviarErrorValidacion(res, detalles) {
  return res.status(400).json({
    codigo: 'VALIDACION',
    mensaje: 'Hay datos inválidos en la solicitud.',
    detalles,
    traceId: crypto.randomBytes(4).toString('hex')
  });
}

function fechaIsoValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function calcularEdad(fechaNacimiento, fechaReferencia) {
  const [birthYear, birthMonth, birthDay] = fechaNacimiento.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = fechaReferencia.split('-').map(Number);
  let birthdayMonth = birthMonth;
  let birthdayDay = birthDay;

  if (birthMonth === 2 && birthDay === 29
      && !fechaIsoValida(`${currentYear}-02-29`)) {
    birthdayMonth = 3;
    birthdayDay = 1;
  }

  let age = currentYear - birthYear;
  if (currentMonth < birthdayMonth
      || (currentMonth === birthdayMonth && currentDay < birthdayDay)) {
    age--;
  }
  return age;
}

function fechaTrasDias(fecha, dias) {
  const result = new Date(`${fecha}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + dias);
  return result.toISOString().slice(0, 10);
}

// 1. Health check
app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'UP' });
});

// 2. Cat�logo de plazos
app.get('/api/v1/catalogos/plazos', (req, res) => {
  return res.status(200).json([
    { valor: 5, descripcion: "5 a\u00f1os" },
    { valor: 10, descripcion: "10 a\u00f1os" },
    { valor: 15, descripcion: "15 a\u00f1os" },
    { valor: 20, descripcion: "20 a\u00f1os" }
  ]);
});

// 3. Crear cotizaci�n (POST)
app.post('/api/v1/cotizaciones', (req, res) => {
  const solicitud = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};
  const { fechaNacimiento, fumador, sumaAsegurada, plazo } = solicitud;
  const traceId = crypto.randomBytes(4).toString('hex');

  if (Object.keys(solicitud).some((field) => !camposCotizacion.includes(field))) {
    return enviarErrorValidacion(res, [{
      campo: 'general',
      mensaje: 'La solicitud contiene campos no permitidos.'
    }]);
  }

  const missingFields = camposCotizacion
    .filter((field) => !Object.hasOwn(solicitud, field))
    .map((field) => ({ campo: field, mensaje: 'Este campo es obligatorio.' }));
  if (missingFields.length > 0) {
    return enviarErrorValidacion(res, missingFields);
  }

  if (!fechaIsoValida(fechaNacimiento)) {
    return enviarErrorValidacion(res, [{
      campo: 'fechaNacimiento',
      mensaje: 'Debe ser una fecha válida en formato AAAA-MM-DD.'
    }]);
  }

  if (typeof fumador !== 'boolean') {
    return enviarErrorValidacion(res, [{
      campo: 'fumador',
      mensaje: 'Debe ser un valor booleano.'
    }]);
  }

  if (typeof sumaAsegurada !== 'number' || !Number.isFinite(sumaAsegurada)) {
    return enviarErrorValidacion(res, [{
      campo: 'sumaAsegurada',
      mensaje: 'Debe ser un valor numérico.'
    }]);
  }

  if (typeof plazo !== 'number' || ![5, 10, 15, 20].includes(plazo)) {
    return enviarErrorValidacion(res, [{
      campo: 'plazo',
      mensaje: 'Plazo no permitido.'
    }]);
  }

  if (sumaAsegurada < 50000 || sumaAsegurada > 500000 || sumaAsegurada % 10000 !== 0) {
    return enviarErrorValidacion(res, [{
      campo: 'sumaAsegurada',
      mensaje: 'Debe estar entre 50,000 y 500,000 en múltiplos de 10,000.'
    }]);
  }

  const hoy = relojSimulado.fechaHora.split('T')[0];
  const edad = calcularEdad(fechaNacimiento, hoy);

  if (edad < 18 || edad > 65) {
    return res.status(422).json({
      codigo: "EDAD_FUERA_RANGO",
      mensaje: "La edad de contratación debe estar entre 18 y 65 años.",
      detalles: [],
      traceId
    });
  }

  let tasa = 1.20;
  if (edad >= 31 && edad <= 40) tasa = 1.80;
  else if (edad >= 41 && edad <= 50) tasa = 3.10;
  else if (edad >= 51 && edad <= 60) tasa = 5.40;
  else if (edad >= 61 && edad <= 65) tasa = 8.90;

  const factorFumador = fumador ? 1.50 : 1.00;
  const factoresPlazo = { 5: 1.00, 10: 1.05, 15: 1.10, 20: 1.15 };
  const factorPlazo = factoresPlazo[plazo];

  const millares = sumaAsegurada / 1000;
  const primaNetaAnual = +(millares * tasa * factorFumador * factorPlazo).toFixed(2);
  const primaTotalAnual = +(primaNetaAnual * 1.03).toFixed(2);
  let primaMensualCalc = (primaTotalAnual * 1.08) / 12;
  const primaMensual = +(Math.max(20.00, primaMensualCalc)).toFixed(2);

  const id = crypto.randomUUID();
  const cotizacion = {
    id,
    fechaCotizacion: hoy,
    fechaVencimiento: fechaTrasDias(hoy, 30),
    vigente: true,
    fechaNacimiento,
    edadActuarial: edad,
    fumador,
    sumaAsegurada,
    plazo,
    primaNetaAnual,
    primaTotalAnual,
    primaMensual
  };

  cotizacionesDB[id] = cotizacion;
  return res.status(201).json(cotizacion);
});

// 4. Consultar cotizaci�n (GET)
app.get('/api/v1/cotizaciones/:id', (req, res) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-fA-F-]{36}$/;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      codigo: "VALIDACION",
      mensaje: "Hay datos inv�lidos en la solicitud.",
      detalles: [{ campo: "id", mensaje: "Debe ser un UUID v�lido." }],
      traceId: crypto.randomBytes(4).toString('hex')
    });
  }

  const cotizacion = cotizacionesDB[id];
  if (!cotizacion) {
    return res.status(404).json({
      codigo: "COTIZACION_NO_ENCONTRADA",
      mensaje: "La cotizaci�n no existe.",
      detalles: [],
      traceId: crypto.randomBytes(4).toString('hex')
    });
  }

  const fechaActual = relojSimulado.fechaHora.split('T')[0];
  return res.status(200).json({
    ...cotizacion,
    vigente: fechaActual <= cotizacion.fechaVencimiento
  });
});

// 5. Soporte de pruebas
app.post('/api/test/reset', (req, res) => {
  Object.keys(cotizacionesDB).forEach(k => delete cotizacionesDB[k]);
  return res.status(204).send();
});

app.get('/api/test/reloj', (req, res) => {
  return res.status(200).json(relojSimulado);
});

app.put('/api/test/reloj', (req, res) => {
  const { fechaHora } = req.body;
  if (!fechaHora) return res.status(400).json({ codigo: "VALIDACION", mensaje: "Falta fechaHora" });
  relojSimulado = { fechaHora, simulado: true };
  return res.status(200).json(relojSimulado);
});

app.delete('/api/test/reloj', (req, res) => {
  relojSimulado = { fechaHora: new Date().toISOString(), simulado: false };
  return res.status(204).send();
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
    return enviarErrorValidacion(res, [{
      campo: 'general',
      mensaje: 'El cuerpo debe contener JSON válido.'
    }]);
  }

  console.error('Error procesando la solicitud:', error);
  return res.status(500).json({
    codigo: 'ERROR_INTERNO',
    mensaje: 'Ocurrió un error interno.',
    detalles: [],
    traceId: crypto.randomBytes(4).toString('hex')
  });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`?? Aurora Vida Mock corriendo en http://localhost:${PORT}/api/v1`);
});
