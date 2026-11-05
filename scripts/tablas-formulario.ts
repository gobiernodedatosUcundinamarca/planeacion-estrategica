/**
 * Crea (si no existen) las dos tablas de un formulario de Forms que se carga
 * como un solo documento, con exactamente las columnas de su definición
 * (`formularios-definicion.ts`). Lo usan `migrar-valoracion-territorio.ts` y
 * `migrar-ia-administrativos.ts`; es idempotente, como las demás migraciones.
 *
 * - `<formulario>_documento`: una sola fila (id = 1) con el archivo vigente. El
 *   export de Forms es acumulativo, así que no hay tandas que guardar.
 * - `<formulario>_respuestas`: una fila por respuesta. Todo es texto salvo la
 *   fecha: las respuestas se guardan tal como las escribió la gente y se
 *   interpretan al mostrarlas, para que corregir un criterio no obligue a
 *   volver a cargar.
 */
import type { DefinicionFormulario } from "@/repositories/datasource/formularios-definicion";
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";
import { cargarEntorno } from "./entorno";

export async function crearTablasFormulario<C extends string>(
  definicion: DefinicionFormulario<C>
): Promise<void> {
  cargarEntorno();
  const sql = conexionSql({ directa: true });
  const { tablaDocumento, tablaRespuestas } = definicion;

  await sql.query(`
    create table if not exists ${tablaDocumento} (
      id integer primary key default 1,
      archivo text not null,
      respuestas integer not null default 0,
      actualizado timestamptz not null default now(),
      constraint ${tablaDocumento}_unico check (id = 1)
    )
  `);

  await sql.query(`
    create table if not exists ${tablaRespuestas} (
      id bigserial primary key,
      respuesta_id text,
      fecha_respuesta date,
      ${definicion.columnas.map((c) => `${c.columnaBd} text`).join(",\n      ")},
      actualizado timestamptz not null default now()
    )
  `);

  // Una pregunta agregada después a la definición: se suma sin tocar lo cargado.
  for (const { columnaBd } of definicion.columnas) {
    await sql.query(`alter table ${tablaRespuestas} add column if not exists ${columnaBd} text`);
  }

  const columnas = await sql.query(
    `select table_name, column_name, data_type
     from information_schema.columns
     where table_schema = 'public' and table_name in ($1, $2)
     order by table_name, ordinal_position`,
    [tablaDocumento, tablaRespuestas]
  );

  let tablaActual = "";
  for (const columna of columnas) {
    if (columna.table_name !== tablaActual) {
      tablaActual = columna.table_name as string;
      console.log(`\n${tablaActual}`);
    }
    console.log(`  · ${columna.column_name} (${columna.data_type})`);
  }
}
