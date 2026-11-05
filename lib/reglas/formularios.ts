/**
 * Criterios comunes a los formularios de Microsoft Forms que se cargan desde
 * /admin como un solo documento (la valoración de la experiencia en territorio
 * y la encuesta de IA a administrativos). Vive en `lib/reglas/` porque lo usan
 * a la vez el servidor —al leer el archivo— y los paneles —al contar—, y dos
 * definiciones distintas harían que el panel y la carga no cuadraran.
 */
import type { TemaComentarios } from "@/types/formularios";
import { normalizar } from "./momento4";

/** Una opción de una escala ordenada, de la más alta a la más baja. */
export interface NivelEscala {
  etiqueta: string;
  /**
   * Opciones que no son un grado de la escala sino una salida de ella ("No
   * utilizo IA", "No sé si existen"): se pintan en gris y al final, porque
   * mezclarlas con los grados haría leer "no uso" como "uso poco".
   */
  fueraDeEscala?: boolean;
}

/** Una barra de un conteo: lo que reciben los gráficos. */
export interface ConteoOpcion {
  etiqueta: string;
  conteo: number;
  /** Sobre quienes respondieron la pregunta, no sobre el total de la encuesta. */
  porcentaje: number;
}

/** Clave de comparación: sin tildes, mayúsculas y solo letras y números. */
export function clave(texto: string): string {
  return normalizar(texto).replace(/[^A-Z0-9]/g, "");
}

/**
 * Respuestas abiertas que no dicen nada: "Ninguna", "N/A", "." o un elogio
 * suelto ("Excelente") donde se pedía qué mejorar. Se comparan sin signos ni
 * espacios, así que "N. A", ",N/A" y "Todo. Muy bien" caen igual. La lista sale
 * de las respuestas reales de los dos formularios.
 */
const SIN_CONTENIDO = new Set(
  [
    "ninguna",
    "ninguno",
    "ningun",
    "ningunk",
    "no ninguno",
    "no ninguna",
    "nada",
    "na",
    "n",
    "no",
    "si",
    "no aplica",
    "no se",
    "sin comentarios",
    "no tengo comentarios",
    "gracias",
    "excelente",
    "excelente experiencia",
    "muy buena",
    "muy buena experiencia",
    "todo bien",
    "todo muy bien",
    "todo esta bien",
    "esta bien",
    "todo ok",
    "ok",
    "todos fueron importantes",
  ].map(clave)
);

/** Si una respuesta abierta trae algo que leer. */
export function esTextoConContenido(texto: string | null): boolean {
  const k = clave(texto ?? "");
  return k.length > 1 && !/^\d+$/.test(k) && !SIN_CONTENIDO.has(k);
}

/**
 * Si la agrupación automática separa de verdad los textos. Con respuestas
 * cortas y parecidas, K-Means a veces deja casi todo en un grupo y aparta dos
 * o tres textos raros: mostrar eso como "temas" haría creer que hay una
 * clasificación donde no la hay. Se exige al menos tres temas y que ninguno
 * reúna más de las tres cuartas partes.
 */
export function sonTemasUtiles(temas: TemaComentarios[]): boolean {
  const total = temas.reduce((suma, t) => suma + t.total, 0);
  return temas.length >= 3 && total > 0 && Math.max(...temas.map((t) => t.total)) / total <= 0.75;
}

/** Las opciones marcadas en una pregunta de selección múltiple ("A;B;C;"). */
export function separarOpciones(texto: string | null): string[] {
  return (texto ?? "")
    .split(";")
    .map((opcion) => opcion.trim())
    .filter(Boolean);
}

/**
 * Por debajo de cuántas menciones una opción escrita a mano ("Otra: …") se
 * agrupa en "Otras respuestas". Las opciones del formulario reúnen decenas de
 * menciones y lo escrito a mano casi nunca pasa de dos; mostrarlo barra por
 * barra llenaría el gráfico de variantes de una sola persona ("Notebooklm",
 * "Notebook Lm"…).
 */
export const MINIMO_MENCIONES = 3;

export const OTRAS_RESPUESTAS = "Otras respuestas";

