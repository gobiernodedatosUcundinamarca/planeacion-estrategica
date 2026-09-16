import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  DocumentoParticipacion,
  ModoCargueParticipacion,
  RegistroParticipacion,
  ResultadoCargueParticipacion,
} from "@/types/participacion";
import { CAMPOS_PARTICIPACION } from "@/lib/reglas/participacion";
import { leerParticipacion, interpretarFilaParticipacion } from "./participacion-formato";

/**
 * Lectura y escritura de las tandas de asistencia en Postgres.
 *
 * Sin "server-only" a propósito, igual que `momento4-almacen.ts`: el script
 * de migración necesita poder ejecutarse con Node directo.
 */

type Sql = NeonQueryFunction<false, false>;

const COLUMNAS = [
  "documento_id",
  "fecha_inicio",
  "nombre_asistente",
  "edad",
  "rol",
  "codigo_estudiante",
  "programa_estudiante",
  "unidad_estudiante",
  "coordinacion_docente",
  "unidad_docente",
  "facultad_docente",
  "area_trabajador",
  "unidad_trabajador",
  // Se guarda pero no se publica: `consultarRegistros` no la lee de vuelta.
  "cedula",
] as const;

/** Filas por sentencia INSERT, con el mismo margen que el Momento 4 (ver ahí el porqué). */
const FILAS_POR_SENTENCIA = 1000;

/** Las tandas de asistencia cargadas, de la más reciente a la más antigua. */
export async function consultarDocumentos(sql: Sql): Promise<DocumentoParticipacion[]> {
  const filas = await sql`
    select id, archivo, filas, cargado_en
    from participacion_documentos
    order by cargado_en desc, id desc
  `;
  return filas.map((f) => ({
    id: Number(f.id),
    archivo: f.archivo as string,
    filas: Number(f.filas),
    cargadoEn: new Date(f.cargado_en as string).toISOString(),
  }));
}

/** Todos los registros de asistencia publicados, de todas las tandas. */
export async function consultarRegistros(sql: Sql): Promise<RegistroParticipacion[]> {
  // La cédula (columna `cedula`) NO se selecciona a propósito: este resultado
  // se publica en el dashboard, y la cédula se guarda solo para trazabilidad
  // interna, nunca para mostrarse. Dejarla fuera del SELECT es lo que impide
  // que llegue al cliente.
  const filas = await sql`
    select id, documento_id, fecha_inicio, lugar_desarrollo, nombre_asistente, edad, rol,
           codigo_estudiante, programa_estudiante, unidad_estudiante,
           coordinacion_docente, unidad_docente, facultad_docente,
           area_trabajador, unidad_trabajador
    from participacion_registros
    order by fecha_inicio nulls last, id
  `;
  return filas.map((f) => ({
    id: Number(f.id),
    documentoId: Number(f.documento_id),
    fechaInicio: aFechaISO(f.fecha_inicio),
    lugarDesarrollo: (f.lugar_desarrollo as string | null) ?? null,
    nombreAsistente: (f.nombre_asistente as string | null) ?? null,
    edad: f.edad === null ? null : Number(f.edad),
    rol: (f.rol as string | null) ?? null,
    codigoEstudiante: (f.codigo_estudiante as string | null) ?? null,
    programaEstudiante: (f.programa_estudiante as string | null) ?? null,
    unidadEstudiante: (f.unidad_estudiante as string | null) ?? null,
    coordinacionDocente: (f.coordinacion_docente as string | null) ?? null,
    unidadDocente: (f.unidad_docente as string | null) ?? null,
    facultadDocente: (f.facultad_docente as string | null) ?? null,
    areaTrabajador: (f.area_trabajador as string | null) ?? null,
    unidadTrabajador: (f.unidad_trabajador as string | null) ?? null,
  }));
}

/**
 * Una columna `date` a la cadena "aaaa-mm-dd" que declara el tipo de dominio.
 *
 * No basta con `String(valor)`: el driver devuelve un `Date` de JavaScript y
 * convertirlo así da "Sat Aug 15 2026 00:00:00 GMT-0500", que la vista no
 * puede volver a interpretar —`new Date("Sat Aug…T12:00:00")` es Invalid
 * Date— y deja la tabla y el gráfico sin fecha. Tampoco sirve `toISOString`:
 * ese Date es la medianoche LOCAL, así que en una zona al oeste de UTC la
 * parte de fecha en UTC cae en el día anterior y toda la serie se correría un
 * día. Por eso se leen los componentes locales.
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
 * Valida el Excel y lo guarda, con lo anterior o en su lugar según `modo`.
 *
 * - `anexar`: el archivo entra como una tanda más y se suma a las que ya
 *   estaban. Es lo que se usa cuando ocurre un evento nuevo.
 * - `reemplazar`: el archivo queda como único contenido de la sección. Es la
 *   salida cuando hay que corregir un cargue —resubir el mismo archivo sin
 *   duplicar registros— o rehacer el acumulado desde cero.
 *
 * Cuál de los dos aplica no lo decide el código: lo elige quien sube.
 */
