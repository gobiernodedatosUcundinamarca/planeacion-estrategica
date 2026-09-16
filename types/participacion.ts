/**
 * Cada cargue es una tanda de asistencia (un evento en territorio) que se
 * SUMA a las anteriores — a diferencia del Momento 4, aquí no hay una casilla
 * fija por transformación: el objetivo es el seguimiento en el tiempo, así
 * que cada archivo nuevo agrega una tanda más en vez de reemplazar la
 * anterior.
 */
export interface DocumentoParticipacion {
  id: number;
  archivo: string;
  filas: number;
  cargadoEn: string;
}

/**
 * Una persona registrada en una tanda de asistencia. Solo los campos que se
 * publican — el resto de columnas que traiga el Excel se descarta al leerlo
 * (ver `lib/reglas/participacion.ts`) porque no son relevantes para el
 * seguimiento y sí pueden ser datos personales que no hace falta conservar.
 */
export interface RegistroParticipacion {
  id: number;
  documentoId: number;
  /** Fecha del evento de asistencia, en ISO (solo fecha, sin hora). */
  fechaInicio: string | null;
  /**
   * Ciudad donde se desarrolló el evento (Ubaté, Zipaquirá, Girardot,
   * Soacha…). Distinta de la unidad regional, que es la sede de origen del
   * asistente. Se asigna al cargar la tanda; `null` si no se registró.
   *
   * La cédula que trae el Excel se guarda en la base pero NO se incluye aquí a
   * propósito: este tipo es el que llega al cliente, y el dato no debe salir
   * del servidor. Ver `consultarRegistros`.
   */
  lugarDesarrollo: string | null;
  nombreAsistente: string | null;
  edad: number | null;
  rol: string | null;
  codigoEstudiante: string | null;
  programaEstudiante: string | null;
  unidadEstudiante: string | null;
  coordinacionDocente: string | null;
  unidadDocente: string | null;
  facultadDocente: string | null;
  areaTrabajador: string | null;
  unidadTrabajador: string | null;
}

/**
 * Qué hacer con lo que ya está cargado al subir un archivo nuevo. Lo elige
 * quien sube y no el código, porque las dos operaciones son legítimas y solo
 * esa persona sabe cuál necesita: "anexar" agrega el evento a los que ya hay,
 * y "reemplazar" deja el archivo nuevo como único contenido —lo que se usa
 * para corregir un cargue equivocado sin duplicar registros—.
 */
export type ModoCargueParticipacion = "anexar" | "reemplazar";

/** Qué pasó con un archivo concreto del cargue de participación. */
export interface ResultadoCargueParticipacion {
  archivo: string;
  aceptado: boolean;
  /** Por qué se aceptó o se rechazó, en texto para mostrar tal cual. */
  motivo: string;
  filas: number | null;
  /** De las columnas reconocidas del formato, cuántas trajo este archivo. */
  columnasReconocidas: number | null;
}
