import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { DocumentoFormulario, ResultadoCargueFormulario } from "@/types/formularios";
import { calcularActualizacion } from "@/lib/reglas/momento4";
import { leerExportForms, type FilaFormulario } from "./formulario-formato";
import type { DefinicionFormulario } from "./formularios-definicion";

/**
 * Lectura y escritura en Postgres de los formularios que se cargan como un solo
 * documento (valoración de la experiencia en territorio, encuesta de IA a
 * administrativos). Es el mismo ciclo que los aportes generales —Reemplazar,
 * Actualizar sin sobrescribir, Borrar—, escrito una vez y parametrizado por la
 * definición de cada formulario en vez de copiado por cada uno.
 *
 * Los nombres de tabla y de columna van pegados al texto SQL porque Postgres no
 * admite parámetros en identificadores. No es una puerta a inyección: salen
 * solo de `formularios-definicion.ts`, nunca de lo que envía el usuario.
 *
 * Sin "server-only", igual que los demás almacenes.
 */

type Sql = NeonQueryFunction<false, false>;

/** Filas por sentencia INSERT; mismo margen que el resto (ver momento4-almacen). */
const FILAS_POR_SENTENCIA = 500;

/** Una respuesta tal como sale de la base, antes de tiparla por formulario. */
export interface RegistroFormulario<C extends string> {
  id: number;
  fechaRespuesta: string | null;
  valores: Record<C, string | null>;
}

export async function consultarDocumentoFormulario<C extends string>(
  sql: Sql,
  definicion: DefinicionFormulario<C>
): Promise<DocumentoFormulario | null> {
  const filas = await sql.query(
    `select archivo, respuestas, actualizado from ${definicion.tablaDocumento} where id = 1`
  );
  if (filas.length === 0) return null;
  return {
    archivo: filas[0].archivo as string,
    respuestas: Number(filas[0].respuestas),
    actualizado: new Date(filas[0].actualizado as string).toISOString(),
  };
}

/**
 * Todas las respuestas, en orden de ID. El orden no es cosmético: la
 * clasificación por temas arranca eligiendo un primer centro por posición, y
 * sin un orden estable los mismos textos darían temas distintos en cada visita.
 */
export async function consultarRespuestasFormulario<C extends string>(
  sql: Sql,
  definicion: DefinicionFormulario<C>
): Promise<RegistroFormulario<C>[]> {
  const columnas = definicion.columnas.map((c) => c.columnaBd).join(", ");
  const filas = await sql.query(
    `select id, fecha_respuesta, ${columnas} from ${definicion.tablaRespuestas} order by id`
  );
  return filas.map((f) => {
    const valores = {} as Record<C, string | null>;
    for (const { campo, columnaBd } of definicion.columnas) {
      valores[campo] = (f[columnaBd] as string | null) ?? null;
    }
    return { id: Number(f.id), fechaRespuesta: aFechaISO(f.fecha_respuesta), valores };
  });
}

/**
 * Valida el Excel y lo deja como único contenido del formulario. Reemplaza y no
 * acumula porque el export de Forms es acumulativo: cada descarga trae todas
 * las respuestas hasta ese día, y sumarlas duplicaría las anteriores.
 */
export async function guardarFormulario<C extends string>(
  sql: Sql,
  definicion: DefinicionFormulario<C>,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  const lectura = leerExportForms(nombreOriginal, contenido, definicion.columnas);
  if (!lectura.ok) return rechazo(nombreOriginal, lectura.motivo);

  try {
    await sql.transaction((txn) => [
      txn.query(...sentenciaDocumento(definicion, nombreOriginal, lectura.filas.length)),
      txn.query(`delete from ${definicion.tablaRespuestas}`),
      ...sentenciasDeInsercion(definicion, lectura.filas).map(({ texto, parametros }) =>
        txn.query(texto, parametros)
      ),
    ]);
    return {
      archivo: nombreOriginal,
      aceptado: true,
      motivo: `Cargado · ${lectura.filas.length} respuesta(s) guardadas. Reemplaza lo que hubiera antes.`,
      respuestas: lectura.filas.length,
    };
  } catch (error) {
    return rechazo(nombreOriginal, fallaBase(error));
  }
}

/**
 * Agrega solo las respuestas cuyo ID de Forms no está guardado; lo ya cargado
 * no se toca. Misma regla que los aportes y las transformaciones
 * (`calcularActualizacion`). Estos formularios son anónimos —sin correo—, así
 * que la regla de "la misma persona respondió dos veces" no aplica: cada envío
 * cuenta.
 */
