/**
 * Carga de jornadas de Participación en Neon, por el MISMO camino del sitio
 * (`guardarDocumento`): reconocimiento por nombre de columna, anonimización y
 * cédula guardada sin publicar. Reemplaza los `scripts/__anexar-*.ts` que se
 * reescribían en cada jornada.
 *
 * Uso (desde la raíz del repo):
 *   pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts estado
 *   pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts revisar <archivo.xlsx> [opciones]
 *   pnpm exec tsx .claude/skills/cargar-participacion/cargar.ts aplicar <archivo.xlsx> [opciones]
 *
 * Opciones:
 *   --lugar "Fusagasugá"                 lugar_desarrollo de toda la tanda
 *   --fecha 2026-09-28                   fija fecha_inicio de toda la tanda
 *   --dividir "TRABAJADOR,PLANTA=2026-09-22"  esos roles van a otra fecha (repetible)
 *   --reemplaza a.xlsx,b.xlsx            otras tandas que esta sustituye
 *
 * `revisar` no escribe nada. `aplicar` inserta la tanda nueva ANTES de borrar
 * las que sustituye (las del mismo nombre de archivo + `--reemplaza`): si algo
 * falla a mitad, se deshace lo nuevo y la sección queda como estaba.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";
import {
  consultarDocumentos,
  eliminarRegistros,
  guardarDocumento,
} from "@/repositories/datasource/participacion-almacen";
import {
  interpretarFilaParticipacion,
  leerParticipacion,
} from "@/repositories/datasource/participacion-formato";
import { normalizar } from "@/lib/reglas/momento4";
import { CAMPOS_PARTICIPACION, estandarizarUnidadRegional } from "@/lib/reglas/participacion";
import { cargarEntorno } from "@/scripts/entorno";

const CARPETA = join("data", "source-participacon-momoento4-planeacion-teritorial");
const SIN = "(sin dato)";

type Sql = ReturnType<typeof conexionSql>;
type Registro = ReturnType<typeof interpretarFilaParticipacion>;
type Division = { roles: Set<string>; fecha: string };

interface Opciones {
  ruta: string;
  nombre: string;
  lugar: string | null;
  fecha: string | null;
  divisiones: Division[];
  reemplaza: string[];
}

function salir(mensaje: string): never {
  console.log(`✗ ${mensaje}`);
  process.exit(1);
}

function validarFecha(valor: string, bandera: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) salir(`${bandera} debe ser AAAA-MM-DD (llegó "${valor}").`);
  return valor;
}

function leerOpciones(argumentos: string[]): Opciones {
  const [archivo, ...resto] = argumentos;
  if (!archivo) salir("Falta el archivo .xlsx.");
  const ruta = existsSync(archivo) ? archivo : join(CARPETA, archivo);
  if (!existsSync(ruta)) salir(`No existe ${archivo} (ni en ${CARPETA}).`);

  const opciones: Opciones = { ruta, nombre: basename(ruta), lugar: null, fecha: null, divisiones: [], reemplaza: [] };
  for (let i = 0; i < resto.length; i += 2) {
    const [bandera, valor] = [resto[i], resto[i + 1]];
    if (valor === undefined) salir(`${bandera} necesita un valor.`);
    if (bandera === "--lugar") opciones.lugar = valor.trim();
    else if (bandera === "--fecha") opciones.fecha = validarFecha(valor, "--fecha");
    else if (bandera === "--reemplaza") opciones.reemplaza.push(...valor.split(",").map((v) => v.trim()).filter(Boolean));
    else if (bandera === "--dividir") {
      const [roles, fecha] = valor.split("=");
      if (!roles || !fecha) salir('--dividir usa el formato "ROL1,ROL2=AAAA-MM-DD".');
      opciones.divisiones.push({
        roles: new Set(roles.split(",").map((r) => normalizar(r)).filter(Boolean)),
        fecha: validarFecha(fecha.trim(), "--dividir"),
      });
    } else salir(`Opción desconocida: ${bandera}`);
  }
  return opciones;
}

/** "a=3, b=1" ordenado de mayor a menor. */
function conteo(valores: (string | null)[], limite = 12): string {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v ?? SIN, (mapa.get(v ?? SIN) ?? 0) + 1);
  const orden = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  const visibles = orden.slice(0, limite).map(([k, n]) => `${k}=${n}`);
  if (orden.length > limite) visibles.push(`… (+${orden.length - limite})`);
  return visibles.join(", ");
}

