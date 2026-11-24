/**
 * Resultados del Momento 5 del CAI de Planeación Estratégica (17 y 18 de
 * noviembre de 2026): cinco formularios de Microsoft Forms ya depurados y
 * codificados por el proyecto de análisis (`resultados.json`).
 *
 * Tres formularios son individuales (una respuesta por persona: validación,
 * percepción sobre transformación digital y consolidación del MEDIT) y dos son
 * grupales (un registro por equipo: acuerdos y matriz del MEDIT). Por eso
 * conviven estructuras distintas para la misma jornada.
 */

/** Código de una transformación del plan (`INT`, `TRL`, `EMP`, `VID`). Lo fija el JSON, no el código. */
export type TransformacionId = string;

/** Un objetivo (OE), ámbito (Á1…) o resultado (R1…) de una transformación. */
export interface ComponentePlan {
  code: string;
  tipo: string;
  titulo: string;
  texto: string | null;
  /** true si Microsoft Forms recortó el encabezado a 200 caracteres. */
  truncado: boolean;
}

export interface TransformacionPlan {
  id: TransformacionId;
  nombre: string;
  numero_plan: number | null;
  componentes: ComponentePlan[];
}

export interface FormulariosDeParticipante {
  validacion: boolean;
  percepcion: boolean;
  consolidacion: boolean;
  acuerdos_registro: boolean;
  matriz_registro: boolean;
}

/** Tabla maestra: una persona, unida entre formularios por su correo (que no se publica). */
export interface ParticipanteMomento5 {
  pid: string;
  nombre: string;
  cargo: string | null;
  rol: string;
  equipo: number | null;
  sede: string | null;
  sedeTipo: string | null;
  formularios: FormulariosDeParticipante;
}

/** Valoración individual de un componente: se valida (V) o requiere ajuste (A). */
export interface ValoracionComponente {
  pid: string;
  equipo: number | null;
  t: TransformacionId;
  c: string;
  e: "V" | "A";
  aj?: string;
  ju?: string;
}

/** Un ajuste acordado por un equipo (registro grupal). */
export interface AjusteEquipo {
  n: number;
  t: TransformacionId;
  c: string;
  tipo: string;
  ajuste: string;
  justificacion: string | null;
  nota: string | null;
}

export interface AcuerdoEquipo {
  equipo: number;
  relator: string | null;
  integrantes: string | null;
  transformaciones: TransformacionId[];
  validaDemas: string | null;
  desacuerdos: string | null;
  ajustes: AjusteEquipo[];
}

/** Proceso propuesto para transformación digital (formulario individual). */
export interface PercepcionDigital {
  pid: string;
  equipo: number | null;
  nombre: string;
  dependencia: string | null;
  proceso: string | null;
  consiste: string | null;
  dificultad: string | null;
  afectacion: string | null;
  cat: string;
  difs: string[];
  ia: boolean;
  auto: boolean;
}

/** Aporte individual para consolidar el MEDIT. */
export interface ConsolidacionMedit {
  pid: string;
  equipo: number | null;
  nombre: string;
  rol: string | null;
  facultad: string | null;
  sede: string | null;
  sedeTipo: string | null;
  aspecto: string | null;
  cambio: string | null;
  temas: string[];
}

/** Matriz de construcción colaborativa del MEDIT (registro grupal). */
export interface MatrizEquipo {
  equipo: number;
  integrantes: string | null;
  aspectos: string[];
  cambios: string[];
  indicadores: string[];
  temas: string[];
}

export type TipoFormulario = "Individual" | "Grupal";

export interface FormularioMomento5 {
  id: string;
  nombre: string;
  tipo: TipoFormulario;
  fecha: string;
  respuestas_originales: number;
  respuestas_validas: number;
}

export interface ExclusionMomento5 {
  formulario: string;
  id_respuesta: number | null;
  motivo: string;
}

/** Valor de una celda de la exportación de Forms, sin interpretar. */
export type CeldaEnviada = string | number | null;

/**
 * Un formulario del Momento 5 tal como lo exportó Microsoft Forms
 * (`data/forms_momento_5`): sus columnas y un envío por fila, sin depurar.
 */
export interface FormularioEnviadoMomento5 {
  /** Nombre del archivo de la exportación, sin la extensión. */
  archivo: string;
  /**
   * Encabezados de la tabla. Si la exportación agrupa columnas bajo una fila
   * de sección (Validación: «3. Transformación: …»), la sección va delante.
   */
  encabezados: string[];
  filas: CeldaEnviada[][];
  /** Columna «ID» con que el análisis identifica cada envío; -1 si no la hay. */
  columnaId: number;
  /** Columnas «Hora de …»: fecha y hora como número de serie de Excel. */
  columnasFechaHora: number[];
}

export interface EquipoMomento5 {
  equipo: number;
  transformaciones: TransformacionId[];
  integrantes: string[];
}

export interface CatalogoMomento5 {
  id: string;
  nombre: string;
}

/** Una respuesta abierta ya asignada a su tema (o sin tema si no tenía contenido que agrupar). */
export interface RespuestaAbiertaMomento5 {
  id: number;
  texto: string;
  /** Quién y dónde: nombre o equipo y, si aplica, el componente del plan. */
  detalle: string;
  equipo: number | null;
  tema: number | null;
}

/**
 * Una pregunta abierta que su formulario no clasifica, agrupada por temas con
 * la clasificación automática del portal (TF-IDF + K-Means).
 */
export interface PreguntaAbiertaMomento5 {
  id: string;
  /** Id del formulario en `meta.formularios` («validacion», «acuerdos»…). */
  formulario: string;
  pregunta: string;
  /** Palabras del enunciado que no dan nombre a un tema ni van en la nube. */
  palabrasSinTema: string[];
  temas: { cluster: number; nombre: string; terminos: string[]; total: number }[];
  respuestas: RespuestaAbiertaMomento5[];
}

export interface VistaMomento5 {
  datos: ResultadosMomento5;
  abiertas: PreguntaAbiertaMomento5[];
}

export interface ResultadosMomento5 {
  meta: {
    titulo: string;
    institucion: string;
    fechas: string[];
    generado: string;
    formularios: FormularioMomento5[];
    exclusiones: ExclusionMomento5[];
  };
  transformaciones: TransformacionPlan[];
  equipos: EquipoMomento5[];
  participantes: ParticipanteMomento5[];
  validacion: ValoracionComponente[];
  acuerdos: AcuerdoEquipo[];
  percepcion: PercepcionDigital[];
  consolidacion: ConsolidacionMedit[];
  matriz: MatrizEquipo[];
  catalogos: {
    categoriasProceso: CatalogoMomento5[];
    dificultades: CatalogoMomento5[];
    temasMedit: CatalogoMomento5[];
    sedes: { nombre: string; tipo: string }[];
  };
}
