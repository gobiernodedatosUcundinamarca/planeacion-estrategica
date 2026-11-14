export interface ConvocatoriaDocumental {
  filas: { unidad: string; convocados: number; asistentes: number; porcentajePublicado: string; roles: { rol: string; convocados: number }[] }[];
  fuente: string;
  diapositiva: number;
  sha256: string;
}
export interface ConvocatoriaDocumentalDataSource { obtener(): ConvocatoriaDocumental | Promise<ConvocatoriaDocumental> }
