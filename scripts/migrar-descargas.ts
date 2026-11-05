/**
 * Crea (si no existe) el registro de descargas en Excel. Se ejecuta a mano
 * —`pnpm migrar:descargas`— y es idempotente.
 *
 * Una fila por petición de descarga, entregada o rechazada: sirve a la vez para
 * hacer cumplir los límites (cuántas lleva un visitante y el sitio en la
 * ventana) y para auditar el uso desde /admin. No guarda la IP: guarda un HMAC
 * de ella, que permite contar por visitante sin poder volver a la dirección.
 */
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";
import { cargarEntorno } from "./entorno";

async function main() {
  cargarEntorno();
  const sql = conexionSql({ directa: true });

  await sql`
    create table if not exists descargas_registro (
      id bigserial primary key,
      seccion text not null,
      ip_hash text not null,
      resultado text not null,
      bytes integer,
      milisegundos integer,
      desde_cache boolean not null default false,
      creado_en timestamptz not null default now()
    )
  `;
  // Los dos conteos de los límites filtran por fecha, y el del visitante
  // además por su hash: sin estos índices cada descarga recorrería la tabla.
  await sql`create index if not exists descargas_registro_fecha_idx on descargas_registro (creado_en)`;
  await sql`create index if not exists descargas_registro_visitante_idx on descargas_registro (ip_hash, creado_en)`;

  const columnas = await sql`
    select column_name, data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'descargas_registro'
    order by ordinal_position
  `;
  console.log("\ndescargas_registro");
  for (const c of columnas) console.log(`  · ${c.column_name} (${c.data_type})`);
}

main().catch((error) => {
  console.error("Falló la migración:", error);
  process.exit(1);
});
