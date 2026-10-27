import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  DocumentoAportes,
  RespuestaAporte,
  ResultadoCargueAportes,
} from "@/types/aportes";
import { calcularActualizacion } from "@/lib/reglas/momento4";
import { leerDocumentoAportes, type FilaExcelAporte } from "./aportes-formato";

/**
 * Lectura y escritura de los aportes generales en Postgres.
 *
 * Sin "server-only" a propósito, igual que los demás almacenes: los scripts de
 * mantenimiento deben poder escribir por este mismo camino.
 */

type Sql = NeonQueryFunction<false, false>;

/** Filas por sentencia INSERT; mismo margen que el resto (ver momento4-almacen). */
const FILAS_POR_SENTENCIA = 1000;

/** El documento cargado, o null si todavía no se ha subido ninguno. */
export async function consultarDocumento(sql: Sql): Promise<DocumentoAportes | null> {
  const filas = await sql`
    select archivo, respuestas, actualizado from aportes_documento where id = 1
  `;
  if (filas.length === 0) return null;
  return {
    archivo: filas[0].archivo as string,
    respuestas: Number(filas[0].respuestas),
    actualizado: new Date(filas[0].actualizado as string).toISOString(),
  };
}

/** Todos los aportes publicados, del más reciente al más antiguo. */
export async function consultarAportes(sql: Sql): Promise<RespuestaAporte[]> {
  const filas = await sql`
    select id, fecha_inicio, correo, nombre, tipo_actor, unidad_regional, aporte
    from aportes_respuestas
    order by fecha_inicio desc nulls last, id
  `;
  return filas.map((f) => ({
    id: Number(f.id),
    fechaInicio: aFechaISO(f.fecha_inicio),
    correo: (f.correo as string | null) ?? null,
    nombre: (f.nombre as string | null) ?? null,
    tipoActor: (f.tipo_actor as string | null) ?? null,
    unidadRegional: (f.unidad_regional as string | null) ?? null,
    aporte: f.aporte as string,
  }));
}

/**
 * Una columna `date` a "aaaa-mm-dd" con los componentes locales: `toISOString`
 * daría el día anterior al oeste de UTC, porque el driver devuelve la fecha
 * como medianoche local.
 */