export async function actualizarFormulario<C extends string>(
  sql: Sql,
  definicion: DefinicionFormulario<C>,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  const lectura = leerExportForms(nombreOriginal, contenido, definicion.columnas);
  if (!lectura.ok) return rechazo(nombreOriginal, lectura.motivo);

  try {
    const guardados = await sql.query(`select id, respuesta_id from ${definicion.tablaRespuestas}`);
    const existentes = guardados.map((f) => ({
      id: Number(f.id),
      respuestaId: (f.respuesta_id as string | null) ?? null,
      correo: null,
      rol: null,
    }));
    const plan = calcularActualizacion(
      existentes,
      lectura.filas.map((fila) => ({ fila, respuestaId: fila.respuestaId, correo: null, rol: null }))
    );

    if (existentes.length > 0 && lectura.filas.length > 0 && plan.sinCambios === 0) {
      return rechazo(
        nombreOriginal,
        `Ninguna respuesta del archivo coincide con las ${existentes.length} ya cargadas: no parece ser el export de ${definicion.nombre}. Si es el archivo correcto, usa Reemplazar.`
      );
    }

    const total = existentes.length + plan.nuevas.length;
    const sinId = plan.sinId > 0 ? ` ${plan.sinId} sin ID de Forms no se agregaron.` : "";

    if (plan.nuevas.length === 0) {
      return {
        archivo: nombreOriginal,
        aceptado: true,
        motivo: `Ya estaba al día: las ${plan.sinCambios} respuesta(s) del archivo ya estaban cargadas y no se cambió nada.${sinId}`,
        respuestas: total,
      };
    }

    await sql.transaction((txn) => [
      txn.query(...sentenciaDocumento(definicion, nombreOriginal, total)),
      ...sentenciasDeInsercion(
        definicion,
        plan.nuevas.map((n) => n.fila)
      ).map(({ texto, parametros }) => txn.query(texto, parametros)),
    ]);

    return {
      archivo: nombreOriginal,
      aceptado: true,
      motivo: `Actualizado · ${plan.nuevas.length} respuesta(s) nuevas agregadas; ${plan.sinCambios} ya estaban y no se tocaron. Total: ${total}.${sinId}`,
      respuestas: total,
    };
  } catch (error) {
    return rechazo(nombreOriginal, fallaBase(error));
  }
}

/** Borra las respuestas cargadas. Se borran filas, nunca tablas. */
export async function eliminarFormulario<C extends string>(
  sql: Sql,
  definicion: DefinicionFormulario<C>
): Promise<number> {
  const [borradas] = await sql.transaction((txn) => [
    txn.query(`delete from ${definicion.tablaRespuestas} returning id`),
    txn.query(`delete from ${definicion.tablaDocumento}`),
  ]);
  return borradas.length;
}

function sentenciaDocumento<C extends string>(
  definicion: DefinicionFormulario<C>,
  archivo: string,
  respuestas: number
): [string, unknown[]] {
  return [
    `insert into ${definicion.tablaDocumento} (id, archivo, respuestas, actualizado)
     values (1, $1, $2, now())
     on conflict (id) do update
       set archivo = excluded.archivo, respuestas = excluded.respuestas, actualizado = now()`,
    [archivo, respuestas],
  ];
}

/** Parte las filas en sentencias INSERT de a `FILAS_POR_SENTENCIA`. */
function sentenciasDeInsercion<C extends string>(
  definicion: DefinicionFormulario<C>,
  filas: FilaFormulario<C>[]
): { texto: string; parametros: unknown[] }[] {
  const columnas = ["respuesta_id", "fecha_respuesta", ...definicion.columnas.map((c) => c.columnaBd)];
  const sentencias: { texto: string; parametros: unknown[] }[] = [];

  for (let inicio = 0; inicio < filas.length; inicio += FILAS_POR_SENTENCIA) {
    const parametros: unknown[] = [];
    const grupos = filas.slice(inicio, inicio + FILAS_POR_SENTENCIA).map((fila) => {
      const valores = [
        fila.respuestaId,
        fila.fechaRespuesta,
        ...definicion.columnas.map((c) => fila.valores[c.campo]),
      ];
      const marcadores = valores.map((_, i) => `$${parametros.length + i + 1}`);
      parametros.push(...valores);
      return `(${marcadores.join(", ")})`;
    });
    sentencias.push({
      texto: `insert into ${definicion.tablaRespuestas} (${columnas.join(", ")}) values ${grupos.join(", ")}`,
      parametros,
    });
  }

  return sentencias;
}

function rechazo(archivo: string, motivo: string): ResultadoCargueFormulario {
  return { archivo, aceptado: false, motivo, respuestas: null };
}

function fallaBase(error: unknown): string {
  return `El archivo es válido, pero no se pudo guardar en la base de datos: ${error instanceof Error ? error.message : "error desconocido"}`;
}

/**
 * Una columna `date` a "aaaa-mm-dd" con los componentes locales: `toISOString`
 * daría el día anterior al oeste de UTC (ver el mismo criterio en aportes).
 */
function aFechaISO(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
