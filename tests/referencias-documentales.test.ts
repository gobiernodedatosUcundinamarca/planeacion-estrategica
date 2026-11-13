import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ClasificacionDocumental, FuenteClasificacionDocumental, MetodoClasificacion, TemaDocumental } from "@/types/clasificacion-documental";
import type { RespuestaMomento4 } from "@/types/momento4";
import { compactarClasificacion, expandirClasificacion, contarTemas, filtrarComentarios, TODOS_LOS_COMENTARIOS } from "@/lib/reglas/navegacion-comentarios";
import { consultarReferenciasDocumentales, consultarResumenFuentes } from "@/repositories/datasource/referencias-documentales-almacen";
import { consultarClasificacionDocumental } from "@/repositories/datasource/clasificacion-documental-almacen";
import { conexionSql } from "@/repositories/datasource/infrastructure/neon";

function fuente(archivo: string, fila: number): FuenteClasificacionDocumental {
  return { archivo, hoja: "Clasificación", fila, sha256: "a".repeat(64), version: "prueba", taxonomia: null, sha256Taxonomia: null };
}
function tema(id: string, referencia: FuenteClasificacionDocumental, probabilidad: number | null, afinidad?: number | null): TemaDocumental {
  return { id, idOriginal: "0", codigo: "Tema 0", nombre: `Tema de ${referencia.archivo}`, componente: "Componente de prueba",
    otrosComponentes: [], criterio: "Criterio documentado de prueba", exclusion: "Exclusión de prueba", justificacion: "Fuente de prueba",
    probabilidad, ...(afinidad === undefined ? {} : { afinidad }), referencia };
}
function registro(idRespuesta: number, referencia: FuenteClasificacionDocumental, temas: TemaDocumental[]): ClasificacionDocumental {
  return { idRespuesta, fuente: referencia, estado: temas.length ? "con_temas" : "sin_tema", motivo: null, temas };
}
function respuesta(id: number): RespuestaMomento4 {
  return { id, transformacion: "transformacion-prueba", etiqueta: "Transformación de prueba", correo: null, nombre: null,
    fechaInicio: null, tipoActor: "Grupo de prueba", programaGraduado: null, unidadRegional: "Unidad de prueba",
    respondeNecesidad: "Sí", ajustes: "Texto sintético de prueba", cluster: null };
}

test("la serialización distingue afinidad, probabilidad, valores nulos y afinidad ausente", () => {
  const a = fuente("modelo-a.xlsx", 2);
  const b = fuente("modelo-b.xlsx", 7);
  const original = { disponible: true, comentarios: [registro(1, a, [tema("a:0", a, null, .73), tema("b:0", b, .81, null)]),
    registro(2, a, [tema("a:0", a, null, null)]), registro(3, b, [tema("b:0", b, .94)])] };
  const restaurado = expandirClasificacion(compactarClasificacion(original));
  assert.deepEqual([...restaurado.values()], original.comentarios);
  assert.equal(restaurado.get(1)!.temas[0].probabilidad, null);
  assert.equal(restaurado.get(1)!.temas[0].afinidad, .73);
  assert.equal(restaurado.get(1)!.temas[1].probabilidad, .81);
  assert.equal(restaurado.get(1)!.temas[1].afinidad, null);
  assert.equal(Object.hasOwn(restaurado.get(3)!.temas[0], "afinidad"), false);
});

test("cada asignación conserva su archivo, hoja y fila aunque el catálogo se comparta", () => {
  const a2 = fuente("modelo-a.xlsx", 2);
  const a3 = fuente("modelo-a.xlsx", 3);
  const b9 = { ...fuente("modelo-b.xlsx", 9), hoja: "Otra hoja", sha256: "b".repeat(64) };
  const original = { disponible: true, comentarios: [registro(1, a2, [tema("a:0", a2, null, .5), tema("b:0", b9, .9)]),
    registro(2, a3, [tema("a:0", a3, null, .8)])] };
  const compacto = compactarClasificacion(original);
  const restaurado = expandirClasificacion(compacto);
  assert.equal(compacto.fuentes.length, 2);
  assert.equal(compacto.temas.length, 2);
  assert.deepEqual([...restaurado.values()], original.comentarios);
  assert.equal(restaurado.get(2)!.temas[0].referencia!.fila, 3);
  assert.equal(restaurado.get(1)!.temas[1].referencia!.hoja, "Otra hoja");
});