function aFechaISO(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Valida el Excel y, si cumple, reemplaza los aportes por los del archivo.
 *
 * Reemplaza y no acumula porque el export de Microsoft Forms es acumulativo:
 * cada descarga trae todas las respuestas recibidas hasta ese momento, así que
 * sumarlas duplicaría las anteriores. Es el mismo criterio de las casillas del
 * Momento 4.
 */
export async function guardarDocumento(
  sql: Sql,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueAportes> {
  const rechazo = (motivo: string): ResultadoCargueAportes => ({
    archivo: nombreOriginal,
    aceptado: false,
    motivo,
    respuestas: null,
    sinAporte: null,
    descartadasPorFecha: null,
  });

  const lectura = leerDocumentoAportes(nombreOriginal, contenido);
  if (!lectura.ok) return rechazo(lectura.motivo);

  try {
    await sql.transaction((txn) => [
      txn`
        insert into aportes_documento (id, archivo, respuestas, actualizado)
        values (1, ${nombreOriginal}, ${lectura.respuestas.length}, now())
        on conflict (id) do update
          set archivo = excluded.archivo,
              respuestas = excluded.respuestas,
              actualizado = now()
      `,
      txn`delete from aportes_respuestas`,
      ...sentenciasDeInsercion(lectura.respuestas).map(({ texto, parametros }) =>
        txn.query(texto, parametros)
      ),
    ]);

    const sinAporte =
      lectura.sinAporte > 0 ? ` Se dejaron fuera ${lectura.sinAporte} sin aporte escrito.` : "";
    const porFecha =
      lectura.descartadasPorFecha > 0
        ? ` Quedaron fuera ${lectura.descartadasPorFecha} por ser anteriores al corte.`
        : "";
    const repetidas =
      lectura.descartadas > 0
        ? ` Se descartaron ${lectura.descartadas} por repetir correo y rol.`
        : "";

    return {
      archivo: nombreOriginal,
      aceptado: true,
      motivo: `Cargado · ${lectura.respuestas.length} aporte(s) guardados.${porFecha}${sinAporte}${repetidas}`,
      respuestas: lectura.respuestas.length,
      sinAporte: lectura.sinAporte,
      descartadasPorFecha: lectura.descartadasPorFecha,
    };
  } catch (error) {
    return rechazo(
      `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`
    );
  }
}

/**
 * Agrega a los aportes ya guardados solo los que traiga de nuevo el export, sin
 * sobrescribir lo que ya estaba. Misma regla que las transformaciones del
 * Momento 4 (ver `calcularActualizacion`) y misma lectura que Reemplazar.
 */
export async function actualizarDocumento(
  sql: Sql,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueAportes> {
  const rechazo = (motivo: string): ResultadoCargueAportes => ({
    archivo: nombreOriginal,
    aceptado: false,
    motivo,
    respuestas: null,
    sinAporte: null,
    descartadasPorFecha: null,
  });

  const lectura = leerDocumentoAportes(nombreOriginal, contenido);
  if (!lectura.ok) return rechazo(lectura.motivo);

  try {
    const guardados = await sql`select id, respuesta_id, correo, tipo_actor from aportes_respuestas`;
    const existentes = guardados.map((f) => ({
      id: Number(f.id),
      respuestaId: (f.respuesta_id as string | null) ?? null,
      correo: (f.correo as string | null) ?? null,
      rol: (f.tipo_actor as string | null) ?? null,
    }));
    const delArchivo = lectura.respuestas.map((fila) => ({
      fila,
      respuestaId: fila.respuestaId,
      correo: fila.correo,
      rol: fila.tipoActor,
    }));
    const plan = calcularActualizacion(existentes, delArchivo);

    if (existentes.length > 0 && delArchivo.length > 0 && plan.sinCambios === 0) {
      return rechazo(
        `Ningún aporte del archivo coincide con los ${existentes.length} ya cargados: no parece ser el export del formulario de UCUNDINAMARCA. Si es el archivo correcto, usa Reemplazar.`
      );
    }

    const total = existentes.length - plan.sustituidas.length + plan.nuevas.length;
    const avisos = [
      plan.sustituidas.length > 0
        ? ` ${plan.sustituidas.length} reemplazaron el aporte anterior de la misma persona (se conserva el más reciente).`
        : "",
      plan.masAntiguas > 0
        ? ` ${plan.masAntiguas} no se agregaron porque esa persona ya tenía un aporte más reciente cargado.`
        : "",
      plan.sinId > 0 ? ` ${plan.sinId} sin ID de Forms no se agregaron.` : "",
      lectura.descartadasPorFecha > 0
        ? ` Quedaron fuera ${lectura.descartadasPorFecha} por ser anteriores al corte.`
        : "",
      lectura.sinAporte > 0 ? ` Se dejaron fuera ${lectura.sinAporte} sin aporte escrito.` : "",
      lectura.descartadas > 0 ? ` Se descartaron ${lectura.descartadas} por repetir correo y rol.` : "",
    ].join("");

    const resultado = (motivo: string): ResultadoCargueAportes => ({
      archivo: nombreOriginal,
      aceptado: true,
      motivo,
      respuestas: total,
      sinAporte: lectura.sinAporte,
      descartadasPorFecha: lectura.descartadasPorFecha,
    });

    if (plan.nuevas.length === 0 && plan.sustituidas.length === 0) {
      return resultado(
        `Ya estaba al día: los ${plan.sinCambios} aporte(s) del archivo ya estaban cargados y no se cambió nada.${avisos}`
      );
    }

    const idsSustituidos = plan.sustituidas.map((s) => s.id);
    await sql.transaction((txn) => [
      txn`
        insert into aportes_documento (id, archivo, respuestas, actualizado)
        values (1, ${nombreOriginal}, ${total}, now())
        on conflict (id) do update
          set archivo = excluded.archivo,
              respuestas = excluded.respuestas,
              actualizado = now()
      `,
      ...(idsSustituidos.length
        ? [txn`delete from aportes_respuestas where id = any(${idsSustituidos}::bigint[])`]
        : []),
      ...sentenciasDeInsercion(plan.nuevas.map((n) => n.fila)).map(({ texto, parametros }) =>
        txn.query(texto, parametros)
      ),
    ]);

    return resultado(
      `Actualizado · ${plan.nuevas.length} aporte(s) nuevos agregados; ${plan.sinCambios} ya estaban y no se tocaron. Total: ${total}.${avisos}`
    );
  } catch (error) {
    return rechazo(
      `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`
    );
  }
}

/** Borra los aportes cargados. Se borran filas, nunca tablas. */
export async function eliminarAportes(sql: Sql): Promise<number> {
  const [borradas] = await sql.transaction((txn) => [
    txn`delete from aportes_respuestas returning id`,
    txn`delete from aportes_documento`,
  ]);
  return borradas.length;
}

/** Parte los aportes en sentencias INSERT de a `FILAS_POR_SENTENCIA`. */
function sentenciasDeInsercion(
  respuestas: FilaExcelAporte[]
): { texto: string; parametros: unknown[] }[] {
  const columnas = [
    "respuesta_id",
    "fecha_inicio",
    "hora_inicio",
    "correo",
    "nombre",
    "tipo_actor",
    "unidad_regional",
    "aporte",
  ];
  const sentencias: { texto: string; parametros: unknown[] }[] = [];

  for (let inicio = 0; inicio < respuestas.length; inicio += FILAS_POR_SENTENCIA) {
    const lote = respuestas.slice(inicio, inicio + FILAS_POR_SENTENCIA);
    const parametros: unknown[] = [];
    const grupos = lote.map((r) => {
      const valores = [
        r.respuestaId,
        r.fechaInicio,
        r.horaInicio,
        r.correo,
        r.nombre,
        r.tipoActor,
        r.unidadRegional,
        r.aporte,
      ];
      const marcadores = valores.map((_, i) => `$${parametros.length + i + 1}`);
      parametros.push(...valores);
      return `(${marcadores.join(", ")})`;
    });
    sentencias.push({
      texto: `insert into aportes_respuestas (${columnas.join(", ")}) values ${grupos.join(", ")}`,
      parametros,
    });
  }

  return sentencias;
}
