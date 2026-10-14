const form = document.querySelector('#cotizador-form');
const emptyMessage = document.querySelector('#cotizador-vacio-msg');
const quoteResult = document.querySelector('#cotizador-resultado');
const alertBox = document.querySelector('#cotizador-error-msg');
const birthDateInput = document.querySelector('#cotizador-fecha-nacimiento-input');
const smokerInputs = [...form.querySelectorAll('input[name="fumador"]')];
const insuredAmountInput = document.querySelector('#cotizador-suma-asegurada-select');
const termInput = document.querySelector('#cotizador-plazo-select');
const submitButton = document.querySelector('#cotizador-calcular-btn');
const errorMessages = {
  fechaNacimiento: document.querySelector('#cotizador-fecha-nacimiento-error-msg'),
  fumador: document.querySelector('#cotizador-fumador-error-msg'),
  sumaAsegurada: document.querySelector('#cotizador-suma-asegurada-error-msg'),
  plazo: document.querySelector('#cotizador-plazo-error-msg'),
};

function formatMoney(amount) {
  return `S/ ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function parseBirthDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === isoDate
    ? isoDate
    : null;
}

function selectedSmoker() {
  return smokerInputs.find((input) => input.checked);
}

function clearErrors() {
  for (const [field, message] of Object.entries(errorMessages)) {
    message.hidden = true;
    const controls = field === 'fumador'
      ? smokerInputs
      : [form.elements.namedItem(field)];
    for (const control of controls) {
      control.removeAttribute('aria-invalid');
    }
  }
  alertBox.hidden = true;
  alertBox.textContent = '';
}

function showFieldError(field) {
  errorMessages[field].hidden = false;
  const controls = field === 'fumador'
    ? smokerInputs
    : [form.elements.namedItem(field)];
  for (const control of controls) {
    control.setAttribute('aria-invalid', 'true');
  }
}

async function cargarPlazos() {
  try {
    const response = await fetch('/api/v1/catalogos/plazos');
    if (!response.ok) {
      throw new Error(`El catálogo respondió ${response.status}.`);
    }

    const plazos = await response.json();
    if (
      !Array.isArray(plazos) ||
      plazos.length === 0 ||
      plazos.some((plazo) => !Number.isInteger(plazo.valor) || typeof plazo.descripcion !== 'string')
    ) {
      throw new Error('El catálogo de plazos tiene un formato inesperado.');
    }

    termInput.replaceChildren(new Option('Elige un plazo', ''));
    for (const plazo of plazos) {
      termInput.add(new Option(plazo.descripcion, String(plazo.valor)));
    }
    submitButton.disabled = false;
  } catch (error) {
    alertBox.textContent = 'No pudimos cargar los plazos disponibles. Inténtalo de nuevo más tarde.';
    alertBox.hidden = false;
    console.error('No se pudo cargar el catálogo de plazos:', error);
  }
}

birthDateInput.addEventListener('input', () => {
  if (parseBirthDate(birthDateInput.value)) {
    errorMessages.fechaNacimiento.hidden = true;
    birthDateInput.removeAttribute('aria-invalid');
  }
});

for (const input of smokerInputs) {
  input.addEventListener('change', () => {
    errorMessages.fumador.hidden = Boolean(selectedSmoker());
    for (const radio of smokerInputs) {
      radio.removeAttribute('aria-invalid');
    }
  });
}

insuredAmountInput.addEventListener('change', () => {
  errorMessages.sumaAsegurada.hidden = insuredAmountInput.value.length > 0;
  insuredAmountInput.removeAttribute('aria-invalid');
});

termInput.addEventListener('change', () => {
  errorMessages.plazo.hidden = termInput.value.length > 0;
  termInput.removeAttribute('aria-invalid');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  alertBox.hidden = true;
  quoteResult.hidden = true;
  emptyMessage.hidden = false;

  const birthDate = parseBirthDate(birthDateInput.value);
  const smoker = selectedSmoker();
  const invalidFields = [];
  if (!birthDate) {
    showFieldError('fechaNacimiento');
    invalidFields.push(birthDateInput);
  }
  if (!smoker) {
    showFieldError('fumador');
    invalidFields.push(smokerInputs[0]);
  }
  if (!insuredAmountInput.value) {
    showFieldError('sumaAsegurada');
    invalidFields.push(insuredAmountInput);
  }
  if (!termInput.value) {
    showFieldError('plazo');
    invalidFields.push(termInput);
  }
  if (invalidFields.length > 0) {
    invalidFields[0].focus();
    return;
  }

  const requestBody = {
    fechaNacimiento: birthDate,
    fumador: smoker.value === 'si',
    sumaAsegurada: Number(insuredAmountInput.value),
    plazo: Number(termInput.value),
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Calculando…';
  try {
    const response = await fetch('/api/v1/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const quotation = await response.json();

    if (!response.ok) {
      alertBox.textContent = quotation.mensaje || 'No fue posible calcular la cotización.';
      alertBox.hidden = false;
      return;
    }

    document.querySelector('#cotizador-prima-mensual-text').textContent = formatMoney(quotation.primaMensual);
    document.querySelector('#cotizador-prima-anual-text').textContent = formatMoney(quotation.primaTotalAnual);
    document.querySelector('#cotizador-resumen-edad-text').textContent = `${quotation.edadActuarial} años`;
    document.querySelector('#cotizador-resumen-fumador-text').textContent = quotation.fumador ? 'Sí' : 'No';
    document.querySelector('#cotizador-resumen-suma-asegurada-text').textContent = formatMoney(quotation.sumaAsegurada)
      .replace(/\.00$/, '');
    document.querySelector('#cotizador-resumen-plazo-text').textContent = `${quotation.plazo} años`;
    document.querySelector('#cotizador-numero-text').textContent = quotation.id;
    document.querySelector('#cotizador-fecha-cotizacion-text').textContent = formatDate(quotation.fechaCotizacion);
    document.querySelector('#cotizador-fecha-vencimiento-text').textContent = formatDate(quotation.fechaVencimiento);
    emptyMessage.hidden = true;
    quoteResult.hidden = false;
  } catch (error) {
    alertBox.textContent = 'No pudimos conectar con el servicio. Inténtalo de nuevo.';
    alertBox.hidden = false;
    console.error('No se pudo solicitar la cotización:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Calcular prima';
  }
});

document.querySelector('#cotizador-contratar-btn').addEventListener('click', () => {
  const quoteId = document.querySelector('#cotizador-numero-text').textContent;
  window.location.assign(`/login?cotizacion=${encodeURIComponent(quoteId)}`);
});

cargarPlazos();
