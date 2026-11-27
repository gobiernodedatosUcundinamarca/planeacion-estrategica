import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import { hojaAMatriz, leerLibro } from "@/repositories/datasource/infrastructure/excel";
import { HOJAS_KAHOOT, interpretarKahoot } from "@/repositories/datasource/momento5-kahoot-formato";

const dir = join(process.cwd(), "data", "forms_momento_5");
const ruta = readdirSync(dir)
  .map((a) => join(dir, a))
  .find((r) => r.endsWith(".xlsx") && leerLibro(r).SheetNames.includes("Quiz Details"));
const libro = ruta ? leerLibro(ruta) : null;
const k = libro ? interpretarKahoot(Object.fromEntries(HOJAS_KAHOOT.map((h) => [h, hojaAMatriz(libro, h)]))) : null;

test("el reporte del Kahoot trae 5 preguntas y 50 jugadores", { skip: !k }, () => {
  assert.equal(k!.preguntas.length, 5);
  assert.equal(k!.jugadores, 50);
  assert.equal(k!.porAciertos.reduce((s, n) => s + n, 0), 50);
  assert.equal(Math.round(k!.precision * 100), 76, "la precisión es la del reporte de Kahoot (189 de 250)");
  assert.equal(k!.preguntas[0].pregunta, "¿Qué es el pensamiento transmoderno?");
});

test("las opciones suman las respuestas de Kahoot y una sola es la correcta, con tantos jugadores como aciertos", { skip: !k }, () => {
  for (const p of k!.preguntas) {
    assert.equal(p.opciones.filter((o) => o.correcta).length, 1, `P${p.numero}`);
    assert.equal(p.opciones.find((o) => o.correcta)!.total, p.correctas, `P${p.numero}: la opción correcta debe sumar los aciertos de Kahoot`);
    assert.equal(p.opciones.reduce((s, o) => s + o.total, 0), p.correctas + p.incorrectas, `P${p.numero}`);
    assert.equal(p.correctas + p.incorrectas + p.sinResponder, k!.jugadores, `P${p.numero}`);
  }
});
