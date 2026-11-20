export type EstamentoMuestreo = "estudiantes" | "docentes" | "administrativos" | "graduados";

/** Parámetros de la hoja «Metodología»; todo el libro se recalcula con ellos. */
export interface ParametrosMuestreo {
  /** 0,95 */
  confianza: number;
  /** Valor crítico de la normal asociado a la confianza (1,96). */
  z: number;
  /** Proporción esperada (0,5). */
  proporcion: number;
  /** Margen de error de planificación (0,05). */
  margenError: number;
  /** Los estratos con N menor o igual a este valor se convocan completos. */
  umbralCenso: number;
}

/**
 * Un cálculo de muestra tal como aparece en la hoja de cada estamento. En
 * administrativos hay dos por unidad (planta y OPS-APA), que luego se suman.
 */
export interface CalculoMuestra {
  estamento: EstamentoMuestreo;
  unidad: string;
  /** Solo administrativos: «Administrativo» u «OPS-APA». */
  vinculacion: string | null;
  poblacion: number;
  censo: boolean;
  muestraCalculada: number;
  topeLogistico: number | null;
  convocados: number;
  observacion: string | null;
}

/** Unidad regional × estamento, con las cuatro cifras y la precisión. */
export interface EstratoMuestreo {
  estamento: EstamentoMuestreo;
  unidad: string;
  poblacion: number;
  muestraCalculada: number;
  topeLogistico: number | null;
  convocados: number;
  asistentes: number;
  /** Registros del Excel que se descontaron por no pertenecer a la unidad (0 si ninguno). */
  asistentesDescontados: number;
  /** Asistentes limitados a N, como los usa el Excel para el margen real. */
  asistentesEnCalculo: number;
  censo: boolean;
  margenDiseno: number;
  margenReal: number;
  /** Texto de la columna «Lectura» de la hoja «Participación». */
  lectura: string;
  observacion: string | null;
}

export interface TotalEstamento {
  estamento: EstamentoMuestreo;
  etiqueta: string;
  poblacion: number;
  muestraCalculada: number;
  convocados: number;
  asistentes: number;
  margenDiseno: number;
  margenReal: number;
  lectura: string;
}

export interface UnidadRegionalMuestreo {
  nombre: string;
  /** Sede, Seccional o Extensión. */
  tipo: string;
}

export interface DepuracionGraduados {
  registros: number;
  repetidos: number;
  personas: number;
  enUnidades: number;
}

export interface NotaMetodologica {
  parametros: ParametrosMuestreo;
  unidades: UnidadRegionalMuestreo[];
  totales: TotalEstamento[];
  estratos: EstratoMuestreo[];
  calculos: CalculoMuestra[];
  /** «Fuente: …» de la sección 3 de «Metodología». */
  fuentePoblacion: string;
  /** Viñetas de la sección 3: graduados, administrativos y excluidos. */
  notasPoblacion: string[];
  /** Null si el texto del Excel cambia y ya no se pueden leer las cifras. */
  depuracionGraduados: DepuracionGraduados | null;
  asistencia: {
    /** Descripción del archivo de asistencia, tal como la trae el Excel. */
    fuente: string;
    registros: number | null;
    corte: string | null;
  };
  /** Viñetas de la sección 9: alcance y recomendaciones. */
  alcance: string[];
}
