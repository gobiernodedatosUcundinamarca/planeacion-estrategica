import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  ClusterComentarios,
  DocumentoMomento4,
  RespuestaMomento4,
  ResultadoCargue,
} from "@/types/momento4";
import {
  FECHA_MINIMA_RESPUESTA,
  TRANSFORMACIONES_MOMENTO4,
  calcularActualizacion,
  detectarDiaPrimero,
  interpretarFechaExport,
} from "@/lib/reglas/momento4";
import { leerDocumentoMomento4, type FilaExcelMomento4 } from "./momento4-formato";
import { clasificarComentarios } from "@/lib/reglas/clasificacion";

/**
 * Lectura y escritura de los documentos del Momento 4 en Postgres.
 *
 * Igual que `infrastructure/excel.ts`, no lleva "server-only" a propósito: el
 * script de carga inicial (`scripts/cargar-momento4.ts`) tiene que escribir por
 * este mismo camino, y ese guard —pensado para el bundle del cliente— lo haría
 * fallar en Node. Cargar por otra vía podría meter en la base filas que la
 * aplicación no habría aceptado. La protección real sigue en su sitio: el
 * datasource y el repositorio que consumen esto sí declaran "server-only", y
 * son los que un componente podría importar por error.
 */

type Sql = NeonQueryFunction<false, false>;

/** Columnas de `momento4_respuestas`, emparejadas con el campo que las llena. */
const COLUMNAS: { sql: string; campo: keyof FilaExcelMomento4 }[] = [
  { sql: "respuesta_id", campo: "respuestaId" },
  { sql: "hora_inicio", campo: "horaInicio" },
  { sql: "hora_finalizacion", campo: "horaFinalizacion" },
  { sql: "correo", campo: "correo" },
  { sql: "nombre", campo: "nombre" },
  { sql: "total_puntos", campo: "totalPuntos" },
  { sql: "comentarios_cuestionario", campo: "comentariosCuestionario" },
  { sql: "hora_ultima_modificacion", campo: "horaUltimaModificacion" },
  { sql: "tipo_actor", campo: "tipoActor" },
  { sql: "programa_graduado", campo: "programaGraduado" },
  { sql: "unidad_regional", campo: "unidadRegional" },
  { sql: "transformacion_declarada", campo: "transformacionDeclarada" },
  { sql: "responde_necesidad", campo: "respondeNecesidad" },
  { sql: "ajustes", campo: "ajustes" },
];

/**
 * Filas por sentencia INSERT. Postgres admite como máximo 65.535 parámetros en
 * una sola sentencia, y aquí van 14 por fila: con un único INSERT, un documento
 * de más de ~4.680 respuestas fallaba entero ("Database request failed"). Se
 * reparte en lotes holgados por debajo de ese techo; todos viajan dentro de la
 * misma transacción, así que el reemplazo sigue siendo todo-o-nada.
 */
const FILAS_POR_SENTENCIA = 1000;

/** Estado de las 5 casillas: qué documento tiene cada una y de cuándo es. */
export async function consultarDocumentos(sql: Sql): Promise<DocumentoMomento4[]> {
  const filas = await sql`
    select transformacion, archivo, respuestas, actualizado
    from momento4_documentos
  `;

  const porTransformacion = new Map(filas.map((fila) => [fila.transformacion as string, fila]));

  // Se recorren las 5 transformaciones y no las filas de la tabla: las casillas
  // sin cargar deben aparecer igualmente, vacías.
  return TRANSFORMACIONES_MOMENTO4.map((t) => {
    const fila = porTransformacion.get(t.id);
    return {
      transformacion: t.id,
      etiqueta: t.etiqueta,
      archivo: (fila?.archivo as string) ?? null,
      respuestas: Number(fila?.respuestas ?? 0),
      actualizado: fila?.actualizado ? new Date(fila.actualizado as string).toISOString() : null,
    };
  });
}

/**
 * Todas las respuestas publicadas, con el nombre de su transformación. El orden
 * es estable (transformación y luego id) para que la tabla de la sección no
 * baraile filas entre recargas.
 */
