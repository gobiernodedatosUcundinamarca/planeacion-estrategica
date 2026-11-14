import type { RespuestaMomento4 } from "@/types/momento4";
import type { ClasificacionDocumental, ClasificacionDocumentalCompacta, ResultadoClasificacionDocumental } from "@/types/clasificacion-documental";
import { clasificarRespaldo, normalizar, type OpcionRespaldo } from "./momento4";
import { compararOrdenTransformaciones } from './orden-transformaciones';

export interface FiltrosComentarios {
  unidad: string | null;
  transformacion: string | null;
  grupo: string | null;
  temas: string[];
  sinTema: boolean;
  postura: OpcionRespaldo | null;
  busqueda: string;
}

export const TODOS_LOS_COMENTARIOS: FiltrosComentarios = {
  unidad: null, transformacion: null, grupo: null, temas: [], sinTema: false, postura: null, busqueda: "",
};

export const POSTURAS_COMENTARIOS: { id: OpcionRespaldo; nombre: string }[] = [
  { id: "si", nombre: "De acuerdo" },
  { id: "parcialmente", nombre: "Parcialmente de acuerdo" },
  { id: "no", nombre: "En desacuerdo" },
  { id: "otra", nombre: "Sin postura registrada" },
];

export function valorRegistrado(valor: string | null): string {
  return valor?.trim() || "Sin especificar";
}

export function claveTema(transformacion: string, tema: string): string {
  return `${transformacion}:${tema}`;
}

/** Solo excluye campos abiertos vacíos; conserva textos iguales de respuestas distintas. */
export function comentariosExistentes(respuestas: RespuestaMomento4[]): RespuestaMomento4[] {
  const ids = new Set<number>();
  return respuestas.filter((r) => {
    if (!r.ajustes?.trim() || ids.has(r.id)) return false;
    ids.add(r.id);
    return true;
  });
}

export function filtrarComentarios(
  comentarios: RespuestaMomento4[],
  clasificaciones: ReadonlyMap<number, ClasificacionDocumental>,
  filtros: FiltrosComentarios,
): RespuestaMomento4[] {
  const busqueda = normalizar(filtros.busqueda);
  return comentarios.filter((r) => {
    if (filtros.unidad !== null && valorRegistrado(r.unidadRegional) !== filtros.unidad) return false;
    if (filtros.transformacion !== null && r.transformacion !== filtros.transformacion) return false;
    if (filtros.grupo !== null && valorRegistrado(r.tipoActor) !== filtros.grupo) return false;
    if (filtros.postura !== null && clasificarRespaldo(r.respondeNecesidad) !== filtros.postura) return false;
    if (busqueda && !normalizar(r.ajustes ?? "").includes(busqueda)) return false;
    const temas = clasificaciones.get(r.id)?.temas ?? [];
    if (filtros.sinTema && temas.length > 0) return false;
    return filtros.temas.every((clave) => temas.some((t) => claveTema(r.transformacion, t.id) === clave));
  });
}

export interface OpcionComentarios { id: string; nombre: string; total: number }
export interface TemaComentarios extends OpcionComentarios { codigo: string; transformacion: string; ambito?: string }

