import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { leerJson } from "@/repositories/datasource/infrastructure/json";
import { normalizarResultadosMomento5 } from "@/repositories/datasource/momento5-formato";
import {
  binAjuste,
  citasDeTema,
  conformacionEquipos,
  derivarMomento5,
  destacadosMomento5,
  fechaCorta,
  fechaLarga,
  nombreFormularioDe,
  pasoAjustes,
  porcentajesComplementarios,
} from "@/lib/reglas/momento5";
import { preguntasAbiertasMomento5 } from "@/lib/reglas/momento5-abiertas";

const datos = normalizarResultadosMomento5(leerJson(join(process.cwd(), "data", "source-momento5-cai", "resultados.json")));

/** Ningún número de la vista puede ser NaN ni infinito, y ningún campo, undefined. */
function sinValoresInvalidos(valor: unknown, ruta = "raíz"): void {
  if (typeof valor === "number") assert.ok(Number.isFinite(valor), `${ruta} = ${valor}`);
  else if (Array.isArray(valor)) valor.forEach((v, i) => sinValoresInvalidos(v, `${ruta}[${i}]`));
  else if (valor && typeof valor === "object") {
    for (const [clave, v] of Object.entries(valor)) {
      // `ajuste` y `justificacion` de una propuesta son opcionales a propósito: la vista pone el texto alternativo.
      if (v === undefined && (clave === "ajuste" || clave === "justificacion")) continue;
      assert.notEqual(v, undefined, `${ruta}.${clave} es undefined`);
      sinValoresInvalidos(v, `${ruta}.${clave}`);
    }
  }
}

test("las cifras generales coinciden con el dashboard de origen", () => {
  const d = derivarMomento5(datos, null);
  assert.equal(d.kpi.participantes, 53);
  assert.equal(d.kpi.equipos, 8);
  assert.equal(d.kpi.valoraciones, 886);
  assert.equal(d.kpi.ajustesIndividuales, 224);
  assert.ok(Math.abs(d.kpi.pctValida - 662 / 886) < 1e-12);
  assert.equal(d.kpi.ajustesEquipo, 29);
  assert.equal(d.kpi.procesos, 50);
  assert.equal(d.kpi.procesosIA, 5);
  assert.equal(d.kpi.procesosAuto, 12);
  assert.equal(d.kpi.consolidacion + d.matriz.length, 49 + 8);
  assert.deepEqual(
    d.formularios.map((f) => [f.id, f.value, f.respuestas_originales]),
    [["validacion", 52, 53], ["acuerdos", 8, 9], ["percepcion", 50, 51], ["consolidacion", 49, 49], ["matriz", 8, 9]]
  );
  assert.equal(d.sinSede, 4);
  assert.equal(d.roles.at(-1)?.label, "Sin dato");
  assert.equal(d.catProceso[0].id, "ATE");
  assert.equal(d.catProceso[0].value, 12);
  assert.equal(d.temas[0].id, "APR");
  assert.equal(d.temas[0].value, 35);
  sinValoresInvalidos(d);
});

test("los totales por equipo suman los generales", () => {
  const total = derivarMomento5(datos, null);
  const porEquipo = datos.equipos.map((e) => derivarMomento5(datos, e.equipo));
  const suma = (f: (d: (typeof porEquipo)[number]) => number) => porEquipo.reduce((s, d) => s + f(d), 0);
  assert.equal(suma((d) => d.kpi.participantes), total.kpi.participantes);
  assert.equal(suma((d) => d.kpi.valoraciones), total.kpi.valoraciones);
  assert.equal(suma((d) => d.kpi.ajustesEquipo), total.kpi.ajustesEquipo);
  assert.equal(suma((d) => d.kpi.procesos), total.kpi.procesos);
  assert.equal(suma((d) => d.kpi.consolidacion), total.kpi.consolidacion);
  assert.equal(suma((d) => d.acuerdos.length), total.acuerdos.length);
  assert.equal(suma((d) => d.matriz.length), total.matriz.length);
  for (const d of porEquipo) {
    assert.equal(d.kpi.equipos, 1);
    sinValoresInvalidos(d);
  }
});

test("el equipo 1 valoró una transformación que no le correspondía (caso documentado)", () => {
  const d = derivarMomento5(datos, 1);
  const emprendedora = d.porT.find((t) => t.t === "EMP");
  assert.ok(emprendedora && emprendedora.total > 0);
  assert.equal(d.porT.find((t) => t.t === "VID")?.total, 0);
});

