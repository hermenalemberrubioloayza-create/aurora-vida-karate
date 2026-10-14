const quoteIdText = document.querySelector('#ingresar-cotizacion-text');
const errorMessage = document.querySelector('#ingresar-error-msg');
const quoteId = new URLSearchParams(window.location.search).get('cotizacion');

if (quoteId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quoteId)) {
  quoteIdText.textContent = quoteId;
} else {
  quoteIdText.textContent = 'No disponible';
  errorMessage.textContent = 'No encontramos una cotización válida para continuar.';
  errorMessage.hidden = false;
}