export async function consultarRespuestas(sql: Sql): Promise<RespuestaMomento4[]> {
  const filas = await sql`
    select id, transformacion, correo, nombre, hora_inicio, tipo_actor,
           programa_graduado, unidad_regional, responde_necesidad, ajustes, cluster
    from momento4_respuestas
    order by transformacion, id
  `;

  const etiquetas = new Map(TRANSFORMACIONES_MOMENTO4.map((t) => [t.id as string, t.etiqueta]));

  // El orden día/mes se decide mirando TODAS las horas juntas y no fila por
  // fila: "5/8/26" es válido en los dos órdenes, y equivocarse cambiaría la
  // fecha de esa respuesta sin que nadie lo note. Es el mismo criterio con que
  // se leen los .xlsx al cargarlos.
  const diaPrimero = detectarDiaPrimero(filas.map((f) => (f.hora_inicio as string | null) ?? null));

  return filas.map((fila) => ({
    id: Number(fila.id),
    transformacion: fila.transformacion as string,
    etiqueta: etiquetas.get(fila.transformacion as string) ?? (fila.transformacion as string),
    correo: (fila.correo as string | null) ?? null,
    nombre: (fila.nombre as string | null) ?? null,
    fechaInicio: soloFecha(interpretarFechaExport((fila.hora_inicio as string | null) ?? null, diaPrimero)),
    tipoActor: (fila.tipo_actor as string | null) ?? null,
    programaGraduado: (fila.programa_graduado as string | null) ?? null,
    unidadRegional: (fila.unidad_regional as string | null) ?? null,
    respondeNecesidad: (fila.responde_necesidad as string | null) ?? null,
    ajustes: (fila.ajustes as string | null) ?? null,
    cluster: fila.cluster === null || fila.cluster === undefined ? null : Number(fila.cluster),
  }));
}

/**
 * La parte de fecha de un Date, en "aaaa-mm-dd" y con los componentes
 * locales: `toISOString` daría el día anterior en cualquier zona al oeste de
 * UTC, porque la hora interpretada es local.
 */