/** Las cédulas nunca se imprimen completas: el transcript no es lugar para datos personales. */
const enmascarar = (cedula: string) => `…${cedula.slice(-3)}`;

/** Fecha final de cada registro según --fecha y --dividir, igual que la aplicará `aplicar`. */
function fechaFinal(registro: Registro, opciones: Opciones): string | null {
  const rol = registro.rol ? normalizar(registro.rol) : "";
  const division = opciones.divisiones.find((d) => d.roles.has(rol));
  return division?.fecha ?? opciones.fecha ?? registro.fechaInicio;
}

async function estado(sql: Sql) {
  const documentos = await consultarDocumentos(sql);
  const grupos = await sql`
    select documento_id, coalesce(lugar_desarrollo, ${SIN}) as lugar, coalesce(fecha_inicio::text, ${SIN}) as fecha, count(*)::int as n
    from participacion_registros group by 1, 2, 3 order by 1, 3`;
  const [{ total }] = await sql`select count(*)::int as total from participacion_registros`;

  console.log(`Participación: ${documentos.length} tanda(s), ${total} registro(s).`);
  for (const d of [...documentos].sort((a, b) => a.id - b.id)) {
    const detalle = grupos
      .filter((g) => Number(g.documento_id) === d.id)
      .map((g) => `${g.lugar} ${g.fecha}=${g.n}`)
      .join(" · ");
    console.log(`  [${d.id}] ${d.archivo} — ${d.filas} filas — ${detalle}`);
  }
}

