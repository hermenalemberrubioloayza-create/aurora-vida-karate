const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Reloj simulado para pruebas
let relojSimulado = {
  fechaHora: "2026-10-13T10:00:00-05:00",
  simulado: true
};

const cotizacionesDB = {};

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
  const { fechaNacimiento, fumador, sumaAsegurada, plazo } = req.body;
  const traceId = crypto.randomBytes(4).toString('hex');

  // Campos obligatorios (400)
  if (!fechaNacimiento || fumador === undefined || !sumaAsegurada || !plazo) {
    return res.status(400).json({
      codigo: "VALIDACION",
      mensaje: "Hay datos inválidos en la solicitud.",
      detalles: [{ campo: "general", mensaje: "Todos los campos son obligatorios." }],
      traceId
    });
  }

  // Validación de suma asegurada (400)
  if (sumaAsegurada < 50000 || sumaAsegurada > 500000 || sumaAsegurada % 10000 !== 0) {
    return res.status(400).json({
      codigo: "VALIDACION",
      mensaje: "Hay datos inválidos en la solicitud.",
      detalles: [{
        campo: "sumaAsegurada",
        mensaje: "Debe estar entre 50,000 y 500,000 en múltiplos de 10,000."
      }],
      traceId
    });
  }

  // Validación de plazo (400)
  if (![5, 10, 15, 20].includes(plazo)) {
    return res.status(400).json({
      codigo: "VALIDACION",
      mensaje: "Hay datos inválidos en la solicitud.",
      detalles: [{ campo: "plazo", mensaje: "Plazo no permitido." }],
      traceId
    });
  }

  // Cálculo de edad
  const hoy = new Date(relojSimulado.fechaHora.split('T')[0]);
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
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

  const id = crypto.randomUUID();
  const cotizacion = {
    id,
    fechaCotizacion: relojSimulado.fechaHora.split('T')[0],
    fechaVencimiento: "2026-11-12",
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

// 3. GET /api/v1/cotizaciones/:id
app.get('/api/v1/cotizaciones/:id', (req, res) => {
  const { id } = req.params;
  const cotizacion = cotizacionesDB[id];

  if (!cotizacion) {
    return res.status(404).json({
      codigo: "COTIZACION_NO_ENCONTRADA",
      mensaje: "La cotización no existe.",
      detalles: [],
      traceId: crypto.randomBytes(4).toString('hex')
    });
  }

  return res.status(200).json(cotizacion);
});

// Soporte de pruebas
app.post('/api/test/reset', (req, res) => {
  Object.keys(cotizacionesDB).forEach(k => delete cotizacionesDB[k]);
  return res.status(204).send();
});

app.get('/api/test/reloj', (req, res) => {
  return res.status(200).json(relojSimulado);
});

app.put('/api/test/reloj', (req, res) => {
  const { fechaHora } = req.body;
  relojSimulado = { fechaHora, simulado: true };
  return res.status(200).json(relojSimulado);
});

app.delete('/api/test/reloj', (req, res) => {
  relojSimulado = { fechaHora: new Date().toISOString(), simulado: false };
  return res.status(204).send();
});

// Iniciar servidor en el puerto 4000
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Aurora Vida API corriendo en http://localhost:${PORT}/api/v1`);
  console.log(`⏱️ Endpoints de soporte en http://localhost:${PORT}/api/test`);
});