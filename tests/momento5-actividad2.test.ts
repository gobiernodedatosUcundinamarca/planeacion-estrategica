import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { hojaAMatriz, leerLibro } from "@/repositories/datasource/infrastructure/excel";
import { leerJson } from "@/repositories/datasource/infrastructure/json";
import { HOJAS_ACTIVIDAD2, interpretarActividad2 } from "@/repositories/datasource/momento5-actividad2-formato";
import { normalizarResultadosMomento5 } from "@/repositories/datasource/momento5-formato";
import {
  categoriaPeriodicidad,
  derivarActividad2,
  equipoDePersona,
  disponerNube,
  gruposPorActividad,
} from "@/lib/reglas/momento5-actividad2";

const libro = leerLibro(join(process.cwd(), "data", "source-momento5-actividad2", "actividad2.xlsx"));
const a2 = interpretarActividad2(Object.fromEntries(HOJAS_ACTIVIDAD2.map((h) => [h, hojaAMatriz(libro, h)])));
const m5 = normalizarResultadosMomento5(leerJson(join(process.cwd(), "data", "source-momento5-cai", "resultados.json")));

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Iguales, o con una sola letra cambiada (misma longitud). */
function unaLetraDeDiferencia(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length !== b.length || a.length < 5) return false;
  return [...a].filter((c, i) => c !== b[i]).length === 1;
}