test("nulos, vacíos, «N/A» y campos faltantes no producen NaN ni undefined", () => {
  const sucio = normalizarResultadosMomento5({
    meta: { formularios: [{ id: "validacion", tipo: "Individual", respuestas_originales: "N/A" }, { nombre: "sin id" }] },
    transformaciones: [{ id: "INT", componentes: [{ code: "OE", texto: "N/A" }, { titulo: "sin código" }] }],
    equipos: [{ equipo: "1", transformaciones: ["INT"] }, { equipo: null }],
    participantes: [{ pid: "P1", rol: null, equipo: 1, sede: "", formularios: null }, {}],
    validacion: [
      { pid: "P1", equipo: 1, t: "INT", c: "OE", e: "A", aj: "N/A", ju: "  " },
      { pid: "P1", equipo: 1, t: "XXX", c: "OE", e: "A" },
      { pid: "P1", equipo: 1, t: "INT", c: "OE", e: "Quizá" },
    ],
    acuerdos: [{ equipo: 1, desacuerdos: "No aplica", ajustes: [{ t: "INT", tipo: "Objetivo estratégico" }, null] }, { equipo: null }],
    percepcion: [{ equipo: 1, difs: null, proceso: "-" }],
    consolidacion: [{ equipo: 1, temas: "APR" }],
    matriz: [{ equipo: 1, aspectos: ["", "Uno", null] }],
    catalogos: { sedes: [{ nombre: null }] },
  });
  assert.equal(sucio.validacion.length, 1);
  assert.equal(sucio.validacion[0].aj, undefined);
  assert.equal(sucio.participantes[0].rol, "Sin dato");
  assert.equal(sucio.participantes[0].sede, null);
  assert.equal(sucio.participantes[1].nombre, "Sin nombre registrado");
  assert.equal(sucio.acuerdos.length, 1);
  assert.equal(sucio.acuerdos[0].desacuerdos, null);
  assert.deepEqual(sucio.matriz[0].aspectos, ["Uno"]);
  assert.equal(sucio.meta.formularios[0].respuestas_originales, 0);
  for (const eq of [null, 1, 2]) sinValoresInvalidos(derivarMomento5(sucio, eq));
});

test("un archivo vacío deja todo en cero, sin divisiones por cero", () => {
  const d = derivarMomento5(normalizarResultadosMomento5({}), null);
  assert.equal(d.kpi.participantes, 0);
  assert.equal(d.kpi.pctValida, 0);
  assert.deepEqual(d.formularios, []);
  sinValoresInvalidos(d);
  assert.throws(() => normalizarResultadosMomento5(null));
  assert.throws(() => normalizarResultadosMomento5([]));
});

test("las preguntas abiertas sin clasificar se agrupan sin perder respuestas", () => {
  const preguntas = preguntasAbiertasMomento5(datos);
  assert.deepEqual(
    preguntas.map((p) => [p.id, p.respuestas.length]),
    [
      ["validacion-ajuste", 218],
      ["validacion-justificacion", 203],
      ["acuerdos-ajuste", 29],
      ["acuerdos-justificacion", 29],
      ["acuerdos-desacuerdos", 2],
      ["percepcion-consiste", 50],
      ["percepcion-afectacion", 50],
      ["matriz-indicadores", 21],
    ]
  );
  for (const p of preguntas) {
    // Cada respuesta con tema cuenta en exactamente un tema.
    const conTema = p.respuestas.filter((r) => r.tema !== null).length;
    assert.equal(p.temas.reduce((s, t) => s + t.total, 0), conTema, p.id);
    for (const r of p.respuestas) if (r.tema !== null) assert.ok(p.temas.some((t) => t.cluster === r.tema), p.id);
  }
  // Mismo archivo, mismos temas: la vista no cambia entre visitas.
  assert.deepEqual(preguntasAbiertasMomento5(datos), preguntas);
  assert.deepEqual(preguntasAbiertasMomento5(normalizarResultadosMomento5({})).flatMap((p) => p.respuestas), []);
});

