import { createHash } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  EstadoClasificacionDocumental,
  ResultadoClasificacionDocumental,
  TemaDocumental,
} from "@/types/clasificacion-documental";

/** Lectura adicional; las respuestas y su clasificación automática se conservan. */
export async function consultarClasificacionDocumental(
  sql: NeonQueryFunction<false, false>
): Promise<ResultadoClasificacionDocumental> {
  const [esquema] = await sql`
    select to_regclass('public.momento4_comentarios_documentales') is not null as disponible
  `;
  if (!esquema.disponible) return { disponible: false, comentarios: [] };

  const filas = await sql`
    select r.id as id_respuesta, r.ajustes, c.huella_texto, c.estado, c.motivo,
           c.hoja, c.fila, f.archivo, f.sha256, f.version, f.taxonomia, f.sha256_taxonomia,
           coalesce((
             select jsonb_agg(jsonb_build_object(
               'id', t.tema_id, 'codigo', t.codigo, 'nombre', t.nombre,
               'componente', t.componente, 'otrosComponentes', t.otros_componentes,
               'criterio', t.criterio, 'exclusion', t.exclusion,
               'justificacion', t.justificacion, 'probabilidad', a.probabilidad
             ) order by t.orden)
             from momento4_asignaciones_documentales a
             join momento4_temas_documentales t on t.fuente_id = a.fuente_id and t.tema_id = a.tema_id
             where a.transformacion = c.transformacion and a.respuesta_id = c.respuesta_id and a.fuente_id = c.fuente_id
           ), '[]'::jsonb) as temas
    from momento4_comentarios_documentales c
    join momento4_fuentes_documentales f on f.id = c.fuente_id
    join momento4_respuestas r on r.transformacion = c.transformacion and r.respuesta_id = c.respuesta_id
    order by r.id
  `;

  return {
    disponible: true,
    comentarios: filas.map((fila) => {
      const vigente = createHash("sha256").update(String(fila.ajustes ?? "")).digest("hex") === fila.huella_texto;
      return {
        idRespuesta: Number(fila.id_respuesta),
        estado: (vigente ? fila.estado : "texto_modificado") as EstadoClasificacionDocumental,
        motivo: vigente ? (fila.motivo as string | null) : "El texto actual difiere del que se verificó con la fuente.",
        fuente: {
          archivo: String(fila.archivo), sha256: String(fila.sha256),
          hoja: (fila.hoja as string | null) ?? null, fila: fila.fila == null ? null : Number(fila.fila),
          version: String(fila.version), taxonomia: (fila.taxonomia as string | null) ?? null,
          sha256Taxonomia: (fila.sha256_taxonomia as string | null) ?? null,
        },
        temas: vigente ? fila.temas as TemaDocumental[] : [],
      };
    }),
  };
}
