const form = document.getElementById('quote-form');
const submitButton = document.getElementById('quote-submit');
const errorPanel = document.getElementById('quote-error');
const resultPanel = document.getElementById('quote-result');

function formatMoney(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorPanel.hidden = true;
  resultPanel.hidden = true;
  submitButton.disabled = true;

  const formData = new FormData(form);
  const requestBody = {
    fechaNacimiento: formData.get('fechaNacimiento'),
    fumador: formData.get('fumador') === 'on',
    sumaAsegurada: Number(formData.get('sumaAsegurada')),
    plazo: Number(formData.get('plazo')),
  };

  try {
    const response = await fetch('/api/v1/cotizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const quote = await response.json();

    if (!response.ok) {
      const detail = quote.detalles?.[0]?.mensaje || quote.mensaje || 'No se pudo generar la cotización.';
      errorPanel.textContent = detail;
      errorPanel.hidden = false;
      return;
    }

    document.getElementById('monthly-premium').textContent = formatMoney(quote.primaMensual);
    document.getElementById('result-amount').textContent = formatMoney(quote.sumaAsegurada);
    document.getElementById('result-term').textContent = `${quote.plazo} años`;
    resultPanel.hidden = false;
  } catch {
    errorPanel.textContent = 'No pudimos conectar con el servicio. Inténtalo nuevamente.';
    errorPanel.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});
