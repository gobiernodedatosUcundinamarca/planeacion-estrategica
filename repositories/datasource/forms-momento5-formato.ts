import type { CeldaEnviada, FormularioEnviadoMomento5 } from "@/types/momento5";

/** Celdas combinadas de una hoja: fila y columna de inicio y de fin, desde 0. */
export interface RangoCombinado {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

/** Texto de una celda para los encabezados: sin saltos de línea ni espacios dobles. */
function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).replace(/\s+/g, " ").trim();
}

/** El valor tal como llegó: números como números, texto como texto y lo vacío como null. */
function celda(valor: unknown): CeldaEnviada {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (valor === null || valor === undefined) return null;
  const s = String(valor);
  return s.trim() === "" ? null : s;
}

/**
 * Interpreta la hoja de una exportación de Microsoft Forms del Momento 5 sin
 * depurar nada: la depuración (qué envíos se excluyen) la decide quien la use.
 *
 * La fila de encabezados es la primera que empieza por «ID», como pone Forms.
 * Las filas de arriba, si las hay, agrupan columnas con celdas combinadas
 * (Validación: «3. Transformación: UC Inteligente»…) y esa sección se antepone
 * al encabezado; sin ella, «Ajuste propuesto al Ámbito 1» se repetiría en las
 * cuatro transformaciones sin decir de cuál es.
 */
export function interpretarExportacionForms(
  archivo: string,
  matriz: unknown[][],
  combinadas: readonly RangoCombinado[] = []
): FormularioEnviadoMomento5 {
  const encontrada = matriz.findIndex((fila) => texto(fila?.[0]).toLowerCase() === "id");
  const filaEncabezado = Math.max(encontrada, 0);
  const ancho = Math.max(0, ...matriz.map((fila) => fila?.length ?? 0));

  const seccion = (c: number): string => {
    for (let r = filaEncabezado - 1; r >= 0; r--) {
      const rango = combinadas.find((m) => m.s.r <= r && r <= m.e.r && m.s.c <= c && c <= m.e.c);
      const valor = texto(rango ? matriz[rango.s.r]?.[rango.s.c] : matriz[r]?.[c]);
      if (valor) return valor;
    }
    return "";
  };

  const preguntas = Array.from({ length: ancho }, (_, c) => texto(matriz[filaEncabezado]?.[c]));
  const encabezados = preguntas.map((pregunta, c) => {
    const grupo = seccion(c);
    return grupo ? `${grupo} · ${pregunta}` : pregunta;
  });

  const filas = matriz
    .slice(filaEncabezado + 1)
    .filter((fila) => fila?.some((valor) => texto(valor) !== ""))
    .map((fila) => Array.from({ length: ancho }, (_, c) => celda(fila[c])));

  return {
    archivo,
    encabezados,
    filas,
    columnaId: preguntas.findIndex((p) => p.toLowerCase() === "id"),
    columnasFechaHora: preguntas.flatMap((p, c) => (/^hora de /i.test(p) ? [c] : [])),
  };
}