function contarOpciones(comentarios: RespuestaMomento4[], campo: (r: RespuestaMomento4) => string, nombre = campo): OpcionComentarios[] {
  const opciones = new Map<string, OpcionComentarios>();
  for (const r of comentarios) {
    const id = campo(r);
    const anterior = opciones.get(id);
    opciones.set(id, { id, nombre: nombre(r), total: (anterior?.total ?? 0) + 1 });
  }
  return [...opciones.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Conteos por prefijo del árbol; una selección parcial ya devuelve sus comentarios. */
export function opcionesComentarios(comentarios: RespuestaMomento4[], filtros: FiltrosComentarios) {
  const porUnidad = comentarios.filter((r) => filtros.unidad === null || valorRegistrado(r.unidadRegional) === filtros.unidad);
  const porTransformacion = porUnidad.filter((r) => filtros.transformacion === null || r.transformacion === filtros.transformacion);
  return {
    unidades: contarOpciones(comentarios, (r) => valorRegistrado(r.unidadRegional)),
    transformaciones: contarOpciones(porUnidad, (r) => r.transformacion, (r) => r.etiqueta).sort((a,b) => compararOrdenTransformaciones(a.id,b.id)),
    grupos: contarOpciones(porTransformacion, (r) => valorRegistrado(r.tipoActor)),
  };
}

/** Cada pertenencia temática cuenta una vez por comentario, incluso en datos con enlaces repetidos. */
export function contarTemas(comentarios: RespuestaMomento4[], clasificaciones: ReadonlyMap<number, ClasificacionDocumental>): TemaComentarios[] {
  const conteos = new Map<string, TemaComentarios>();
  const ids = new Set<number>();
  for (const r of comentarios) {
    if (ids.has(r.id)) continue;
    ids.add(r.id);
    const vistos = new Set<string>();
    for (const tema of clasificaciones.get(r.id)?.temas ?? []) {
      const id = claveTema(r.transformacion, tema.id);
      if (vistos.has(id)) continue;
      vistos.add(id);
      const anterior = conteos.get(id);
      conteos.set(id, { id, nombre: tema.nombre, codigo: tema.codigo, transformacion: r.etiqueta,
        ...(tema.ambito === undefined ? {} : { ambito: tema.ambito }), total: (anterior?.total ?? 0) + 1 });
    }
  }
  return [...conteos.values()].sort((a, b) => b.total - a.total || a.transformacion.localeCompare(b.transformacion, "es") || a.codigo.localeCompare(b.codigo, "es") || a.id.localeCompare(b.id));
}

export function contarPosturas(comentarios: RespuestaMomento4[]): Record<OpcionRespaldo, number> {
  const conteos: Record<OpcionRespaldo, number> = { si: 0, parcialmente: 0, no: 0, otra: 0 };
  for (const r of comentarios) conteos[clasificarRespaldo(r.respondeNecesidad)] += 1;
  return conteos;
}

export function seleccionarNivel(filtros: FiltrosComentarios, nivel: "unidad" | "transformacion" | "grupo", valor: string | null): FiltrosComentarios {
  return { ...filtros, [nivel]: valor, temas: [], sinTema: false,
    ...(nivel === "unidad" ? { transformacion: null, grupo: null } : nivel === "transformacion" ? { grupo: null } : {}) };
}

export function alternarTema(filtros: FiltrosComentarios, id: string): FiltrosComentarios {
  return { ...filtros, sinTema: false, temas: filtros.temas.includes(id) ? filtros.temas.filter((t) => t !== id) : [...filtros.temas, id] };
}

/** Las referencias se envían una sola vez; no se regeneran ni cambian asignaciones. */
export function compactarClasificacion(resultado: ResultadoClasificacionDocumental): ClasificacionDocumentalCompacta {
  const fuentes: ClasificacionDocumentalCompacta["fuentes"] = [];
  const temas: ClasificacionDocumentalCompacta["temas"] = [];
  const indicesFuentes = new Map<string, number>();
  const indicesTemas = new Map<string, number>();
  function indexarFuente(f: ClasificacionDocumental["fuente"]) {
    const { hoja, fila, ...referencia } = f;
    const clave = JSON.stringify(referencia);
    let fuente = indicesFuentes.get(clave);
    if (fuente === undefined) { fuente = fuentes.length; fuentes.push(referencia); indicesFuentes.set(clave, fuente); }
    return { fuente, hoja, fila };
  }
  const comentarios = resultado.comentarios.map((c) => {
    const { fuente, hoja, fila } = indexarFuente(c.fuente);
    return { idRespuesta: c.idRespuesta, estado: c.estado, motivo: c.motivo, fuente, hoja, fila,
      temas: c.temas.map(({ probabilidad, afinidad, referencia, ...definicion }) => {
        const ref = referencia === undefined ? undefined : indexarFuente(referencia);
        const clave = `${ref?.fuente ?? fuente}:${definicion.id}`;
        let tema = indicesTemas.get(clave);
        if (tema === undefined) { tema = temas.length; temas.push(definicion); indicesTemas.set(clave, tema); }
        return { tema, probabilidad, ...(afinidad === undefined ? {} : { afinidad }), ...(ref === undefined ? {} : { referencia: ref }) };
      }) };
  });
  return { disponible: resultado.disponible, fuentes, temas, comentarios };
}

export function expandirClasificacion(datos: ClasificacionDocumentalCompacta): Map<number, ClasificacionDocumental> {
  return new Map(datos.comentarios.map((c) => [c.idRespuesta, {
    idRespuesta: c.idRespuesta, estado: c.estado, motivo: c.motivo,
    fuente: { ...datos.fuentes[c.fuente], hoja: c.hoja, fila: c.fila },
    temas: c.temas.map((a) => ({ ...datos.temas[a.tema], probabilidad: a.probabilidad,
      ...(a.afinidad === undefined ? {} : { afinidad: a.afinidad }),
      ...(a.referencia === undefined ? {} : { referencia: { ...datos.fuentes[a.referencia.fuente], hoja: a.referencia.hoja, fila: a.referencia.fila } }),
    })),
  }]));
}