function soloFecha(fecha: Date | null): string | null {
  if (!fecha) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Recalcula la clasificación temática de TODOS los comentarios y la guarda.
 *
 * Se rehace entera en vez de clasificar solo lo nuevo porque los grupos salen
 * del conjunto: al entrar comentarios nuevos cambian los términos que
 * distinguen a cada grupo, y clasificar contra grupos viejos daría nombres que
 * ya no describen su contenido.
 */
export async function reclasificarComentarios(sql: Sql): Promise<number> {
  // `order by id` no es cosmético: K-Means arranca eligiendo un primer centro
  // por posición, así que sin un orden estable los mismos comentarios producen
  // agrupaciones distintas en cada ejecución —y los temas cambiarían de nombre
  // y de tamaño sin que nadie tocara nada—. La semilla fija sola no basta.
  const filas = await sql`
    select id, ajustes from momento4_respuestas
    where ajustes is not null and length(trim(ajustes)) > 0
    order by id
  `;

  const grupos = clasificarComentarios(
    filas.map((f) => ({ id: Number(f.id), texto: f.ajustes as string }))
  );

  const ids = grupos.flatMap((g) => g.ids);
  const numeros = grupos.flatMap((g) => g.ids.map(() => g.grupo));

  await sql.transaction((txn) => [
    // Se limpia primero: un comentario que dejó de existir, o que se quedó sin
    // grupo, no debe conservar el número de la clasificación anterior.
    txn`update momento4_respuestas set cluster = null`,
    txn`delete from momento4_clusters`,
    ...grupos.map(
      (g) => txn`
        insert into momento4_clusters (cluster, nombre, terminos, total, actualizado)
        values (${g.grupo}, ${g.nombre}, ${g.terminos.join(", ")}, ${g.ids.length}, now())
      `
    ),
    // Un solo UPDATE con todas las asignaciones, no uno por comentario: con
    // ~3.000 comentarios eran ~3.000 sentencias en cada cargue.
    ...(ids.length
      ? [
          txn`
            update momento4_respuestas as r
            set cluster = v.grupo
            from unnest(${ids}::bigint[], ${numeros}::int[]) as v(id, grupo)
            where r.id = v.id
          `,
        ]
      : []),
  ]);

  return grupos.length;
}

/** Los grupos vigentes, del más numeroso al menos. */
export async function consultarClusters(sql: Sql): Promise<ClusterComentarios[]> {
  const filas = await sql`
    select cluster, nombre, terminos, total from momento4_clusters order by total desc, cluster
  `;
  return filas.map((f) => ({
    cluster: Number(f.cluster),
    nombre: f.nombre as string,
    terminos: String(f.terminos ?? "").split(", ").filter(Boolean),
    total: Number(f.total),
  }));
}

/**
 * Borra los registros cargados: los de una transformación, o los de todas si
 * no se indica ninguna.
 *
 * Se borran FILAS, nunca tablas: nada de DROP ni TRUNCATE. La estructura debe
 * seguir en pie para que la siguiente carga funcione sin volver a migrar.
 *
 * Las dos tablas se vacían en una transacción para que no quede un documento
 * registrado sin sus respuestas —o al revés— si algo falla a medias.
 *
 * @returns Cuántas respuestas se eliminaron.
 */
export async function eliminarRegistros(
  sql: Sql,
  idTransformacion: string | null
): Promise<number> {
  if (idTransformacion) {
    const [borradas] = await sql.transaction((txn) => [
      txn`delete from momento4_respuestas where transformacion = ${idTransformacion} returning id`,
      txn`delete from momento4_documentos where transformacion = ${idTransformacion}`,
    ]);
    // Al desaparecer comentarios cambian los grupos: se rehacen para que el
    // tablero no muestre categorías que ya no tienen a quién agrupar.
    await reclasificarComentarios(sql);
    return borradas.length;
  }

  const [borradas] = await sql.transaction((txn) => [
    txn`delete from momento4_respuestas returning id`,
    txn`delete from momento4_documentos`,
  ]);
  await reclasificarComentarios(sql);
  return borradas.length;
}

/**
 * Valida el Excel y, si cumple el formato, reemplaza las respuestas de esa
 * transformación. Nunca lanza: el motivo del rechazo se muestra tal cual a
 * quien subió el documento.
 */
export async function guardarDocumento(
  sql: Sql,
  idTransformacion: string,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargue> {
  const transformacion = TRANSFORMACIONES_MOMENTO4.find((t) => t.id === idTransformacion);

  const rechazo = (motivo: string): ResultadoCargue => ({
    archivo: nombreOriginal,
    aceptado: false,
    motivo,
    transformacion: transformacion?.id ?? null,
    etiqueta: transformacion?.etiqueta ?? null,
    respuestas: null,
    descartadas: null,
    descartadasPorFecha: null,
    sinRespuesta: null,
    reemplazo: null,
  });

  if (!transformacion) {
    return rechazo("No se indicó a qué transformación corresponde el documento.");
  }

  const lectura = leerDocumentoMomento4(nombreOriginal, contenido);
  if (!lectura.ok) return rechazo(lectura.motivo);

  try {
    // Qué había antes, para poder decir a qué documento sustituyó.
    const previo = await sql`
      select archivo from momento4_documentos where transformacion = ${transformacion.id}
    `;

    // Todo en una transacción: o queda el documento nuevo entero, o se queda el
    // anterior. Nunca una mezcla de los dos.
    await sql.transaction((txn) => [
      // El documento va primero: las respuestas lo referencian por clave
      // foránea, así que insertarlas antes fallaría en el primer cargue.
      txn`
        insert into momento4_documentos (transformacion, etiqueta, archivo, respuestas, actualizado)
        values (${transformacion.id}, ${transformacion.etiqueta}, ${nombreOriginal},
                ${lectura.respuestas.length}, now())
        on conflict (transformacion) do update
          set etiqueta = excluded.etiqueta,
              archivo = excluded.archivo,
              respuestas = excluded.respuestas,
              actualizado = now()
      `,
      // Reemplazo, no acumulación: se borran las respuestas anteriores de esta
      // transformación antes de insertar las nuevas.
      txn`delete from momento4_respuestas where transformacion = ${transformacion.id}`,
      ...sentenciasDeInsercion(lectura.respuestas, transformacion.id).map(({ texto, parametros }) =>
        txn.query(texto, parametros)
      ),
    ]);

    // Los grupos temáticos se rehacen con el conjunto ya actualizado: si se
    // calcularan antes, no incluirían lo que se acaba de cargar.
    await reclasificarComentarios(sql);

    const anterior = (previo[0]?.archivo as string | undefined) ?? null;
    const avisos = avisosDeLectura(lectura);

    // Con cero guardadas, "0 respuesta(s) guardadas" suena a fallo cuando en
    // realidad el archivo se procesó bien: solo no traía nada nuevo.
    const resumen =
      lectura.respuestas.length === 0
        ? `Archivo aceptado en ${transformacion.etiqueta}, sin respuestas nuevas que guardar.${avisos}`
        : `Cargado en ${transformacion.etiqueta} · ${lectura.respuestas.length} respuesta(s) guardadas en la base de datos.${avisos}`;

    return {
      archivo: nombreOriginal,
      aceptado: true,
      motivo: resumen,
      transformacion: transformacion.id,
      etiqueta: transformacion.etiqueta,
      respuestas: lectura.respuestas.length,
      descartadas: lectura.descartadas,
      descartadasPorFecha: lectura.descartadasPorFecha,
      sinRespuesta: lectura.sinRespuesta,
      reemplazo: anterior !== nombreOriginal ? anterior : null,
    };
  } catch (error) {
    return rechazo(
      `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`
    );
  }
}

/**
 * Lo que la verificación del archivo dejó fuera, en el texto que se muestra
 * tras el cargue. Es igual en Reemplazar y en Actualizar porque las dos pasan
 * por la misma lectura.
 */
function avisosDeLectura(lectura: {
  descartadas: number;
  descartadasPorFecha: number;
  sinRespuesta: number;
}): string {
  const corte = FECHA_MINIMA_RESPUESTA.toLocaleDateString("es-CO");
  const anteriores =
    lectura.descartadasPorFecha > 0
      ? ` Quedaron fuera ${lectura.descartadasPorFecha} por ser anteriores al ${corte}.`
      : "";
  const vacias =
    lectura.sinRespuesta > 0
      ? ` Se descartaron ${lectura.sinRespuesta} sin ninguna respuesta (solo correo y fecha).`
      : "";
  const repetidas =
    lectura.descartadas > 0
      ? ` Se descartaron ${lectura.descartadas} por repetir correo y rol dentro del archivo (se conservó la más reciente de cada persona en cada rol; quien tiene varios roles cuenta una vez por cada uno).`
      : "";
  return `${anteriores}${vacias}${repetidas}`;
}

/**
 * Actualiza una transformación con un export nuevo SIN sobrescribir lo que ya
 * estaba: el export de Forms es acumulativo, así que se agregan solo las
 * respuestas cuyo ID todavía no está guardado (ver `calcularActualizacion`).
 * Pasa por la misma lectura y verificación que Reemplazar. Nunca lanza.
 */
export async function actualizarDocumento(
  sql: Sql,
  idTransformacion: string,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargue> {
  const transformacion = TRANSFORMACIONES_MOMENTO4.find((t) => t.id === idTransformacion);

  const rechazo = (motivo: string): ResultadoCargue => ({
    archivo: nombreOriginal,
    aceptado: false,
    motivo,
    transformacion: transformacion?.id ?? null,
    etiqueta: transformacion?.etiqueta ?? null,
    respuestas: null,
    descartadas: null,
    descartadasPorFecha: null,
    sinRespuesta: null,
    reemplazo: null,
  });

  if (!transformacion) {
    return rechazo("No se indicó a qué transformación corresponde el documento.");
  }

  const lectura = leerDocumentoMomento4(nombreOriginal, contenido);
  if (!lectura.ok) return rechazo(lectura.motivo);

  try {
    const guardadas = await sql`
      select id, respuesta_id, correo, tipo_actor
      from momento4_respuestas
      where transformacion = ${transformacion.id}
    `;
    const existentes = guardadas.map((f) => ({
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

    // Si ya hay respuestas y el archivo no comparte NINGÚN ID con ellas, lo más
    // probable es que sea el export de otra transformación: agregarlo
    // mezclaría dos formularios. Si de verdad es el archivo correcto, Reemplazar
    // lo deja como único contenido.
    if (existentes.length > 0 && delArchivo.length > 0 && plan.sinCambios === 0) {
      return rechazo(
        `Ninguna respuesta del archivo coincide con las ${existentes.length} ya cargadas en ${transformacion.etiqueta}: no parece ser el export de esta transformación. Si es el archivo correcto, usa Reemplazar.`
      );
    }

    const total = existentes.length - plan.sustituidas.length + plan.nuevas.length;
    const avisos = avisosDeLectura(lectura);
    const detalles = [
      plan.sustituidas.length > 0
        ? ` ${plan.sustituidas.length} reemplazaron la respuesta anterior de la misma persona (se conserva la más reciente).`
        : "",
      plan.masAntiguas > 0
        ? ` ${plan.masAntiguas} no se agregaron porque esa persona ya tenía una respuesta más reciente cargada.`
        : "",
      plan.sinId > 0 ? ` ${plan.sinId} sin ID de Forms no se agregaron.` : "",
    ].join("");

    const resultado = (motivo: string): ResultadoCargue => ({
      archivo: nombreOriginal,
      aceptado: true,
      motivo,
      transformacion: transformacion.id,
      etiqueta: transformacion.etiqueta,
      respuestas: total,
      descartadas: lectura.descartadas,
      descartadasPorFecha: lectura.descartadasPorFecha,
      sinRespuesta: lectura.sinRespuesta,
      reemplazo: null,
    });

    // Nada nuevo: no se escribe ni se reclasifica. Es el caso de subir dos
    // veces el mismo export, y debe ser instantáneo.
    if (plan.nuevas.length === 0 && plan.sustituidas.length === 0) {
      return resultado(
        `${transformacion.etiqueta} ya estaba al día: las ${plan.sinCambios} respuesta(s) del archivo ya estaban cargadas y no se cambió nada.${detalles}${avisos}`
      );
    }

    const idsSustituidos = plan.sustituidas.map((s) => s.id);
    await sql.transaction((txn) => [
      txn`
        insert into momento4_documentos (transformacion, etiqueta, archivo, respuestas, actualizado)
        values (${transformacion.id}, ${transformacion.etiqueta}, ${nombreOriginal}, ${total}, now())
        on conflict (transformacion) do update
          set etiqueta = excluded.etiqueta,
              archivo = excluded.archivo,
              respuestas = excluded.respuestas,
              actualizado = now()
      `,
      ...(idsSustituidos.length
        ? [txn`delete from momento4_respuestas where id = any(${idsSustituidos}::bigint[])`]
        : []),
      ...sentenciasDeInsercion(
        plan.nuevas.map((n) => n.fila),
        transformacion.id
      ).map(({ texto, parametros }) => txn.query(texto, parametros)),
    ]);

    // Entraron comentarios nuevos: los grupos salen del conjunto completo.
    await reclasificarComentarios(sql);

    return resultado(
      `Actualizado ${transformacion.etiqueta} · ${plan.nuevas.length} respuesta(s) nuevas agregadas; ${plan.sinCambios} ya estaban y no se tocaron. Total: ${total}.${detalles}${avisos}`
    );
  } catch (error) {
    return rechazo(
      `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`
    );
  }
}

/** Parte las respuestas en sentencias INSERT de a `FILAS_POR_SENTENCIA`. */
function sentenciasDeInsercion(
  respuestas: FilaExcelMomento4[],
  idTransformacion: string
): { texto: string; parametros: unknown[] }[] {
  const columnas = ["transformacion", ...COLUMNAS.map((c) => c.sql)];
  const sentencias: { texto: string; parametros: unknown[] }[] = [];

  for (let inicio = 0; inicio < respuestas.length; inicio += FILAS_POR_SENTENCIA) {
    const lote = respuestas.slice(inicio, inicio + FILAS_POR_SENTENCIA);
    const parametros: unknown[] = [];
    const grupos = lote.map((respuesta) => {
      const marcadores = columnas.map((_, i) => `$${parametros.length + i + 1}`);
      parametros.push(idTransformacion, ...COLUMNAS.map((c) => respuesta[c.campo]));
      return `(${marcadores.join(", ")})`;
    });
    sentencias.push({
      texto: `insert into momento4_respuestas (${columnas.join(", ")}) values ${grupos.join(", ")}`,
      parametros,
    });
  }

  return sentencias;
}
