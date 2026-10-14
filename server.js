const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors({ exposedHeaders: ['X-Ambiente'] }));
const appMode = process.env.APP_MODE || 'dev';
const ambiente = process.env.AURORA_ENV || 'DEV';
const espacios = new Map();

function obtenerEspacio(nombre) {
  if (!espacios.has(nombre)) {
    espacios.set(nombre, {
      cotizaciones: new Map(),
      reloj: { fechaHora: new Date().toISOString(), simulado: false }
    });
  }
  return espacios.get(nombre);
}

function fechaPeru(fechaHora) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(fechaHora));
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function sumarDias(fechaISO, dias) {
  const [year, month, day] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + dias)).toISOString().slice(0, 10);
}

function fechaISOValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

function fechaHoraValida(valor) {
  return typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(valor) &&
    fechaISOValida(valor.slice(0, 10)) &&
    !Number.isNaN(Date.parse(valor));
}

app.use(express.json());
app.get('/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

function respuestaValidacion(res, detalles) {
  return res.status(400).json({
    codigo: "VALIDACION",
    mensaje: "Hay datos inválidos en la solicitud.",
    detalles,
    traceId: crypto.randomBytes(4).toString('hex')
  });
}

app.use('/api', (req, res, next) => {
  res.setHeader('X-Ambiente', ambiente);
  const semillero = req.get('X-Semillero');
  if (semillero !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/.test(semillero)) {
    return respuestaValidacion(res, [{
      campo: "X-Semillero",
      mensaje: "Debe tener entre 2 y 30 caracteres alfanuméricos, guion o guion bajo."
    }]);
  }
  const nombreEspacio = semillero ? semillero.toLowerCase() : 'general';
  req.espacioCotizaciones = obtenerEspacio(nombreEspacio);
  return next();
});

app.use((error, req, res, next) => {
  if (
    req.path.startsWith('/api/') &&
    error instanceof SyntaxError &&
    error.status === 400 &&
    Object.prototype.hasOwnProperty.call(error, 'body')
  ) {
    return respuestaValidacion(res, [{ campo: "general", mensaje: "El cuerpo de la solicitud debe ser JSON válido." }]);
  }
  return next(error);
});

app.get('/api/health', (req, res) => {
  return res.status(200).json({ status: "ok" });
});

// 1. GET /api/v1/catalogos/plazos
app.get('/api/v1/catalogos/plazos', (req, res) => {
  return res.status(200).json([
    { valor: 5, descripcion: "5 años" },
    { valor: 10, descripcion: "10 años" },
    { valor: 15, descripcion: "15 años" },
    { valor: 20, descripcion: "20 años" }
  ]);
});

// 2. POST /api/v1/cotizaciones
app.post('/api/v1/cotizaciones', (req, res) => {
  const traceId = crypto.randomBytes(4).toString('hex');
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body
    : {};
  const { fechaNacimiento, fumador, sumaAsegurada, plazo } = body;
  const detalles = [];
  const camposPermitidos = ['fechaNacimiento', 'fumador', 'sumaAsegurada', 'plazo'];

  if (Object.keys(body).some((campo) => !camposPermitidos.includes(campo))) {
    detalles.push({ campo: "general", mensaje: "La solicitud contiene campos no permitidos." });
  }
  if (!fechaISOValida(fechaNacimiento)) {
    detalles.push({ campo: "fechaNacimiento", mensaje: "Debe tener el formato AAAA-MM-DD." });
  }
  if (typeof fumador !== 'boolean') {
    detalles.push({ campo: "fumador", mensaje: "Debe ser un valor booleano." });
  }
  if (!Number.isInteger(sumaAsegurada) || sumaAsegurada < 50000 || sumaAsegurada > 500000 || sumaAsegurada % 10000 !== 0) {
    detalles.push({
      campo: "sumaAsegurada",
      mensaje: "Debe ser un número entre 50,000 y 500,000 en múltiplos de 10,000."
    });
  }
  if (!Number.isInteger(plazo) || ![5, 10, 15, 20].includes(plazo)) {
    detalles.push({ campo: "plazo", mensaje: "Debe ser uno de los plazos permitidos: 5, 10, 15 o 20." });
  }
  if (detalles.length > 0) {
    return respuestaValidacion(res, detalles);
  }

  const fechaCotizacion = fechaPeru(req.espacioCotizaciones.reloj.fechaHora);
  const [birthYear, birthMonth, birthDay] = fechaNacimiento.split('-').map(Number);
  const [quoteYear, quoteMonth, quoteDay] = fechaCotizacion.split('-').map(Number);
  let edad = quoteYear - birthYear;
  if (quoteMonth < birthMonth || (quoteMonth === birthMonth && quoteDay < birthDay)) {
    edad--;
  }

  // Validación de edad 18 a 65 (422)
  if (edad < 18 || edad > 65) {
    return res.status(422).json({
      codigo: "EDAD_FUERA_RANGO",
      mensaje: "La edad de contratación debe estar entre 18 y 65 años.",
      detalles: [],
      traceId
    });
  }

  // Cálculo actuarial de primas
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

  const fechaVencimiento = sumarDias(fechaCotizacion, 30);
  const id = crypto.randomUUID();
  const cotizacion = {
    id,
    fechaCotizacion,
    fechaVencimiento,
    vigente: fechaCotizacion <= fechaVencimiento,
    fechaNacimiento,
    edadActuarial: edad,
    fumador,
    sumaAsegurada,
    plazo,
    primaNetaAnual,
    primaTotalAnual,
    primaMensual
  };

  req.espacioCotizaciones.cotizaciones.set(id, cotizacion);
  return res.status(201).json(cotizacion);
});

// 3. GET /api/v1/cotizaciones/:id
app.get('/api/v1/cotizaciones/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return respuestaValidacion(res, [{ campo: "id", mensaje: "Debe ser un UUID válido." }]);
  }
  const cotizacion = req.espacioCotizaciones.cotizaciones.get(id);

  if (!cotizacion) {
    return res.status(404).json({
      codigo: "COTIZACION_NO_ENCONTRADA",
      mensaje: "La cotización no existe.",
      detalles: [],
      traceId: crypto.randomBytes(4).toString('hex')
    });
  }

  const fechaActual = fechaPeru(req.espacioCotizaciones.reloj.fechaHora);
  return res.status(200).json({
    ...cotizacion,
    vigente: fechaActual <= cotizacion.fechaVencimiento
  });
});

