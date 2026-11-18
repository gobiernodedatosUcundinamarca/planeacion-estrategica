import test from "node:test";
import assert from "node:assert/strict";
import {
  margenErrorCon,
  muestraPoblacionFinita,
  muestraPoblacionInfinita,
  muestraRequerida,
  nivelDeLectura,
} from "@/lib/reglas/nota-metodologica";
import type { ParametrosMuestreo } from "@/types/nota-metodologica";

// Los parámetros de la hoja «Metodología» del diseño muestral.
const parametros: ParametrosMuestreo = { confianza: 0.95, z: 1.96, proporcion: 0.5, margenError: 0.05, umbralCenso: 100 };

test("el punto de partida es 384,16 para cualquier estrato", () => {
  assert.ok(Math.abs(muestraPoblacionInfinita(parametros) - 384.16) < 1e-9);
});

test("estudiantes de Fusagasugá: de 3.637 personas a una muestra de 348", () => {
  assert.ok(Math.abs(muestraPoblacionFinita(3637, parametros) - 347.5458) < 1e-4);
  assert.equal(muestraRequerida(3637, parametros), 348);
});

test("Facatativá: la fórmula pedía 339 estudiantes y 366 graduados antes del tope de 200", () => {
  assert.equal(muestraRequerida(2863, parametros), 339);
  assert.equal(muestraRequerida(7535, parametros), 366);
  assert.ok(Math.abs(margenErrorCon(2863, 200, parametros) - 0.066844) < 1e-6);
  assert.ok(Math.abs(margenErrorCon(7535, 200, parametros) - 0.068375) < 1e-6);
});

test("un grupo de 100 personas o menos se convoca completo aunque la fórmula pida menos", () => {
  assert.equal(muestraRequerida(74, parametros), 74);
  assert.equal(Math.ceil(muestraPoblacionFinita(74, parametros)), 63);
  assert.equal(muestraRequerida(101, parametros), 81);
});

test("con todo el grupo presente el margen es cero", () => {
  assert.equal(margenErrorCon(46, 46, parametros), 0);
  assert.equal(margenErrorCon(46, 56, parametros), 0);
});

test("la lectura del Excel se clasifica en tres niveles", () => {
  assert.equal(nivelDeLectura("Cumple ±5 %"), "cumple");
  assert.equal(nivelDeLectura("Precisión moderada (≤ ±10 %)"), "moderada");
  assert.equal(nivelDeLectura("Leer con cautela (> ±10 %)"), "cautela");
});
