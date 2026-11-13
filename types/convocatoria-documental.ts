export interface ConvocatoriaDocumental {
  filas: { unidad: string; convocados: number; asistentes: number; porcentajePublicado: string }[];
  fuente: string;
  diapositiva: number;
  sha256: string;
}
export interface ConvocatoriaDocumentalDataSource { obtener(): ConvocatoriaDocumental }