test("temas numéricos de modelos distintos permanecen separados y los conteos son por comentario", () => {
  const a = fuente("modelo-a.xlsx", 2);
  const b = fuente("modelo-b.xlsx", 2);
  const ta = tema("fuente-a:0", a, null, .7);
  const tb = tema("fuente-b:0", b, null, .8);
  const clasificaciones = new Map([[1, registro(1, a, [ta, ta])], [2, registro(2, b, [tb])]]);
  const respuestas = [respuesta(1), respuesta(2)];
  assert.deepEqual(contarTemas(respuestas, clasificaciones).map(t => t.total), [1, 1]);
  assert.deepEqual(filtrarComentarios(respuestas, clasificaciones, { ...TODOS_LOS_COMENTARIOS, temas: ["transformacion-prueba:fuente-a:0"] }).map(r => r.id), [1]);
});

interface FuentePrivada {
  id: string; metodo: MetodoClasificacion; archivo: string; sha256: string; hoja: string; version: string;
  taxonomiaArchivo?: string | null; shaTaxonomia?: string | null; alcance: { unidad?: string; nivel?: string };
  temas: Omit<TemaDocumental, "probabilidad" | "afinidad" | "referencia">[];
}
interface VinculoPrivado {
  fuente_id: string; transformacion: string; respuesta_id: string; huella_texto: string; fila: number;
  temas: { id: string; probabilidad: number | null; afinidad?: number | null }[]; observacion?: string | null;
}
function ordenado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenado);
  if (valor && typeof valor === "object") return Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, ordenado(v)]));
  return valor;
}
function huella(valor: unknown): string { return createHash("sha256").update(JSON.stringify(ordenado(valor))).digest("hex"); }