async function revisar(sql: Sql, opciones: Opciones, contenido: Buffer) {
  const lectura = leerParticipacion(opciones.nombre, contenido);
  if (!lectura.ok) salir(`El sitio rechazaría el archivo: ${lectura.motivo}`);
  const registros = lectura.filas.map(interpretarFilaParticipacion);

  const reconocidos = new Set(
    CAMPOS_PARTICIPACION.filter(({ campo }) => lectura.filas.some((f) => f[campo] !== null)).map((c) => c.etiqueta)
  );
  const faltan = CAMPOS_PARTICIPACION.map((c) => c.etiqueta).filter((e) => !reconocidos.has(e));

  console.log(`Archivo: ${opciones.nombre} · ${registros.length} filas · ${lectura.columnasReconocidas}/${CAMPOS_PARTICIPACION.length} columnas reconocidas`);
  if (faltan.length) console.log(`  Columnas sin datos o ausentes: ${faltan.join(", ")}`);
  console.log(`Fechas en el Excel: ${conteo(registros.map((r) => r.fechaInicio))}`);
  console.log(`Fechas que quedarán: ${conteo(registros.map((r) => fechaFinal(r, opciones)))}`);
  console.log(`Roles: ${conteo(registros.map((r) => r.rol && normalizar(r.rol)))}`);
  console.log(
    `Unidad regional: ${conteo(registros.map((r) => estandarizarUnidadRegional(r.unidadEstudiante ?? r.unidadDocente ?? r.unidadTrabajador) ?? "Sin especificar"))}`
  );

  // --- Anomalías: se reportan, no se corrigen; decide el usuario. ---
  const anomalias: string[] = [];
  const cedulas = registros.map((r) => r.cedula).filter((c): c is string => c !== null);
  const repeticiones = new Map<string, number>();
  for (const c of cedulas) repeticiones.set(c, (repeticiones.get(c) ?? 0) + 1);
  const repetidas = [...repeticiones.entries()].filter(([, n]) => n > 1);
  const raras = cedulas.filter((c) => !/^\d{5,12}$/.test(c));
  if (registros.length - cedulas.length) anomalias.push(`${registros.length - cedulas.length} fila(s) sin cédula`);
  if (repetidas.length)
    anomalias.push(`${repetidas.length} cédula(s) repetidas dentro del archivo (${repetidas.slice(0, 5).map(([c, n]) => `${enmascarar(c)}×${n}`).join(", ")})`);
  if (raras.length) anomalias.push(`${raras.length} cédula(s) con formato no numérico o de longitud rara`);
  const sinRol = registros.filter((r) => !r.rol).length;
  if (sinRol) anomalias.push(`${sinRol} fila(s) sin rol`);
  const sinEdad = registros.filter((r) => r.edad === null).length;
  const edadRara = registros.filter((r) => r.edad !== null && (r.edad < 14 || r.edad > 90));
  if (sinEdad) anomalias.push(`${sinEdad} fila(s) sin edad`);
  if (edadRara.length) anomalias.push(`${edadRara.length} edad(es) fuera de 14–90 (${edadRara.slice(0, 5).map((r) => r.edad).join(", ")})`);
  const sinFecha = registros.filter((r) => fechaFinal(r, opciones) === null).length;
  if (sinFecha) anomalias.push(`${sinFecha} fila(s) quedarían sin fecha (usa --fecha)`);
  if (!opciones.fecha && new Set(registros.map((r) => r.fechaInicio)).size > 1 && !opciones.divisiones.length)
    anomalias.push("el Excel trae varias fechas y no se fijó --fecha: confirma si es una sola jornada");

  // --- Contra lo que ya está en la base ---
  const documentos = await consultarDocumentos(sql);
  const nombresSustituidos = new Set([opciones.nombre, ...opciones.reemplaza]);
  const sustituidas = documentos.filter((d) => nombresSustituidos.has(d.archivo));
  for (const nombre of opciones.reemplaza)
    if (!documentos.some((d) => d.archivo === nombre)) anomalias.push(`--reemplaza ${nombre}: no hay ninguna tanda con ese nombre`);

  const idsSustituidos = sustituidas.map((d) => d.id);
  const existentes = await sql`
    select cedula, fecha_inicio::text as fecha, rol, lugar_desarrollo as lugar, documento_id
    from participacion_registros`;
  const otras = existentes.filter((e) => !idsSustituidos.includes(Number(e.documento_id)));
  const enOtrasMismaFecha = new Set(
    otras.filter((e) => e.cedula).map((e) => `${e.cedula}|${e.fecha}`)
  );
  const cruces = registros.filter((r) => r.cedula && enOtrasMismaFecha.has(`${r.cedula}|${fechaFinal(r, opciones)}`)).length;
  if (cruces) anomalias.push(`${cruces} asistente(s) ya figuran en OTRA tanda con la misma fecha: posible doble cargue`);

  // Contra TODAS las tandas, incluidas las que se sustituyen: es justo al
  // rehacer una jornada cuando más fácil se escribe distinto ("Chia" / "Chía").
  const lugaresExistentes = [...new Set(existentes.map((e) => e.lugar as string | null).filter((l): l is string => !!l))];
  if (!opciones.lugar) anomalias.push('sin --lugar: la tanda quedará en "Sin especificar" del filtro Lugar de desarrollo');
  else {
    const parecido = lugaresExistentes.find((l) => normalizar(l) === normalizar(opciones.lugar!) && l !== opciones.lugar);
    if (parecido) anomalias.push(`--lugar "${opciones.lugar}" difiere de "${parecido}" ya cargado: usa la misma escritura`);
  }

  console.log(anomalias.length ? `Anomalías:\n  · ${anomalias.join("\n  · ")}` : "Anomalías: ninguna.");

  // --- Plan ---
  const [{ total }] = await sql`select count(*)::int as total from participacion_registros`;
  const quitados = sustituidas.reduce((s, d) => s + d.filas, 0);
  console.log("Plan:");
  if (sustituidas.length) {
    console.log(`  · Sustituye: ${sustituidas.map((d) => `[${d.id}] ${d.archivo} (${d.filas})`).join(", ")}`);
    const rolesAntes = existentes
      .filter((e) => idsSustituidos.includes(Number(e.documento_id)))
      .map((e) => (e.rol ? normalizar(e.rol as string) : SIN));
    console.log(`    roles antes: ${conteo(rolesAntes)}`);
  } else {
    console.log("  · Tanda nueva (no sustituye ninguna).");
  }
  console.log(`  · Lugar: ${opciones.lugar ?? SIN} · fecha: ${opciones.fecha ?? "la del Excel"}${opciones.divisiones.map((d) => ` · ${[...d.roles].join("+")}→${d.fecha}`).join("")}`);
  console.log(`  · Total sección: ${total} → ${total - quitados + registros.length} (${registros.length - quitados >= 0 ? "+" : ""}${registros.length - quitados})`);
  if (lugaresExistentes.length) console.log(`  · Lugares ya cargados: ${lugaresExistentes.join(", ")}`);

  return { registros, sustituidas };
}

