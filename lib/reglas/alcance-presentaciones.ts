import type { RespuestaMomento4 } from '@/types/momento4';
import type { ClasificacionDocumental } from '@/types/clasificacion-documental';
import { comentariosExistentes, contarTemas } from './navegacion-comentarios';
import { normalizar } from './momento4';

export const esAporteTematico = (codigo: string) => /^A\d+$/.test(codigo);

/** Las diapositivas usan el corpus preparado de las unidades identificadas.
 * Conservan también las filas revisadas sin tema; no las confunden con nuevas
 * respuestas ni con las exclusiones previas de la preparación original.
 */
export function separarComentariosPresentaciones(
  respuestas: RespuestaMomento4[],
  referencias: ReadonlyMap<number, ClasificacionDocumental>,
  unidades: readonly string[],
) {
  const reconocidas = new Set(unidades.map(normalizar));
  const documentados: RespuestaMomento4[] = [], otros: RespuestaMomento4[] = [];
  for (const respuesta of comentariosExistentes(respuestas)) {
    const estado = referencias.get(respuesta.id)?.estado;
    const pertenece = reconocidas.has(normalizar(respuesta.unidadRegional ?? '')) &&
      (estado === 'con_temas' || estado === 'sin_tema' || estado === 'sin_contenido_revisado');
    (pertenece ? documentados : otros).push(respuesta);
  }
  return { documentados, otros };
}

export function resumirAportesPresentaciones(comentarios: RespuestaMomento4[], referencias: ReadonlyMap<number, ClasificacionDocumental>) {
  const unicos = comentariosExistentes(comentarios);
  const temas = contarTemas(unicos, referencias).filter(t => esAporteTematico(t.codigo));
  const conAportes = unicos.filter(r => referencias.get(r.id)?.temas.some(t => esAporteTematico(t.codigo))).length;
  const bases = new Map<string, number>();
  for (const r of unicos) bases.set(r.etiqueta, (bases.get(r.etiqueta) ?? 0) + 1);
  return { total: unicos.length, conAportes, sinAportes: unicos.length - conAportes,
    asignaciones: temas.reduce((s,t) => s + t.total, 0), bases };
}

export function referenciasSoloAportes(referencias: ReadonlyMap<number, ClasificacionDocumental>) {
  return new Map([...referencias].map(([id,c]) => [id, { ...c, temas:c.temas.filter(t => esAporteTematico(t.codigo)) }]));
}