// Soporte de pruebas
app.use('/api/test', (req, res, next) => {
  if (appMode !== 'test') {
    return res.sendStatus(404);
  }
  return next();
});

app.post('/api/test/reset', (req, res) => {
  req.espacioCotizaciones.cotizaciones.clear();
  req.espacioCotizaciones.reloj = { fechaHora: new Date().toISOString(), simulado: false };
  return res.status(204).send();
});

app.get('/api/test/reloj', (req, res) => {
  return res.status(200).json(req.espacioCotizaciones.reloj);
});

app.put('/api/test/reloj', (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { fechaHora } = body;
  if (Object.keys(body).some((campo) => campo !== 'fechaHora') || !fechaHoraValida(fechaHora)) {
    return respuestaValidacion(res, [{ campo: "fechaHora", mensaje: "Debe ser una fecha y hora válidas." }]);
  }
  req.espacioCotizaciones.reloj = { fechaHora, simulado: true };
  return res.status(200).json(req.espacioCotizaciones.reloj);
});

app.delete('/api/test/reloj', (req, res) => {
  req.espacioCotizaciones.reloj = { fechaHora: new Date().toISOString(), simulado: false };
  return res.status(204).send();
});

function startServer() {
  const port = Number(process.env.PORT) || 4000;
  return app.listen(port, () => {
    console.log(`Aurora Vida disponible en http://localhost:${port}`);
    console.log(`API disponible en http://localhost:${port}/api/v1`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };