export interface CotizacionRequest {
  fechaNacimiento: string;
  fumador: boolean;
  sumaAsegurada: number;
  plazo: number;
}

export function buildValidCotizacion(): CotizacionRequest {
  return {
    fechaNacimiento: '1996-02-13',
    fumador: false,
    sumaAsegurada: 100_000,
    plazo: 10,
  };
}

export function buildCotizacionWithInvalidSum(): CotizacionRequest {
  return {
    ...buildValidCotizacion(),
    sumaAsegurada: 40_000,
  };
}
