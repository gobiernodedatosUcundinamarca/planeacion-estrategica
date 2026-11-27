import type { KahootMomento5, OpcionKahoot, PreguntaKahoot } from "@/types/momento5-kahoot";
import { textoOpcional } from "./momento5-formato";

/**
 * Traducción del reporte de Kahoot (hojas «Overview» y «Participant Data») a
 * datos tipados. Aparte del origen para que las pruebas la ejerciten sin
 * `server-only`. No recalcula nada que Kahoot ya entrega (precisión, conteos,
 * tiempos): solo cuenta qué opción eligió cada jugador.
 */

export type HojasKahoot = Record<string, unknown[][] | null>;

/** Hojas que lee el origen. «Quiz Details» es la que distingue este reporte de una exportación de Forms. */
export const HOJAS_KAHOOT = ["Overview", "Participant Data", "Quiz Details"];

const PRIMERA_COLUMNA_JUGADOR = 12;

const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** «82%» → 0,82. */
function fraccion(v: unknown): number {
  const m = typeof v === "string" ? v.match(/^\s*(\d+(?:[.,]\d+)?)\s*%/) : null;
  return m ? Number(m[1].replace(",", ".")) / 100 : 0;
}

/** «00:00:24» → 24. */
function segundos(v: unknown): number {
  const m = typeof v === "string" ? v.match(/^(\d+):(\d+):(\d+)/) : null;
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

export function interpretarKahoot(hojas: HojasKahoot): KahootMomento5 {
  const resumen = hojas["Overview"];
  const participantes = hojas["Participant Data"];
  if (!resumen?.length) throw new Error("Kahoot: falta la hoja «Overview» o está vacía.");
  if (!participantes?.length) throw new Error("Kahoot: falta la hoja «Participant Data» o está vacía.");

  const filasPregunta = resumen.slice(1).filter((f) => typeof f[0] === "number" && textoOpcional(f[1]));
  // La fila de totales (sin número de pregunta) trae, por jugador, el porcentaje de aciertos.
  const totales = resumen.slice(1).find((f) => typeof f[0] !== "number" && typeof f[4] === "string") ?? [];
  const columnas = Math.max(0, ...resumen.map((f) => f.length)) - PRIMERA_COLUMNA_JUGADOR;
  const perfectos = Array.from({ length: columnas }, (_, i) => PRIMERA_COLUMNA_JUGADOR + i).filter((c) => totales[c] === "100%");

  const preguntas: PreguntaKahoot[] = filasPregunta.map((f) => {
    const cuenta = new Map<string, number>();
    for (let c = PRIMERA_COLUMNA_JUGADOR; c < PRIMERA_COLUMNA_JUGADOR + columnas; c++) {
      const t = textoOpcional(f[c]);
      if (t) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
    }
    const claves = new Set(perfectos.map((c) => textoOpcional(f[c])).filter((t): t is string => !!t));
    const opciones: OpcionKahoot[] = [...cuenta.entries()]
      .map(([texto, total]) => ({ texto, total, correcta: claves.has(texto) }))
      .sort((a, b) => Number(b.correcta) - Number(a.correcta) || b.total - a.total);
    return {
      numero: numero(f[0]),
      pregunta: textoOpcional(f[1]) ?? "",
      tipo: textoOpcional(f[2]) ?? "",
      precision: fraccion(f[4]),
      tiempoPromedio: segundos(f[5]),
      correctas: numero(f[6]),
      incorrectas: numero(f[9]),
      sinResponder: numero(f[11]),
      opciones,
    };
  });

  const encabezado = participantes[0].map((h) => String(h ?? "").trim());
  const colCorrectas = encabezado.indexOf("Correct");
  if (colCorrectas < 0) throw new Error("Kahoot: la hoja «Participant Data» no tiene la columna «Correct».");
  const filas = participantes.slice(1).filter((f) => f.some((v) => textoOpcional(v) !== null));
  const porAciertos = Array.from({ length: preguntas.length + 1 }, () => 0);
  for (const f of filas) {
    const aciertos = Math.min(preguntas.length, Math.max(0, numero(f[colCorrectas])));
    porAciertos[aciertos]++;
  }
  // Como Kahoot: las preguntas sin responder cuentan como no acertadas (189 de 250 = 76 %).
  const posibles = preguntas.reduce((s, p) => s + p.correctas + p.incorrectas + p.sinResponder, 0);
  return {
    jugadores: filas.length,
    precision: posibles ? preguntas.reduce((s, p) => s + p.correctas, 0) / posibles : 0,
    preguntas,
    porAciertos,
  };
}