test("los destacados del relato salen de las cifras y toleran equipos sin datos", () => {
  const todos = destacadosMomento5(derivarMomento5(datos, null));
  assert.equal(todos.componenteMasAjustado?.t, "VID");
  assert.equal(todos.componenteMasAjustado?.code, "OE");
  assert.equal(todos.componenteMasAjustado?.A, 15);
  assert.equal(todos.tipoMasCorregido?.id, "OE");
  assert.equal(todos.categoriaPrincipal?.id, "ATE");
  assert.equal(todos.dificultadPrincipal?.id, "DEM");
  assert.deepEqual(todos.temasPrincipales.map((t) => t.id), ["APR", "PER", "DIG"]);
  assert.equal(todos.validanDemas, 7);
  assert.equal(todos.conDesacuerdo.length, 2);
  assert.equal(todos.rolPrincipal?.label, "Coordinación de programa o área");

  // El equipo 3 no valoró UC Inteligente ni UC Translocal: el destacado sale de lo que sí valoró.
  const equipo3 = destacadosMomento5(derivarMomento5(datos, 3));
  assert.ok(equipo3.componenteMasAjustado && ["EMP", "VID"].includes(equipo3.componenteMasAjustado.t));

  const vacio = destacadosMomento5(derivarMomento5(normalizarResultadosMomento5({}), null));
  assert.equal(vacio.componenteMasAjustado, null);
  assert.equal(vacio.tipoMasCorregido, null);
  assert.deepEqual(vacio.temasPrincipales, []);

  const citas = citasDeTema(derivarMomento5(datos, null).consolidacion, "APR");
  assert.equal(citas.length, 2);
  assert.ok(citas.every((c) => c.temas.includes("APR") && c.aspecto));
  assert.deepEqual(citasDeTema([], "APR"), []);
});

test("escalas, porcentajes y fechas", () => {
  assert.deepEqual(porcentajesComplementarios(224, 886), { valida: 74.7, ajuste: 25.3 });
  assert.deepEqual(porcentajesComplementarios(1, 3), { valida: 66.7, ajuste: 33.3 });
  assert.deepEqual(porcentajesComplementarios(0, 0), { valida: 0, ajuste: 0 });
  assert.equal(binAjuste(0), 0);
  assert.equal(binAjuste(0.5), 5);
  assert.equal(binAjuste(1), 5);
  assert.equal(binAjuste(Number.NaN), 0);
  assert.equal(pasoAjustes(0, 4), null);
  assert.equal(pasoAjustes(4, 4), 5);
  assert.equal(pasoAjustes(1, 0), 5);
  assert.equal(fechaLarga("2026-11-17"), "17 de noviembre");
  assert.match(fechaCorta("2026-11-18"), /^18 nov\.$/);
  assert.equal(fechaLarga("sin fecha"), "sin fecha");
});

test("la conformación de los equipos reúne a los 53 participantes sin repetir a nadie", () => {
  const equipos = conformacionEquipos(datos);
  assert.deepEqual(
    equipos.map((e) => [e.equipo, e.integrantes.length]),
    [[1, 6], [2, 6], [3, 8], [4, 7], [5, 6], [6, 7], [7, 7], [8, 6]]
  );
  const pids = equipos.flatMap((e) => e.integrantes.map((p) => p.pid));
  assert.equal(new Set(pids).size, 53);
  assert.deepEqual(equipos[0].transformaciones, ["UC Inteligente", "UC Translocal"]);
  // Orden alfabético dentro de cada equipo.
  for (const e of equipos) {
    const nombres = e.integrantes.map((p) => p.nombre);
    assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, "es")));
  }
  // Un pid sin participante se omite en lugar de mostrarse como texto suelto.
  const conHueco = { ...datos, equipos: [{ equipo: 9, transformaciones: [], integrantes: ["P999"] }] };
  assert.deepEqual(conformacionEquipos(conHueco)[0].integrantes, []);
});

test("las notas de depuración nombran el formulario tal como se llamó", () => {
  const f = datos.meta.formularios;
  assert.equal(nombreFormularioDe("Validación estratégica", f), "Formulario Individual de Validación Estratégica");
  assert.equal(nombreFormularioDe("Percepción sobre Transformación Digital", f), "Formulario de Percepción sobre Transformación Digital");
  assert.equal(nombreFormularioDe("Matriz de Construcción Colaborativa del MEDIT", f), "Matriz de Construcción Colaborativa y Acuerdos del MEDIT");
  assert.equal(nombreFormularioDe("Acuerdos Estratégicos del Equipo", f), "Acuerdos Estratégicos del Equipo");
  assert.equal(nombreFormularioDe("Otro registro", f), "Otro registro");
});