test("referencias locales completas: cuatro métodos, métricas, fuentes y revisión posterior intactos", {
  skip: process.env.PORTAL_SQL_LOCAL !== "1" || !process.env.REFERENCIAS_CATALOGO,
}, async () => {
  const destino = new URL(process.env.DATABASE_URL!);
  assert.equal(destino.hostname, "db.localtest.me");
  assert.equal(destino.pathname, "/planeacion_local");
  const catalogo = JSON.parse(readFileSync(process.env.REFERENCIAS_CATALOGO!, "utf8").replace(/^\uFEFF/, "")) as { fuentes: FuentePrivada[]; vinculos: VinculoPrivado[] };
  assert.equal(catalogo.fuentes.length, 110);
  assert.equal(catalogo.vinculos.length, 12899);
  assert.equal(catalogo.vinculos.reduce((total, v) => total + v.temas.length, 0), 13106);
  const fuentes = new Map(catalogo.fuentes.map(f => [f.id, f]));
  assert.equal(fuentes.size, 110);
  const sql = conexionSql();
  const originales = ["momento4_respuestas", "momento4_documentos", "momento4_clusters", "momento4_fuentes_documentales",
    "momento4_temas_documentales", "momento4_comentarios_documentales", "momento4_asignaciones_documentales"];
  async function huellasOriginales() {
    return Promise.all(originales.map(async tabla => {
      const [r] = await sql.query(`select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text) as huella from ${tabla} t`);
      return r.huella;
    }));
  }
  const antes = await huellasOriginales();
  const [fuentesActuales, vinculosActuales, identidades] = await Promise.all([
    sql`select to_jsonb(t) as fila from momento4_fuentes_suplementarias t`,
    sql`select to_jsonb(t) as fila from momento4_vinculos_suplementarios t`,
    sql`select id, transformacion, respuesta_id from momento4_respuestas`,
  ]);
  const fuentesEsperadas = catalogo.fuentes.map(f => ({ id: f.id, metodo: f.metodo, archivo: f.archivo, sha256: f.sha256,
    hoja: f.hoja, taxonomia_archivo: f.taxonomiaArchivo ?? null, sha256_taxonomia: f.shaTaxonomia ?? null,
    alcance: f.alcance, version: f.version, temas: f.temas }));
  const vinculosEsperados = catalogo.vinculos.map(v => ({ fuente_id: v.fuente_id, transformacion: v.transformacion,
    respuesta_id: v.respuesta_id, huella_texto: v.huella_texto, fila: v.fila, temas: v.temas, observacion: v.observacion ?? null }));
  assert.deepEqual(fuentesActuales.map(r => huella(r.fila)).sort(), fuentesEsperadas.map(huella).sort());
  assert.deepEqual(vinculosActuales.map(r => huella(r.fila)).sort(), vinculosEsperados.map(huella).sort());
  const porClave = new Map(identidades.map(r => [`${r.transformacion}:${r.respuesta_id}`, Number(r.id)]));
  const comunes = await consultarClasificacionDocumental(sql);
  const mapaComun = new Map(comunes.comentarios.map(c => [c.idRespuesta, c]));
  const revisados = comunes.comentarios.filter(c => c.estado === "sin_contenido_revisado");
  assert.equal(revisados.length, 19);
  const resumenEsperado = new Map<number, Set<MetodoClasificacion>>();
  const metodos: MetodoClasificacion[] = ["bert-regional", "bert-conjunto", "jev-ejercicio", "bert-jev-unidad"];
  let asignacionesVerificadas = 0;
  for (const metodo of metodos) {
    const esperados = new Map<number, VinculoPrivado[]>();
    for (const v of catalogo.vinculos.filter(v => fuentes.get(v.fuente_id)!.metodo === metodo)) {
      const id = porClave.get(`${v.transformacion}:${v.respuesta_id}`);
      assert.notEqual(id, undefined);
      if (!esperados.has(id!)) esperados.set(id!, []);
      esperados.get(id!)!.push(v);
      if (v.temas.length) {
        if (!resumenEsperado.has(id!)) resumenEsperado.set(id!, new Set());
        resumenEsperado.get(id!)!.add(metodo);
      }
    }
    const resultado = await consultarReferenciasDocumentales(sql, metodo);
    assert.equal(resultado.disponible, true);
    assert.equal(resultado.comentarios.length, esperados.size);
    assert.equal(new Set(resultado.comentarios.map(c => c.idRespuesta)).size, esperados.size);
    assert.deepEqual([...expandirClasificacion(compactarClasificacion(resultado)).values()], resultado.comentarios);
    for (const c of resultado.comentarios) {
      const enlaces = esperados.get(c.idRespuesta)!;
      assert.ok(enlaces);
      assert.equal(c.temas.length, enlaces.reduce((n, v) => n + v.temas.length, 0));
      assert.equal(c.estado, c.temas.length ? "con_temas" : "sin_tema");
      assert.equal(new Set(c.temas.map(t => t.id)).size, c.temas.length);
      if (mapaComun.get(c.idRespuesta)?.estado === "sin_contenido_revisado") {
        assert.match(c.motivo ?? "", /sin cambiar esa decisión/);
        assert.deepEqual(mapaComun.get(c.idRespuesta)!.temas, []);
      }
      for (const v of enlaces) {
        const f = fuentes.get(v.fuente_id)!;
        const referencia = { archivo: f.archivo, sha256: f.sha256, hoja: f.hoja, fila: v.fila,
          version: f.version, taxonomia: f.taxonomiaArchivo ?? null, sha256Taxonomia: f.shaTaxonomia ?? null };
        for (const a of v.temas) {
          const definicion = f.temas.find(t => t.id === a.id)!;
          const actual = c.temas.find(t => t.id === `${f.id}:${a.id}`);
          assert.deepEqual(actual, { ...definicion, id: `${f.id}:${a.id}`,
            ambito: f.alcance.nivel === "conjunto" ? "Todas las unidades" : f.alcance.unidad ?? "",
            probabilidad: a.probabilidad, ...(a.afinidad === undefined ? {} : { afinidad: a.afinidad }), referencia });
          if (metodo === "bert-regional" || metodo === "bert-conjunto") assert.equal(actual!.probabilidad, null);
          else assert.ok(actual!.probabilidad !== null && actual!.probabilidad >= .7 && actual!.probabilidad <= 1);
          asignacionesVerificadas++;
        }
      }
    }
  }
  assert.equal(asignacionesVerificadas, 13106);
  const resumen = await consultarResumenFuentes(sql);
  assert.equal(Object.keys(resumen.porComentario).length, resumenEsperado.size);
  for (const [id, metodos] of resumenEsperado) assert.deepEqual([...resumen.porComentario[id]].sort(), [...metodos].sort());
  for (const disponible of resumen.disponibles) assert.equal(disponible.comentarios, [...resumenEsperado.values()].filter(m => m.has(disponible.metodo)).length);
  assert.deepEqual(await huellasOriginales(), antes);
  assert.deepEqual(await consultarClasificacionDocumental(sql), comunes);
});
