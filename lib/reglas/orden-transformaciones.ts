import { TRANSFORMACIONES_MOMENTO4, normalizar } from './momento4';

// El catálogo define el orden institucional; las cifras siguen saliendo de la fuente.
const posiciones = new Map(TRANSFORMACIONES_MOMENTO4.flatMap((t, indice) =>
  [[normalizar(t.id), indice], [normalizar(t.etiqueta), indice]] as [string, number][]));

export function compararOrdenTransformaciones(a: string, b: string): number {
  const primero = posiciones.get(normalizar(a)) ?? Number.MAX_SAFE_INTEGER;
  const segundo = posiciones.get(normalizar(b)) ?? Number.MAX_SAFE_INTEGER;
  return primero - segundo || a.localeCompare(b, 'es');
}
