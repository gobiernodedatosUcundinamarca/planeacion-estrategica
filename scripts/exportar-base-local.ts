import { rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { cargarEntorno } from "./entorno";

/**
 * Copia la base publicada a una base PGlite local para el ejecutable portable:
 * esquemas, tablas, datos, restricciones, índices y secuencias. Con un segundo
 * argumento escribe también los textos editoriales vigentes en ese JSON.
 *
 *   tsx scripts/exportar-base-local.ts <directorio-base> [contenido-inicial.json]
 */
const ESQUEMAS = ["public", "editorial"];
const LOTE = 2000;

async function main() {
  cargarEntorno();
  const [destinoArg, contenidoArg] = process.argv.slice(2);
  if (!destinoArg) throw Error("Indica el directorio de destino.");
  const cadena = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!cadena) throw Error("Falta DATABASE_URL.");

  const origen = neon(cadena);
  const destino = resolve(destinoArg);
  await rm(destino, { recursive: true, force: true });
  const local = await PGlite.create(destino);

  for (const esquema of ESQUEMAS) await local.exec(`create schema if not exists "${esquema}"`);

  const secuencias = await origen`
    select schemaname as esquema, sequencename as nombre, last_value, data_type
    from pg_sequences where schemaname = any(${ESQUEMAS})`;
  for (const s of secuencias) await local.exec(`create sequence "${s.esquema}"."${s.nombre}" as ${s.data_type}`);

  const tablas = await origen`
    select n.nspname as esquema, c.relname as nombre, c.oid::int as oid
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r' and n.nspname = any(${ESQUEMAS}) order by 1, 2`;

  const conteos: Record<string, number> = {};
  for (const t of tablas) {
    const columnas = await origen`
      select a.attname as nombre, format_type(a.atttypid, a.atttypmod) as tipo, a.attnotnull as obligatorio,
             pg_get_expr(d.adbin, d.adrelid) as defecto
      from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = ${t.oid} and a.attnum > 0 and not a.attisdropped order by a.attnum`;
    const definicion = columnas
      .map((c) => `"${c.nombre}" ${c.tipo}${c.defecto ? ` default ${c.defecto}` : ""}${c.obligatorio ? " not null" : ""}`)
      .join(", ");
    const tabla = `"${t.esquema}"."${t.nombre}"`;
    await local.exec(`create table ${tabla} (${definicion})`);

    const filas = await origen.query(`select to_jsonb(t) as f from ${tabla} t`);
    for (let i = 0; i < filas.length; i += LOTE) {
      const lote = JSON.stringify(filas.slice(i, i + LOTE).map((r) => r.f));
      await local.query(`insert into ${tabla} select * from jsonb_populate_recordset(null::${tabla}, $1::jsonb)`, [lote]);
    }
    conteos[tabla] = filas.length;
  }

  const restricciones = await origen`
    select n.nspname as esquema, c.relname as tabla, k.conname as nombre, pg_get_constraintdef(k.oid) as definicion
    from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any(${ESQUEMAS}) and k.contype in ('p', 'u', 'c', 'f')
    order by case k.contype when 'f' then 1 else 0 end, 1, 2, 3`;
  for (const r of restricciones)
    await local.exec(`alter table "${r.esquema}"."${r.tabla}" add constraint "${r.nombre}" ${r.definicion}`);

  const indices = await origen`
    select i.indexdef as definicion from pg_indexes i
    where i.schemaname = any(${ESQUEMAS})
      and not exists (select 1 from pg_constraint k where k.conname = i.indexname)`;
  for (const i of indices) await local.exec(i.definicion);

  for (const s of secuencias)
    if (s.last_value !== null)
      await local.query(`select setval('"${s.esquema}"."${s.nombre}"', $1)`, [String(s.last_value)]);

  for (const [tabla, esperado] of Object.entries(conteos)) {
    const [{ n }] = (await local.query<{ n: number }>(`select count(*)::int as n from ${tabla}`)).rows;
    if (n !== esperado) throw Error(`Conteo distinto en ${tabla}: ${n} de ${esperado}.`);
  }

  if (contenidoArg) {
    const [estado] = await origen`select revision, textos from editorial.editorial_estado where id = 1`;
    if (estado) {
      const contenido = { revision: Number(estado.revision), textos: estado.textos };
      await writeFile(resolve(contenidoArg), JSON.stringify(contenido, null, 2) + "\n", "utf8");
    }
  }

  await local.close();
  const total = Object.values(conteos).reduce((a, b) => a + b, 0);
  console.log(`Base local lista: ${tablas.length} tablas, ${total} filas.`);
}

main().catch((error) => {
  console.error("No se pudo exportar la base local:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
