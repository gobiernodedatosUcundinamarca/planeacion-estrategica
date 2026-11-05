/**
 * Lo común a los formularios de Forms que se cargan desde /admin como un solo
 * documento: la valoración de la experiencia en territorio y la encuesta de IA
 * a administrativos. Cada uno tiene sus propias tablas; esto es solo la forma
 * del estado de la carga, que es igual en los dos.
 */

/** El documento cargado; solo hay uno por formulario, el último que se subió. */
export interface DocumentoFormulario {
  archivo: string;
  respuestas: number;
  /** Cuándo se cargó, en ISO. */
  actualizado: string;
}

/** Qué pasó con el archivo de una carga. */
export interface ResultadoCargueFormulario {
  archivo: string;
  aceptado: boolean;
  /** Por qué se aceptó o se rechazó, en texto para mostrar tal cual. */
  motivo: string;
  respuestas: number | null;
}

/** Un tema en que se agrupan las respuestas abiertas, con cuántas reúne. */
export interface TemaComentarios {
  cluster: number;
  nombre: string;
  terminos: string[];
  total: number;
}
