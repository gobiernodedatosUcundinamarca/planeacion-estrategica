import type { CampoIa } from "@/lib/reglas/ia-administrativos";
import type { TemaComentarios } from "./formularios";

/**
 * Una respuesta de la encuesta de IA a administrativos. Es anónima: no trae
 * correo ni nombre. Las preguntas de selección múltiple llegan como el texto
 * del export ("A;B;C;") y se separan al contar (`separarOpciones`).
 */
export type RespuestaIaAdministrativos = Record<CampoIa, string | null> & {
  id: number;
  /** Día en que se respondió, en ISO ("aaaa-mm-dd"); null si no se pudo leer. */
  fechaRespuesta: string | null;
  /**
   * Unidad regional de la jornada del día en que se respondió (el formulario no
   * la pregunta; sale de las jornadas de Participación). null si ese día no
   * hubo jornada registrada.
   */
  unidadRegional: string | null;
  /** Tema en que cayó la tarea repetitiva que se describió; null si no trae una. */
  tema: number | null;
};

/** Lo que recibe la sección: las respuestas y los temas de las tareas descritas. */
export interface VistaIaAdministrativos {
  respuestas: RespuestaIaAdministrativos[];
  temas: TemaComentarios[];
}