/**
 * Cuántas personas marcaron cada opción de una pregunta de selección múltiple
 * (o de una de selección única con "Otra"). El porcentaje es sobre quienes
 * respondieron la pregunta, así que las barras pueden sumar más de 100 %.
 */
export function contarOpciones(respuestas: (string | null)[]): ConteoOpcion[] {
  const conRespuesta = respuestas.filter((r) => separarOpciones(r).length > 0);
  const total = conRespuesta.length;
  const grupos = new Map<string, { etiqueta: string; conteo: number }>();

  for (const respuesta of conRespuesta) {
    // Una persona cuenta una vez por opción aunque la repita.
    const propias = new Map(separarOpciones(respuesta).map((o) => [clave(o), o]));
    for (const [k, etiqueta] of propias) {
      const grupo = grupos.get(k);
      if (grupo) grupo.conteo += 1;
      else grupos.set(k, { etiqueta, conteo: 1 });
    }
  }

  const principales = [...grupos.values()].filter((g) => g.conteo >= MINIMO_MENCIONES);
  const otras = conRespuesta.filter((r) =>
    separarOpciones(r).some((o) => (grupos.get(clave(o))?.conteo ?? 0) < MINIMO_MENCIONES)
  ).length;

  return [
    ...principales.map((g) => ({ ...g, porcentaje: total > 0 ? (g.conteo / total) * 100 : 0 })),
    ...(otras > 0
      ? [{ etiqueta: OTRAS_RESPUESTAS, conteo: otras, porcentaje: (otras / total) * 100 }]
      : []),
  ].sort((a, b) =>
    a.etiqueta === OTRAS_RESPUESTAS ? 1 : b.etiqueta === OTRAS_RESPUESTAS ? -1 : b.conteo - a.conteo
  );
}

/**
 * Cuántas respuestas cayeron en cada nivel de una escala, en el orden de la
 * escala. Lo que no coincide con ningún nivel se cuenta aparte, al final, para
 * que las barras sigan sumando el total y un cambio en el formulario se note.
 */
export function distribucionEscala(
  respuestas: (string | null)[],
  escala: readonly NivelEscala[]
): (ConteoOpcion & { fueraDeEscala: boolean })[] {
  const validas = respuestas.filter((r): r is string => Boolean(r?.trim()));
  const total = validas.length;
  const porNivel = new Map(escala.map((n) => [clave(n.etiqueta), 0]));
  let otras = 0;

  for (const respuesta of validas) {
    const k = clave(respuesta);
    if (porNivel.has(k)) porNivel.set(k, porNivel.get(k)! + 1);
    else otras += 1;
  }

  const porcentaje = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return [
    ...escala.map((n) => {
      const conteo = porNivel.get(clave(n.etiqueta)) ?? 0;
      return { etiqueta: n.etiqueta, conteo, porcentaje: porcentaje(conteo), fueraDeEscala: Boolean(n.fueraDeEscala) };
    }),
    ...(otras > 0
      ? [{ etiqueta: OTRAS_RESPUESTAS, conteo: otras, porcentaje: porcentaje(otras), fueraDeEscala: true }]
      : []),
  ];
}

/** Si una respuesta corresponde a alguno de esos niveles de la escala. */
export function estaEnNiveles(respuesta: string | null, niveles: readonly string[]): boolean {
  const k = clave(respuesta ?? "");
  return k.length > 0 && niveles.some((n) => clave(n) === k);
}

/**
 * Color de cada nivel con la rampa ordinal del proyecto (`--valoracion-1` a
 * `--valoracion-5`, de claro a oscuro): el nivel más alto es el más oscuro.
 * Los niveles fuera de escala van en gris.
 */
export function coloresEscala(niveles: { fueraDeEscala: boolean }[]): string[] {
  const enEscala = niveles.filter((n) => !n.fueraDeEscala).length;
  let posicion = 0;
  return niveles.map((n) => {
    if (n.fueraDeEscala) return "var(--muted-foreground)";
    // El primero es el más alto: va al 5; el último, al 1.
    const paso = enEscala > 1 ? (enEscala - 1 - posicion) / (enEscala - 1) : 1;
    posicion += 1;
    return `var(--valoracion-${Math.round(1 + paso * 4)})`;
  });
}