async function aplicar(sql: Sql, opciones: Opciones, contenido: Buffer) {
  const { sustituidas } = await revisar(sql, opciones, contenido);
  console.log("\nAplicando…");

  const resultado = await guardarDocumento(sql, opciones.nombre, contenido, "anexar");
  if (!resultado.aceptado) salir(`Rechazado, no se cambió nada: ${resultado.motivo}`);
  const [documento] = await sql`
    select id from participacion_documentos where archivo = ${opciones.nombre} order by id desc limit 1`;
  const id = Number(documento.id);

  // Fecha de la tanda = la jornada (la última, si se divide), no el momento del cargue.
  const fechas = [opciones.fecha, ...opciones.divisiones.map((d) => d.fecha)].filter((f): f is string => !!f).sort();
  const ajustes = [
    ...(opciones.lugar ? [sql`update participacion_registros set lugar_desarrollo = ${opciones.lugar} where documento_id = ${id}`] : []),
    ...(opciones.fecha ? [sql`update participacion_registros set fecha_inicio = ${opciones.fecha}::date where documento_id = ${id}`] : []),
    ...opciones.divisiones.map(
      (d) => sql`update participacion_registros set fecha_inicio = ${d.fecha}::date
                 where documento_id = ${id} and upper(trim(rol)) = any(${[...d.roles]})`
    ),
    ...(fechas.length ? [sql`update participacion_documentos set cargado_en = ${fechas.at(-1) + "T12:00:00-05:00"} where id = ${id}`] : []),
  ];

  try {
    if (ajustes.length) await sql.transaction(ajustes);
  } catch (error) {
    await eliminarRegistros(sql, id);
    salir(`Falló al ajustar lugar/fecha; se deshizo la tanda nueva y nada cambió: ${error instanceof Error ? error.message : error}`);
  }
  for (const vieja of sustituidas) await eliminarRegistros(sql, vieja.id);

  console.log(`✓ Tanda [${id}] = ${resultado.filas} filas.${sustituidas.length ? ` Borradas: ${sustituidas.map((d) => `[${d.id}]`).join(", ")}.` : ""}\n`);
  await estado(sql);
}

async function main() {
  const [accion, ...argumentos] = process.argv.slice(2);
  cargarEntorno();
  const sql = conexionSql({ directa: true });

  if (accion === "estado") return estado(sql);
  if (accion !== "revisar" && accion !== "aplicar") salir("Acción: estado | revisar <archivo> | aplicar <archivo>.");

  const opciones = leerOpciones(argumentos);
  const contenido = readFileSync(opciones.ruta);
  if (accion === "revisar") {
    await revisar(sql, opciones, contenido);
    console.log("\n(revisar no escribe nada; para guardar, misma línea con `aplicar`)");
  } else {
    await aplicar(sql, opciones, contenido);
  }
}

main().catch((error) => {
  console.error("Falló:", error);
  process.exit(1);
});
