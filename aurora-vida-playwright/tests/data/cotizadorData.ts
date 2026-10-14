export const cotizadorData = {
  fechaCotizacion: '2026-10-13',
  clienteTreintaAnios: {
    fechaNacimiento: '1996-02-13',
    fumador: false,
    sumaAsegurada: '100000',
    plazo: '10',
    esperado: {
      primaMensual: '20.00',
      primaTotalAnual: '129.78',
    },
  },
  clienteCuarentaYCincoAnios: {
    fechaNacimiento: '1981-03-02',
    fumador: true,
    sumaAsegurada: '300000',
    plazo: '20',
    esperado: {
      primaMensual: '148.71',
      primaTotalAnual: '1,652.38',
    },
  },
  clienteMenorDeEdad: {
    fechaNacimiento: '2008-10-14',
    fumador: false,
    sumaAsegurada: '100000',
    plazo: '10',
    mensajeErrorEsperado:
      'La edad de contratación debe estar entre 18 y 65 años.',
  },
};