import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { celdasCombinadas, hojaAMatriz, leerLibro } from "@/repositories/datasource/infrastructure/excel";
import { leerJson } from "@/repositories/datasource/infrastructure/json";
import { interpretarExportacionForms } from "@/repositories/datasource/forms-momento5-formato";
import { normalizarResultadosMomento5 } from "@/repositories/datasource/momento5-formato";
import { HOJA_EXCLUIDOS, hojasDescargaMomento5 } from "@/lib/reglas/momento5-descarga";
import { nombreFormularioDe } from "@/lib/reglas/momento5";

const CARPETA = join(process.cwd(), "data", "forms_momento_5");
const { meta } = normalizarResultadosMomento5(leerJson(join(process.cwd(), "data", "source-momento5-cai", "resultados.json")));
const enviados = readdirSync(CARPETA)
  .filter((a) => a.endsWith(".xlsx"))
  .map((a) => {
    const libro = leerLibro(join(CARPETA, a));
    return interpretarExportacionForms(basename(a, ".xlsx"), hojaAMatriz(libro, null) ?? [], celdasCombinadas(libro, null));
  });
const hojas = hojasDescargaMomento5(meta, enviados);

test("una hoja por formulario, en el orden de aplicación, y la de envíos excluidos al final", () => {
  assert.equal(enviados.length, 5);
  assert.equal(hojas.length, 6);
  assert.equal(hojas.at(-1)?.nombre, HOJA_EXCLUIDOS);
  for (const h of hojas) assert.ok(h.nombre.length <= 31, h.nombre);
  // Cada exportación se reconoce: ningún formulario se queda sin su archivo.
  assert.deepEqual(
    hojas.slice(0, -1).map((h) => h.titulo).sort(),
    meta.formularios.map((f) => f.nombre).sort()
  );
});

test("se quitan exactamente los envíos depurados y quedan los válidos de la página", () => {
  for (const f of meta.formularios) {
    const enviado = enviados.find((e) => nombreFormularioDe(e.archivo, meta.formularios) === f.nombre)!;
    const hoja = hojas.find((h) => h.titulo === f.nombre)!;
    const ids = meta.exclusiones
      .filter((x) => x.id_respuesta !== null && nombreFormularioDe(x.formulario, meta.formularios) === f.nombre)
      .map((x) => String(x.id_respuesta));
    const quedan = hoja.filas.slice(1);
    assert.equal(enviado.filas.length, f.respuestas_originales, `${f.nombre}: envíos del archivo`);
    assert.equal(quedan.length, f.respuestas_validas, `${f.nombre}: envíos tras depurar`);
    for (const id of ids) assert.ok(!quedan.some((fila) => String(fila[enviado.columnaId]) === id), `${f.nombre}: ID ${id}`);
  }
  assert.equal(hojas.at(-1)!.filas.length - 1, meta.exclusiones.length);
});

test("las columnas son las del formulario, con la sección delante en Validación", () => {
  const validacion = enviados.find((e) => /Validaci/.test(e.archivo))!;
  assert.ok(validacion.encabezados.includes("Correo electrónico"));
  assert.ok(validacion.encabezados.some((e) => e.startsWith("3. Transformación: UC Inteligente · Ajuste propuesto al Ámbito 1")));
  assert.ok(validacion.encabezados.some((e) => e.startsWith("3. Transformación: UC para la Vida · Ajuste propuesto al Ámbito 1")));
  for (const e of enviados) {
    assert.equal(e.encabezados[e.columnaId]?.toLowerCase(), "id", e.archivo);
    assert.ok(e.columnasFechaHora.length >= 2, e.archivo);
    for (const c of e.columnasFechaHora) assert.ok(e.filas.every((f) => f[c] === null || typeof f[c] === "number"), `${e.archivo}: ${e.encabezados[c]}`);
  }
});