test("la transcripción trae los cuatro instrumentos, las ocho mesas y los 17 indicadores", () => {
  assert.deepEqual(
    a2.instrumentos.map((i) => i.id),
    ["pregunta-inicial", "reto1", "reto2", "aprendizajes"]
  );
  assert.deepEqual(
    a2.mesas.map((m) => m.mesa),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.equal(a2.indicadores.length, 17);
  assert.deepEqual(
    a2.mesas.map((m) => a2.indicadores.filter((i) => i.mesa === m.mesa).length),
    [1, 2, 3, 1, 2, 3, 2, 3]
  );
  assert.equal(a2.reto2.length, 2);
  const [inicial, aprendizajes] = ["pregunta-inicial", "aprendizajes"].map((id) => a2.nubes.find((n) => n.instrumento === id)!);
  assert.equal(inicial.frases.length, 72);
  assert.equal(aprendizajes.frases.length, 10);
  assert.deepEqual(aprendizajes.omitidas.map((o) => o.frase), ["maca"]);
});

test("las preguntas se toman literales de la ficha, no del código", () => {
  const m = a2.mesas[0];
  assert.deepEqual(
    m.respuestas.map((r) => r.pregunta),
    ["¿Qué cambio esperamos observar?", "¿En quién o en qué se manifiesta?", "¿Cómo sabremos que ocurrió?"]
  );
  assert.equal(m.cierre.pregunta, "Mensaje de cierre para tus colegas:");
  assert.equal(a2.encabezadosIndicadores.desagregacion, "Desagregación (Multicampus, sede o programas)");
});

test("cada transformación de la Actividad 2 existe en el plan del Momento 5", () => {
  const nombres = new Set(m5.transformaciones.map((t) => t.nombre));
  for (const m of a2.mesas) assert.ok(nombres.has(m.transformacion), `Mesa ${m.mesa}: «${m.transformacion}»`);
});

test("Mesa N es el Equipo N: los integrantes que traen las fichas son de ese equipo", () => {
  for (const m of a2.mesas.filter((x) => x.integrantes)) {
    const equipo = m5.participantes.filter((p) => p.equipo === m.mesa).map((p) => sinTildes(p.nombre));
    // Las fichas nombran a cada persona con nombre y un apellido («Mireya Rincon»): basta con que
    // todas sus palabras estén en el nombre completo de alguien del equipo.
    const nombres = m.integrantes!.split(/[,;]| e /).map((s) => sinTildes(s.replace(/\.$/, "").trim())).filter(Boolean);
    for (const n of nombres) {
      const palabras = n.split(/\s+/);
      // «Marisela Botero» se registró en el Momento 5 como «Maricela Botero Grisales»: se acepta una letra de diferencia.
      const coincide = equipo.some(
        (e) => palabras.filter((p) => e.split(/\s+/).some((q) => unaLetraDeDiferencia(p, q))).length >= Math.min(2, palabras.length)
      );
      assert.ok(coincide, `Mesa ${m.mesa}: «${n}» no está en el Equipo ${m.mesa}`);
    }
  }
  // Quien guardó cada ficha del Reto 1 es del equipo de su mesa.
  for (const a of a2.archivos.filter((x) => x.carpeta.includes("Reto 1") && x.guardadoPor && x.mesa)) {
    const equipo = equipoDePersona(a.guardadoPor, m5.participantes);
    if (equipo !== null) assert.equal(equipo, a.mesa, `${a.archivo}: guardado por alguien del Equipo ${equipo}`);
  }
});

test("la periodicidad se agrupa por la primera palabra que escribió la mesa", () => {
  assert.equal(categoriaPeriodicidad("anual"), "Anual");
  assert.equal(categoriaPeriodicidad("Anual (por cohorte)"), "Anual");
  assert.equal(categoriaPeriodicidad("Semestral (seguimiento)\nAnual (resultado)"), "Semestral");
  assert.equal(categoriaPeriodicidad("Según periodo certificado"), "Otra");
  assert.equal(categoriaPeriodicidad(null), "Sin dato");
  const d = derivarActividad2(a2, null);
  assert.deepEqual(
    Object.fromEntries(d.periodicidad.map((p) => [p.id, p.value])),
    { Anual: 10, Semestral: 6, Otra: 1 }
  );
  assert.deepEqual(d.mesasConMas, [3, 6, 8]);
  assert.deepEqual(
    d.transformaciones.map((t) => t.nombre),
    ["UC Inteligente", "UC Translocal", "UC para la Vida", "UC Emprendedora e Innovadora"]
  );
});

test("el filtro de equipo deja solo su mesa y sus registros del Reto 2", () => {
  const d1 = derivarActividad2(a2, 1);
  assert.deepEqual(d1.mesas.map((m) => m.mesa), [1]);
  assert.equal(d1.reto2.length, 2);
  const d2 = derivarActividad2(a2, 2);
  assert.deepEqual(d2.reto2.map((r) => r.registro), [1]);
  assert.equal(derivarActividad2(a2, 5).reto2.length, 0);
});

test("el Reto 2 trae sus dos registros con los rótulos de la ficha", () => {
  const [revision, mesa1] = a2.reto2;
  assert.equal(revision.encabezado, "Transformación: UC Inteligente · Mesa 2 revisa a Mesa 1");
  assert.equal(revision.elementos.length, 9);
  assert.equal(revision.elementos[0].elemento, "Indicador inicial");
  assert.equal(mesa1.registradoPor, "Julieth Johana Maca Romero");
  assert.equal(mesa1.elementos.length, 4);
  // Quien guardó por última vez el archivo de la revisión es del Equipo 6, no de las mesas 1 o 2.
  assert.equal(equipoDePersona("Wilson Ricardo Pinillos Castillo", m5.participantes), 6);
});

test("el menú agrupa por actividad: 1, 2 y 3", () => {
  const grupos = gruposPorActividad(m5.meta.formularios, a2.instrumentos);
  assert.deepEqual(
    grupos.map((g) => [g.actividad, g.secciones.map((s) => s.id)]),
    [
      [1, ["validacion", "acuerdos"]],
      [2, ["pregunta-inicial", "reto1", "reto2", "aprendizajes"]],
      [3, ["percepcion", "consolidacion", "matriz"]],
    ]
  );
});

test("la nube pone la frase más grande al centro, sin encimar ni perder ninguna", () => {
  const nube = a2.nubes.find((n) => n.instrumento === "pregunta-inicial")!;
  // Cajas aproximadas (sin navegador): ancho por número de letras y alto por nivel.
  const cajas = nube.frases.map((f) => {
    const tamano = [0, 19, 34, 66][f.tamano];
    return { ancho: f.frase.length * tamano * 0.6, alto: tamano * 1.2 };
  });
  const posiciones = disponerNube(cajas);
  assert.equal(posiciones.length, nube.frases.length);
  const centro = nube.frases.findIndex((f) => f.frase === "impacto");
  assert.deepEqual(posiciones[centro], { x: 0, y: 0 });
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const separadas =
        Math.abs(posiciones[i].x - posiciones[j].x) * 2 >= cajas[i].ancho + cajas[j].ancho ||
        Math.abs(posiciones[i].y - posiciones[j].y) * 2 >= cajas[i].alto + cajas[j].alto;
      assert.ok(separadas, `«${nube.frases[i].frase}» y «${nube.frases[j].frase}» se enciman`);
    }
  }
  // Determinista: la misma entrada da la misma nube.
  assert.deepEqual(disponerNube(cajas), posiciones);
});
