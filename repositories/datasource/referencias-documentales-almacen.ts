import { createHash } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { ClasificacionDocumental, FuenteClasificacionDocumental, MetodoClasificacion, ResultadoClasificacionDocumental, ResumenFuentesClasificacion, TemaDocumental } from "@/types/clasificacion-documental";
import { esMetodoClasificacion } from "@/lib/reglas/fuentes-clasificacion";

type Sql = NeonQueryFunction<false, false>;
interface TemaFuente extends Omit<TemaDocumental, "probabilidad" | "referencia"> { idOriginal?: string }
interface AsignacionFuente { id: string; probabilidad: number | null; afinidad?: number | null }

async function disponible(sql: Sql) {
  const [fila] = await sql`select to_regclass('public.momento4_fuentes_suplementarias') is not null
    and to_regclass('public.momento4_vinculos_suplementarios') is not null as disponible`;
  return Boolean(fila.disponible);
}

export async function consultarResumenFuentes(sql: Sql): Promise<ResumenFuentesClasificacion> {
  if (!await disponible(sql)) return { disponibles: [], porComentario: {} };
  const filas = await sql`
    select r.id, r.ajustes, jsonb_agg(distinct jsonb_build_object('metodo', f.metodo, 'huella', v.huella_texto)) as referencias
    from momento4_respuestas r
    join momento4_vinculos_suplementarios v on v.transformacion=r.transformacion and v.respuesta_id=r.respuesta_id
    join momento4_fuentes_suplementarias f on f.id=v.fuente_id
    where jsonb_array_length(v.temas)>0
    group by r.id, r.ajustes
  `;
  const porComentario: ResumenFuentesClasificacion["porComentario"] = {};
  const conteos = new Map<MetodoClasificacion, number>();
  for (const fila of filas) {
    const huella = createHash("sha256").update(String(fila.ajustes ?? "")).digest("hex");
    const metodos = new Set<MetodoClasificacion>();
    for (const ref of fila.referencias as { metodo: string; huella: string }[]) {
      if (ref.huella === huella && esMetodoClasificacion(ref.metodo)) metodos.add(ref.metodo);
    }
    porComentario[Number(fila.id)] = [...metodos];
    for (const metodo of metodos) conteos.set(metodo, (conteos.get(metodo) ?? 0) + 1);
  }
  return { porComentario, disponibles: [...conteos].map(([metodo, comentarios]) => ({ metodo, comentarios })) };
}

/** Cada metodología conserva su identidad y su catálogo; no se crean equivalencias A1/BERT. */
export async function consultarReferenciasDocumentales(sql: Sql, metodo: MetodoClasificacion): Promise<ResultadoClasificacionDocumental> {
  if (!await disponible(sql)) return { disponible: false, comentarios: [] };
  const [documentos, vinculos] = await Promise.all([
    sql`select id, archivo, sha256, hoja, taxonomia_archivo, sha256_taxonomia, alcance, version, temas
      from momento4_fuentes_suplementarias where metodo=${metodo} order by archivo`,
    sql`select r.id, r.ajustes, v.fuente_id, v.fila, v.huella_texto, v.temas, v.observacion, c.estado as estado_comun
      from momento4_vinculos_suplementarios v
      join momento4_fuentes_suplementarias f on f.id=v.fuente_id and f.metodo=${metodo}
      join momento4_respuestas r on r.transformacion=v.transformacion and r.respuesta_id=v.respuesta_id
      left join momento4_comentarios_documentales c on c.transformacion=r.transformacion and c.respuesta_id=r.respuesta_id
      order by r.id, f.archivo, v.fila`,
  ]);
  const fuentes = new Map(documentos.map((f) => [String(f.id), f]));
  const comentarios = new Map<number, ClasificacionDocumental>();
  for (const v of vinculos) {
    const f = fuentes.get(String(v.fuente_id));
    if (!f) continue;
    const fuente: FuenteClasificacionDocumental = {
      archivo: String(f.archivo), sha256: String(f.sha256), hoja: String(f.hoja), fila: Number(v.fila), version: String(f.version),
      taxonomia: f.taxonomia_archivo as string | null, sha256Taxonomia: f.sha256_taxonomia as string | null,
    };
    const vigente = createHash("sha256").update(String(v.ajustes ?? "")).digest("hex") === v.huella_texto;
    const alcance = f.alcance as { unidad?: string; nivel?: string };
    const ambito = alcance.nivel === "conjunto" ? "Todas las unidades" : alcance.unidad ?? "";
    const observacion = v.estado_comun === "sin_contenido_revisado"
      ? "La revisión de la lista común excluyó este registro como no evaluable. Esta agrupación anterior se conserva como evidencia histórica, sin cambiar esa decisión."
      : (v.observacion as string | null) ?? null;
    const registro = comentarios.get(Number(v.id)) ?? { idRespuesta: Number(v.id), fuente,
      estado: vigente ? "sin_tema" : "texto_modificado", motivo: observacion, temas: [] } as ClasificacionDocumental;
    if (vigente) {
      const catalogo = new Map((f.temas as TemaFuente[]).map((t) => [t.id, t]));
      for (const asignacion of v.temas as AsignacionFuente[]) {
        const tema = catalogo.get(asignacion.id);
        if (!tema) throw new Error("Una referencia documental no corresponde a su catálogo original.");
        registro.temas.push({ ...tema, id: `${f.id}:${tema.id}`, ambito,
          probabilidad: asignacion.probabilidad, ...(asignacion.afinidad === undefined ? {} : { afinidad: asignacion.afinidad }), referencia: fuente });
      }
      if (registro.temas.length) registro.estado = "con_temas";
    }
    comentarios.set(Number(v.id), registro);
  }
  return { disponible: true, comentarios: [...comentarios.values()] };
}
