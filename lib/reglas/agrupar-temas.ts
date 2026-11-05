import type { TemaComentarios } from "@/types/formularios";
import { clasificarComentarios } from "./clasificacion";
import { clave, esTextoConContenido } from "./formularios";

/**
 * Agrupa por tema las respuestas abiertas con contenido, con la misma
 * clasificación de los comentarios de las transformaciones
 * (`clasificarComentarios`: TF-IDF + K-Means, sin servicios externos).
 *
 * Va en su propio archivo y no en `formularios.ts` porque solo la usa el
 * servidor: los paneles importan `formularios.ts`, y meter aquí el clasificador
 * lo mandaría entero al navegador sin necesidad.
 *
 * Se calcula al consultar y no se guarda: con unos cientos de textos tarda
 * milisegundos (~35 ms con las 519 valoraciones), y así un cambio en la lista
 * de respuestas sin contenido se ve en la siguiente visita sin volver a cargar
 * nada. Los elementos deben llegar en un orden estable (por id): K-Means
 * arranca por posición, y otro orden daría otros temas.
 */
export function agruparPorTema<T extends { id: number }>(
  elementos: T[],
  texto: (elemento: T) => string | null,
  /**
   * Palabras que repite la propia pregunta o que no distinguen un tema ("bien",
   * "excelente", "estuvo" cuando se pregunta qué mejorar). Se quitan solo del
   * texto que se agrupa —la lista muestra el original— para que no terminen
   * dando nombre a un tema ("Bien y general"). No se agregan a las palabras
   * vacías de `clasificacion.ts` porque esas valen también para los
   * comentarios de las transformaciones, y cambiarlas movería sus temas.
   */
  palabrasSinTema: readonly string[] = []
): { temas: TemaComentarios[]; temaDe: Map<number, number> } {
  const sinTema = new Set(palabrasSinTema.map(clave));
  const limpiarTexto = (t: string) =>
    t
      .split(/\s+/)
      .filter((palabra) => !sinTema.has(clave(palabra)))
      .join(" ");

  const grupos = clasificarComentarios(
    elementos.flatMap((e) => {
      const t = texto(e);
      return t && esTextoConContenido(t) ? [{ id: e.id, texto: limpiarTexto(t) }] : [];
    })
  );
  return {
    temas: grupos.map((g) => ({
      cluster: g.grupo,
      nombre: g.nombre,
      terminos: g.terminos,
      total: g.ids.length,
    })),
    temaDe: new Map(grupos.flatMap((g) => g.ids.map((id) => [id, g.grupo] as const))),
  };
}
