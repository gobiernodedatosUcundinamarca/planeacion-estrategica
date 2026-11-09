/**
 * Formato y criterios del "Instrumento de valoración de la experiencia
 * «Transformaciones que nos conectan»", que se respondió al cierre de cada
 * jornada en territorio. Vive en `lib/reglas/` porque lo usan el servidor que
 * valida el archivo y el panel que lo resume.
 */
import { normalizar } from "./momento4";
import type { NivelEscala } from "./formularios";

export const TITULO_VALORACION_TERRITORIO = "Valoración de la experiencia en territorio";

export const SUBTITULO_VALORACION_TERRITORIO =
  "Instrumento de valoración de la experiencia “Transformaciones que nos conectan”: qué tanto ayudó a comprender las cinco Transformaciones Estratégicas y qué mejorar.";

/** Las preguntas de acuerdo, en el orden del formulario. */
export const AFIRMACIONES_VALORACION = [
  {
    campo: "comprension",
    corta: "Comprender las cinco transformaciones",
    // El inicio de la pregunta: basta para reconocer la columna aunque Forms
    // recorte o retoque el final del encabezado.
    inicio: "La experiencia me permitió comprender las cinco Transformaciones",
    texto:
      "La experiencia me permitió comprender las cinco Transformaciones Estratégicas propuestas para la UCundinamarca.",
  },
  {
    campo: "misionVision",
    corta: "Claridad sobre hacia dónde se proyecta la universidad",
    inicio: "La presentación de la misión y la visión",
    texto:
      "La presentación de la misión y la visión, junto con las cinco Transformaciones Estratégicas, me permitió comprender con mayor claridad hacia dónde se proyecta la UCundinamarca.",
  },
  {
    campo: "dinamica",
    corta: "La dinámica (MCA) favoreció la participación",
    inicio: "La dinámica de la experiencia",
    texto:
      "La dinámica de la experiencia, desarrollada desde la MCA —preguntas provocadoras, diálogo en las mesas, revelación de las transformaciones, construcción del rompecabezas y cierre— favoreció mi participación.",
  },
] as const;

export type CampoAfirmacion = (typeof AFIRMACIONES_VALORACION)[number]["campo"];

export const COLUMNA_TIPO_ACTOR = "Tipo de actor";
export const COLUMNA_MEJORA = "¿Qué aspecto de esta experiencia considera que podríamos mejorar?";

/**
 * Columnas sin las que no se acepta el archivo, para mostrarlas en /admin. Se
 * reconocen por el inicio del encabezado, no por la posición.
 */
export const COLUMNAS_VALORACION_TERRITORIO: readonly string[] = [
  "ID",
  "Hora de inicio",
  "Hora de finalización",
  COLUMNA_TIPO_ACTOR,
  ...AFIRMACIONES_VALORACION.map((a) => a.inicio),
  COLUMNA_MEJORA,
];

/** Escala de acuerdo, del grado más alto al más bajo. */
export const ESCALA_ACUERDO: readonly NivelEscala[] = [
  { etiqueta: "Totalmente de acuerdo" },
  { etiqueta: "De acuerdo" },
  { etiqueta: "Ni de acuerdo ni en desacuerdo" },
  { etiqueta: "En desacuerdo" },
  { etiqueta: "Totalmente en desacuerdo" },
];

/** Los dos niveles que cuentan como valoración favorable. */
export const NIVELES_FAVORABLES = ["Totalmente de acuerdo", "De acuerdo"] as const;

/**
 * Nombre visible de cada tipo de actor. El formulario los trae en singular
 * ("Creador de Oportunidades"); se muestran en plural, como en el resto del
 * sitio (Transformaciones, Participación, Encuesta). En la base quedan como
 * vienen.
 */
const NOMBRE_VISIBLE_ACTOR: Record<string, string> = {
  "CREADOR DE OPORTUNIDADES": "Creadores de Oportunidades",
  "GESTOR DEL CONOCIMIENTO Y EL APRENDIZAJE": "Gestores del Conocimiento y el Aprendizaje",
  ADMINISTRATIVO: "Administrativos",
  GRADUADO: "Graduados",
};

export const ACTOR_SIN_ESPECIFICAR = "Sin especificar";

/**
 * Palabras de las sugerencias de mejora que no dicen QUÉ mejorar: elogios y
 * relleno ("todo estuvo muy bien, excelente"). Se ignoran al agrupar por tema
 * para que no le den nombre a un grupo (ver `agruparPorTema`).
 */
export const PALABRAS_SIN_TEMA_MEJORA = [
  "ninguna",
  "ninguno",
  "nada",
  "todo",
  "todos",
  "bien",
  "buena",
  "bueno",
  "buenas",
  "excelente",
  "excelentes",
  "estuvo",
  "fue",
  "muy",
  "general",
  "gracias",
  "considero",
  "creo",
  "mejorar",
  "mejora",
  "podría",
  "podríamos",
  "experiencia",
  "actividad",
  "actividades",
  "mayor",
  "mejor",
  "más",
] as const;

/**
 * Si una respuesta entra en la sección: debe tener tipo de actor y unidad
 * regional (la de su jornada). Las que no, se dejan fuera de TODA la sección
 * —cifras, gráficos, tablas y descarga— y no solo de los desgloses: si se
 * escondieran solo ahí, las barras por rol y por unidad no sumarían el total
 * de arriba. La sección dice cuántas quedaron fuera y por qué.
 */
export function entraEnValoracion(r: { tipoActor: string | null; unidadRegional: string | null }): boolean {
  return Boolean(r.tipoActor?.trim()) && Boolean(r.unidadRegional);
}

export function etiquetaActor(tipoActor: string | null): string {
  const limpio = tipoActor?.trim();
  if (!limpio) return ACTOR_SIN_ESPECIFICAR;
  return NOMBRE_VISIBLE_ACTOR[normalizar(limpio)] ?? limpio;
}
