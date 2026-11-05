import type { CampoAfirmacion } from "@/lib/reglas/valoracion-territorio";
import type { TemaComentarios } from "./formularios";

/**
 * Una respuesta del instrumento de valoración de la experiencia en territorio.
 * El formulario es anónimo: no trae correo, nombre ni unidad regional, así que
 * no hay nada personal que guardar ni que dejar fuera.
 */
export type RespuestaValoracionTerritorio = Record<CampoAfirmacion, string | null> & {
  id: number;
  /** Día en que se respondió, en ISO ("aaaa-mm-dd"); null si no se pudo leer. */
  fechaRespuesta: string | null;
  tipoActor: string | null;
  /** "¿Qué aspecto de esta experiencia considera que podríamos mejorar?" */
  mejora: string | null;
  /**
   * Unidad regional de la jornada del día en que se respondió (el formulario no
   * la pregunta; sale de las jornadas de Participación). null si ese día no
   * hubo jornada registrada.
   */
  unidadRegional: string | null;
  /** Tema en que cayó la sugerencia de mejora; null si no trae una. */
  tema: number | null;
};

/** Lo que recibe la sección: las respuestas y los temas de las sugerencias. */
export interface VistaValoracionTerritorio {
  respuestas: RespuestaValoracionTerritorio[];
  temas: TemaComentarios[];
}
