import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import { agruparPorTema } from "./agrupar-temas";
import { esTextoConContenido } from "./formularios";

/**
 * Agrupación temática de las preguntas abiertas del Momento 5 que su
 * formulario no clasifica. Las demás ya traen una codificación del análisis
 * (categoría y dificultad del proceso, temas del MEDIT) y no se reagrupan.
 *
 * Se usa la misma clasificación que los comentarios de las transformaciones
 * (`clasificarComentarios`): TF-IDF sobre el vocabulario, K-Means con el número
 * de grupos elegido por la silueta y nombre del grupo por sus términos más
 * característicos. Agrupa por palabras compartidas, no por significado, y con
 * menos de cuatro textos no inventa grupos.
 *
 * Solo la usa el servidor (ver `agrupar-temas.ts`): el clasificador no viaja al
 * navegador. Las respuestas entran en el orden del archivo, que es estable:
 * K-Means arranca por posición y otro orden daría otros temas.
 */

interface Fuente {
  id: string;
  formulario: string;
  pregunta: string;
  palabrasSinTema: string[];
  textos: { texto: string | null | undefined; detalle: string; equipo: number | null }[];
}

const equipoDe = (equipo: number | null) => (equipo ? `Equipo ${equipo}` : "Sin equipo");

function fuentes(datos: ResultadosMomento5): Fuente[] {
  const nombreDe = new Map(datos.participantes.map((p) => [p.pid, p.nombre]));
  const nombreT = new Map(datos.transformaciones.map((t) => [t.id, t.nombre]));
  const componente = new Map(
    datos.transformaciones.flatMap((t) => t.componentes.map((c) => [`${t.id}:${c.code}`, c.titulo] as const))
  );
  const ajustesIndividuales = datos.validacion.filter((v) => v.e === "A");
  const detalleValoracion = (v: (typeof ajustesIndividuales)[number]) =>
    [nombreDe.get(v.pid) ?? "Sin nombre registrado", equipoDe(v.equipo), nombreT.get(v.t) ?? v.t, componente.get(`${v.t}:${v.c}`) ?? v.c].join(
      " · "
    );
  const ajustesEquipo = datos.acuerdos.flatMap((a) => a.ajustes.map((x) => ({ ...x, equipo: a.equipo })));
  const detalleAjuste = (x: (typeof ajustesEquipo)[number]) =>
    [equipoDe(x.equipo), nombreT.get(x.t) ?? x.t, x.c].filter(Boolean).join(" · ");
  const detallePercepcion = (p: ResultadosMomento5["percepcion"][number]) =>
    [p.nombre, p.dependencia, equipoDe(p.equipo)].filter(Boolean).join(" · ");

  return [
    {
      id: "validacion-ajuste",
      formulario: "validacion",
      pregunta: "Ajuste propuesto (si corresponde)",
      palabrasSinTema: ["ajuste", "ajustar", "propuesta", "propone", "redacción", "redaccion"],
      textos: ajustesIndividuales.map((v) => ({ texto: v.aj, detalle: detalleValoracion(v), equipo: v.equipo })),
    },
    {
      id: "validacion-justificacion",
      formulario: "validacion",
      pregunta: "Justificación del ajuste (si corresponde)",
      palabrasSinTema: ["ajuste", "ajustar", "propuesta", "propone", "justificación", "justificacion"],
      textos: ajustesIndividuales.map((v) => ({ texto: v.ju, detalle: detalleValoracion(v), equipo: v.equipo })),
    },
    {
      id: "acuerdos-ajuste",
      formulario: "acuerdos",
      pregunta: "Ajuste propuesto por el equipo",
      palabrasSinTema: ["ajuste", "ajustar", "propuesta", "propone", "redacción", "redaccion"],
      textos: ajustesEquipo.map((x) => ({ texto: x.ajuste, detalle: detalleAjuste(x), equipo: x.equipo })),
    },
    {
      id: "acuerdos-justificacion",
      formulario: "acuerdos",
      pregunta: "Justificación del ajuste",
      palabrasSinTema: ["ajuste", "ajustar", "propuesta", "propone", "justificación", "justificacion"],
      textos: ajustesEquipo.map((x) => ({ texto: x.justificacion, detalle: detalleAjuste(x), equipo: x.equipo })),
    },
    {
      id: "acuerdos-desacuerdos",
      formulario: "acuerdos",
      pregunta: "El equipo no alcanzó acuerdo sobre uno o más componentes (identificar brevemente)",
      palabrasSinTema: ["acuerdo", "consenso"],
      textos: datos.acuerdos.map((a) => ({ texto: a.desacuerdos, detalle: equipoDe(a.equipo), equipo: a.equipo })),
    },
    {
      id: "percepcion-consiste",
      formulario: "percepcion",
      pregunta: "¿En qué consiste actualmente?",
      palabrasSinTema: ["proceso", "procesos", "consiste", "actualmente"],
      textos: datos.percepcion.map((p) => ({ texto: p.consiste, detalle: detallePercepcion(p), equipo: p.equipo })),
    },
    {
      id: "percepcion-afectacion",
      formulario: "percepcion",
      pregunta: "¿Cómo afecta el trabajo a los usuarios?",
      palabrasSinTema: ["afecta", "afectan", "usuario", "usuarios", "trabajo"],
      textos: datos.percepcion.map((p) => ({ texto: p.afectacion, detalle: detallePercepcion(p), equipo: p.equipo })),
    },
    {
      id: "matriz-indicadores",
      formulario: "matriz",
      pregunta: "¿Cómo sabremos que los hemos logrado?",
      palabrasSinTema: ["sabremos", "logrado", "logrados", "logro"],
      textos: datos.matriz.flatMap((m) => m.indicadores.map((texto) => ({ texto, detalle: equipoDe(m.equipo), equipo: m.equipo }))),
    },
  ];
}

/** Las preguntas abiertas sin clasificar, cada una con sus temas y sus respuestas con contenido. */
export function preguntasAbiertasMomento5(datos: ResultadosMomento5): PreguntaAbiertaMomento5[] {
  return fuentes(datos).map((f) => {
    // Mismo criterio que la agrupación: «Ninguna», «.» o «N/A» no son respuestas que listar.
    const elementos = f.textos.flatMap((t, i) => (t.texto && esTextoConContenido(t.texto) ? [{ ...t, texto: t.texto, id: i + 1 }] : []));
    const { temas, temaDe } = agruparPorTema(elementos, (e) => e.texto, f.palabrasSinTema);
    return {
      id: f.id,
      formulario: f.formulario,
      pregunta: f.pregunta,
      palabrasSinTema: f.palabrasSinTema,
      temas,
      respuestas: elementos.map((e) => ({
        id: e.id,
        texto: e.texto,
        detalle: e.detalle,
        equipo: e.equipo,
        tema: temaDe.get(e.id) ?? null,
      })),
    };
  });
}