export async function guardarDocumento(
  sql: Sql,
  nombreOriginal: string,
  contenido: Buffer,
  modo: ModoCargueParticipacion = "anexar"
): Promise<ResultadoCargueParticipacion> {
  const rechazo = (motivo: string): ResultadoCargueParticipacion => ({
    archivo: nombreOriginal,
    aceptado: false,
    motivo,
    filas: null,
    columnasReconocidas: null,
  });

  const lectura = leerParticipacion(nombreOriginal, contenido);
  if (!lectura.ok) return rechazo(lectura.motivo);

  const registros = lectura.filas.map(interpretarFilaParticipacion);

  try {
    const [documento] = await sql`
      insert into participacion_documentos (archivo, filas, cargado_en)
      values (${nombreOriginal}, ${registros.length}, now())
      returning id
    `;
    const documentoId = Number(documento.id);

    try {
      await sql.transaction((txn) => [
        ...sentenciasDeInsercion(registros, documentoId).map(({ texto, parametros }) =>
          txn.query(texto, parametros)
        ),
        // Al reemplazar, el borrado de lo anterior va DESPUÉS de insertar lo
        // nuevo y dentro de la misma transacción: si algo falla, no se ha
        // perdido nada y la sección sigue mostrando lo que ya tenía. Borrar
        // primero la dejaría vacía ante cualquier error de la base.
        // Los registros se van solos con su documento (on delete cascade).
        ...(modo === "reemplazar"
          ? [txn`delete from participacion_documentos where id <> ${documentoId}`]
          : []),
      ]);
    } catch (error) {
      // La fila del documento se insertó fuera de la transacción, así que un
      // fallo aquí dejaría una tanda anunciando registros que no existen.
      await sql`delete from participacion_documentos where id = ${documentoId}`;
      throw error;
    }

    const efecto =
      modo === "reemplazar"
        ? " Reemplaza todo lo que hubiera antes en la sección."
        : " Se suma a lo que ya estaba cargado.";

    return {
      archivo: nombreOriginal,
      aceptado: true,
      motivo: `Cargado · ${registros.length} registro(s) guardados, con ${lectura.columnasReconocidas} de las ${CAMPOS_PARTICIPACION.length} columnas del formato reconocidas.${efecto}`,
      filas: registros.length,
      columnasReconocidas: lectura.columnasReconocidas,
    };
  } catch (error) {
    return rechazo(
      `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`
    );
  }
}

/**
 * Borra una tanda de asistencia, o todas si no se indica cuál. Se borran
 * FILAS, nunca tablas (ver el mismo criterio en `momento4-almacen.ts`).
 */
export async function eliminarRegistros(sql: Sql, documentoId: number | null): Promise<number> {
  if (documentoId !== null) {
    const [borrados] = await sql.transaction((txn) => [
      txn`delete from participacion_registros where documento_id = ${documentoId} returning id`,
      txn`delete from participacion_documentos where id = ${documentoId}`,
    ]);
    return borrados.length;
  }

  const [borrados] = await sql.transaction((txn) => [
    txn`delete from participacion_registros returning id`,
    txn`delete from participacion_documentos returning id`,
  ]);
  return borrados.length;
}

/** Parte los registros en sentencias INSERT de a `FILAS_POR_SENTENCIA`. */
function sentenciasDeInsercion(
  registros: ReturnType<typeof interpretarFilaParticipacion>[],
  documentoId: number
): { texto: string; parametros: unknown[] }[] {
  const sentencias: { texto: string; parametros: unknown[] }[] = [];

  for (let inicio = 0; inicio < registros.length; inicio += FILAS_POR_SENTENCIA) {
    const lote = registros.slice(inicio, inicio + FILAS_POR_SENTENCIA);
    const parametros: unknown[] = [];
    const grupos = lote.map((registro) => {
      const valores = [
        documentoId,
        registro.fechaInicio,
        registro.nombreAsistente,
        registro.edad,
        registro.rol,
        registro.codigoEstudiante,
        registro.programaEstudiante,
        registro.unidadEstudiante,
        registro.coordinacionDocente,
        registro.unidadDocente,
        registro.facultadDocente,
        registro.areaTrabajador,
        registro.unidadTrabajador,
        registro.cedula,
      ];
      const marcadores = valores.map((_, i) => `$${parametros.length + i + 1}`);
      parametros.push(...valores);
      return `(${marcadores.join(", ")})`;
    });
    sentencias.push({
      texto: `insert into participacion_registros (${COLUMNAS.join(", ")}) values ${grupos.join(", ")}`,
      parametros,
    });
  }

  return sentencias;
}
