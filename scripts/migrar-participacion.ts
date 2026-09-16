/**
 * Crea (si no existen) las tablas de Participación en Neon.
 *
 * Se ejecuta a mano —`pnpm migrar:participacion`— y es idempotente, igual que
 * `migrar-momento4.ts`.
 *
 * Dos tablas: `participacion_documentos` registra cada tanda de asistencia
 * cargada (una fila por archivo subido) y `participacion_registros` guarda a
 * los asistentes de cada tanda. A diferencia del Momento 4, un cargue nuevo
 * no reemplaza una casilla fija: agrega una tanda más, porque el objetivo es
 * el seguimiento de la participación a través de varios eventos.
 */
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";
import { cargarEntorno } from "./entorno";

async function main() {
  cargarEntorno();
  const sql = conexionSql({ directa: true });

  await sql`
    create table if not exists participacion_documentos (
      id bigserial primary key,
      archivo text not null,
      filas integer not null default 0,
      cargado_en timestamptz not null default now()
    )
  `;

  await sql`
    create table if not exists participacion_registros (
      id bigserial primary key,
      documento_id bigint not null
        references participacion_documentos(id) on delete cascade,
      fecha_inicio date,
      nombre_asistente text,
      edad integer,
      rol text,
      codigo_estudiante text,
      programa_estudiante text,
      unidad_estudiante text,
      coordinacion_docente text,
      unidad_docente text,
      facultad_docente text,
      area_trabajador text,
      unidad_trabajador text,
      actualizado timestamptz not null default now()
    )
  `;

  // Columnas agregadas después del diseño inicial (idempotente):
  //  · lugar_desarrollo: la ciudad donde se hizo el evento (Ubaté, Zipaquirá,
  //    Girardot, Soacha…). Es distinta de la unidad regional del asistente —esa
  //    es su sede de origen— y se asigna al cargar la tanda, no viene del Excel.
  //  · cedula: se conserva para trazabilidad, pero NUNCA se publica en el
  //    dashboard (consultarRegistros no la selecciona y no está en el tipo
  //    RegistroParticipacion, así que no viaja al cliente).
  await sql`alter table participacion_registros add column if not exists lugar_desarrollo text`;
  await sql`alter table participacion_registros add column if not exists cedula text`;

  await sql`
    create index if not exists participacion_registros_documento_idx
      on participacion_registros (documento_id)
  `;
  await sql`
    create index if not exists participacion_registros_lugar_idx
      on participacion_registros (lugar_desarrollo)
  `;
  await sql`
    create index if not exists participacion_registros_fecha_idx
      on participacion_registros (fecha_inicio)
  `;
  await sql`
    create index if not exists participacion_registros_rol_idx
      on participacion_registros (rol)
  `;

  const columnas = await sql`
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name like 'participacion_%'
    order by table_name, ordinal_position
  `;

  let tablaActual = "";
  for (const columna of columnas) {
    if (columna.table_name !== tablaActual) {
      tablaActual = columna.table_name as string;
      console.log(`\n${tablaActual}`);
    }
    console.log(`  · ${columna.column_name} (${columna.data_type})`);
  }
}

main().catch((error) => {
  console.error("Falló la migración:", error);
  process.exit(1);
});
