import type { ParametrosMuestreo } from "@/types/nota-metodologica";

/**
 * Fórmulas del diseño muestral. Viven aquí porque las usan el servidor (para
 * comprobar que el Excel cuadra) y la vista (la calculadora y las curvas), y
 * deben ser exactamente las mismas que aplica el libro.
 */

export const TITULO_NOTA_METODOLOGICA = "Nota metodológica: muestreo";

/** p·(1 − p): con p = 0,5 es 0,25, la mayor variabilidad posible. */
export function varianzaEsperada(parametros: ParametrosMuestreo): number {
  return parametros.proporcion * (1 - parametros.proporcion);
}

/** Paso 1 — n₀ = Z²·p(1 − p) / e². */
export function muestraPoblacionInfinita(parametros: ParametrosMuestreo): number {
  return (parametros.z ** 2 * varianzaEsperada(parametros)) / parametros.margenError ** 2;
}

/** Paso 2 — n = N·Z²·p(1 − p) / [e²·(N − 1) + Z²·p(1 − p)]. */
export function muestraPoblacionFinita(poblacion: number, parametros: ParametrosMuestreo): number {
  const numerador = parametros.z ** 2 * varianzaEsperada(parametros);
  return (poblacion * numerador) / (parametros.margenError ** 2 * (poblacion - 1) + numerador);
}

/**
 * Paso 3 — redondeo hacia arriba, o N si el estrato es pequeño. Se resta un
 * épsilon antes de redondear porque un cociente que en Excel da un entero
 * exacto aquí puede llegar como 63,000000001 y subir a 64.
 */
export function muestraRequerida(poblacion: number, parametros: ParametrosMuestreo): number {
  if (poblacion <= parametros.umbralCenso) return poblacion;
  return Math.ceil(muestraPoblacionFinita(poblacion, parametros) - 1e-9);
}

export function esCenso(poblacion: number, parametros: ParametrosMuestreo): boolean {
  return poblacion <= parametros.umbralCenso;
}

/**
 * Margen de error con n personas de una población N:
 * e = Z·√[p(1 − p)/n · (N − n)/(N − 1)]. Es 0 cuando están todos.
 */
export function margenErrorCon(poblacion: number, personas: number, parametros: ParametrosMuestreo): number {
  if (personas <= 0) return Number.NaN;
  if (personas >= poblacion) return 0;
  return (
    parametros.z *
    Math.sqrt((varianzaEsperada(parametros) / personas) * ((poblacion - personas) / (poblacion - 1)))
  );
}

/** Asistentes ÷ convocados, o null si no hubo convocatoria. */
export function proporcionAsistencia(asistentes: number, convocados: number): number | null {
  return convocados > 0 ? asistentes / convocados : null;
}

export type NivelLectura = "cumple" | "moderada" | "cautela";

/**
 * Clasifica el texto de la columna «Lectura» de la hoja «Participación». El
 * criterio lo fija el Excel; aquí solo se reconoce qué categoría escribió.
 */
export function nivelDeLectura(lectura: string): NivelLectura {
  const texto = lectura.toLowerCase();
  if (texto.startsWith("cumple")) return "cumple";
  if (texto.includes("cautela")) return "cautela";
  return "moderada";
}
