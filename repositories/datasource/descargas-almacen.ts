import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { EventoDescarga, RegistroDescargas, ResultadoDescarga } from "@/types/descargas";

/**
 * El registro de descargas en Postgres: los conteos con que se aplican los
 * límites y el reporte de /admin. Sin "server-only", igual que los demás
 * almacenes.
 */

type Sql = NeonQueryFunction<false, false>;

/**
 * Cuántas descargas entregadas lleva el visitante y el sitio en sus ventanas.
 * Solo cuentan las entregadas: las rechazadas no consumieron recursos, y
 * contarlas alargaría el bloqueo de quien siga insistiendo sin necesidad.
 */
export async function contarRecientes(
  sql: Sql,
  ipHash: string,
  minutosVisitante: number,
  minutosGlobal: number
): Promise<{ visitante: number; global: number }> {
  const [fila] = await sql`
    select
      count(*) filter (
        where ip_hash = ${ipHash} and creado_en > now() - make_interval(mins => ${minutosVisitante})
      ) as visitante,
      count(*) as global
    from descargas_registro
    where resultado = 'entregada' and creado_en > now() - make_interval(mins => ${minutosGlobal})
  `;
  return { visitante: Number(fila.visitante), global: Number(fila.global) };
}

/**
 * Huella del contenido de unas tablas: un md5 calculado en Postgres sobre
 * todas sus filas, más el conteo. Viaja como unos pocos caracteres, así que
 * saber si el Excel guardado sigue vigente cuesta ~100-700 ms en vez de los
 * 11-16 s que tardaba traer las ~3.800 filas cuando Neon va lento.
 *
 * Los nombres de tabla van pegados al SQL porque Postgres no admite
 * parámetros en identificadores; salen de una lista fija del código, nunca de
 * la petición.
 */
export async function huellaTablas(sql: Sql, tablas: readonly string[]): Promise<string> {
  const huellas = await Promise.all(
    tablas.map(async (tabla) => {
      const [fila] = await sql.query(
        `select count(*) as n, md5(coalesce(string_agg(t::text, '|' order by t.id), '')) as huella from ${tabla} t`
      );
      return `${tabla}:${fila.n}:${fila.huella}`;
    })
  );
  return huellas.join("|");
}

export async function registrarEvento(sql: Sql, evento: EventoDescarga): Promise<void> {
  await sql`
    insert into descargas_registro (seccion, ip_hash, resultado, bytes, milisegundos, desde_cache)
    values (${evento.seccion}, ${evento.ipHash}, ${evento.resultado}, ${evento.bytes},
            ${evento.milisegundos}, ${evento.desdeCache})
  `;
}

/**
 * El reporte de los últimos `dias` días. Antes de leer borra lo que pasó el
 * plazo de conservación: se hace aquí, al consultar desde /admin, y no en cada
 * descarga, para no sumarle trabajo a la petición pública.
 */
export async function consultarRegistro(
  sql: Sql,
  dias: number,
  diasConservacion: number
): Promise<RegistroDescargas> {
  await sql`delete from descargas_registro where creado_en < now() - make_interval(days => ${diasConservacion})`;

  const [porSeccion, recientes, visitantes] = await Promise.all([
    sql`
      select seccion,
             count(*) filter (where resultado = 'entregada') as entregadas,
             count(*) filter (where resultado <> 'entregada') as rechazadas,
             coalesce(sum(bytes) filter (where resultado = 'entregada'), 0) as bytes
      from descargas_registro
      where creado_en > now() - make_interval(days => ${dias})
      group by seccion
      order by entregadas desc, seccion
    `,
    sql`
      select creado_en, seccion, resultado, ip_hash, bytes, milisegundos, desde_cache
      from descargas_registro
      order by creado_en desc
      limit 25
    `,
    sql`
      select ip_hash, count(*) as peticiones,
             count(*) filter (where resultado <> 'entregada') as rechazadas
      from descargas_registro
      where creado_en > now() - make_interval(days => ${dias})
      group by ip_hash
      order by peticiones desc
      limit 5
    `,
  ]);

  return {
    dias,
    porSeccion: porSeccion.map((f) => ({
      seccion: f.seccion as string,
      entregadas: Number(f.entregadas),
      rechazadas: Number(f.rechazadas),
      kilobytes: Math.round(Number(f.bytes) / 1024),
    })),
    recientes: recientes.map((f) => ({
      fecha: new Date(f.creado_en as string).toISOString(),
      seccion: f.seccion as string,
      resultado: f.resultado as ResultadoDescarga,
      visitante: String(f.ip_hash).slice(0, 6),
      kilobytes: f.bytes === null ? null : Math.round(Number(f.bytes) / 1024),
      milisegundos: f.milisegundos === null ? null : Number(f.milisegundos),
      desdeCache: Boolean(f.desde_cache),
    })),
    visitantesMasActivos: visitantes.map((f) => ({
      visitante: String(f.ip_hash).slice(0, 6),
      peticiones: Number(f.peticiones),
      rechazadas: Number(f.rechazadas),
    })),
  };
}
