/**
 * Formato y criterios de la "Encuesta diagnóstica sobre uso de Inteligencia
 * Artificial en procesos administrativos". La respondieron administrativos en
 * las jornadas en territorio, así que no lleva filtro de rol: todos tienen el
 * mismo. Vive en `lib/reglas/` porque lo usan el servidor que valida el archivo
 * y el panel que lo resume.
 */
import type { NivelEscala } from "./formularios";

export const TITULO_IA_ADMINISTRATIVOS = "Uso de IA en procesos administrativos";

export const SUBTITULO_IA_ADMINISTRATIVOS =
  "Encuesta diagnóstica sobre uso de Inteligencia Artificial en procesos administrativos: cuánto y cómo se usa, qué competencias se tienen, qué la frena y qué apoyo se necesita.";

/**
 * Cada pregunta del formulario: el campo con que se guarda, el inicio del
 * encabezado con que se reconoce (Forms a veces agrega espacios o un salto de
 * línea al final) y el texto que se muestra.
 */
export const PREGUNTAS_IA = {
  dependencia: { inicio: "Unidad o dependencia en la que trabaja", texto: "Unidad o dependencia en la que trabaja" },
  tipoFunciones: { inicio: "Tipo de funciones que desarrolla", texto: "Tipo de funciones que desarrolla principalmente" },
  usoIa: {
    inicio: "¿Ha utilizado herramientas de inteligencia artificial",
    texto: "¿Ha utilizado herramientas de IA para apoyar actividades de su trabajo?",
  },
  frecuencia: { inicio: "¿Con qué frecuencia utiliza IA", texto: "¿Con qué frecuencia utiliza IA en actividades laborales?" },
  herramientas: { inicio: "¿Qué herramientas de IA utiliza", texto: "Herramientas de IA que utiliza" },
  actividades: { inicio: "¿Para cuáles actividades utiliza", texto: "Actividades para las que usa o ha usado IA" },
  formaUso: { inicio: "Cuando utiliza IA, ¿cuál de estas situaciones", texto: "Forma de uso que mejor lo describe" },
  competenciaInstrucciones: {
    inicio: "Instrucción Formular instrucciones claras",
    texto: "Formular instrucciones claras a una herramienta de IA",
  },
  competenciaEvaluar: {
    inicio: "Evaluar si una respuesta de IA es correcta",
    texto: "Evaluar si una respuesta de IA es correcta o confiable",
  },
  competenciaAnalizar: {
    inicio: "Utilizar IA para analizar información",
    texto: "Utilizar IA para analizar información o datos",
  },
  competenciaNoApropiado: {
    inicio: "Identificar cuándo no es apropiado",
    texto: "Identificar cuándo no es apropiado utilizar IA",
  },
  competenciaProteger: {
    inicio: "Proteger información institucional",
    texto: "Proteger información institucional, personal o confidencial al usar IA",
  },
  beneficios: { inicio: "Cuando utiliza IA, ¿qué beneficios", texto: "Beneficios que ha experimentado" },
  cambio: {
    inicio: "En términos generales, ¿cuánto considera",
    texto: "¿Cuánto ha cambiado la IA su forma de trabajar?",
  },
  dificultades: { inicio: "¿Qué le dificulta utilizar más", texto: "Lo que dificulta usar más o mejor la IA (máximo 3)" },
  claridad: {
    inicio: "¿Tiene claridad sobre las orientaciones institucionales",
    texto: "¿Tiene claridad sobre las orientaciones institucionales para el uso responsable y seguro de IA?",
  },
  potencial: {
    inicio: "Pensando en sus funciones actuales",
    texto: "Actividades en las que la IA podría ayudar más, aunque aún no la use para ello",
  },
  apoyo: { inicio: "¿Qué tipo de apoyo considera prioritario", texto: "Apoyo prioritario para fortalecer el uso de IA (máximo 2)" },
  tareaRepetitiva: {
    inicio: "Mencione una tarea o proceso",
    texto: "Tarea o proceso que toma mucho tiempo o es repetitivo y podría mejorar con IA",
  },
} as const;

export type CampoIa = keyof typeof PREGUNTAS_IA;

/** Las cinco competencias que se autoevalúan, en el orden del formulario. */
export const COMPETENCIAS_IA = [
  "competenciaInstrucciones",
  "competenciaEvaluar",
  "competenciaAnalizar",
  "competenciaNoApropiado",
  "competenciaProteger",
] as const satisfies readonly CampoIa[];

/** Columnas sin las que no se acepta el archivo, para mostrarlas en /admin. */
export const COLUMNAS_IA_ADMINISTRATIVOS: readonly string[] = [
  "ID",
  "Hora de inicio",
  "Hora de finalización",
  ...Object.values(PREGUNTAS_IA).map((p) => p.inicio),
];

export const ESCALA_USO: readonly NivelEscala[] = [
  { etiqueta: "Sí, frecuentemente" },
  { etiqueta: "Sí, ocasionalmente" },
  { etiqueta: "Las he probado, pero casi no las uso" },
  { etiqueta: "No las he utilizado" },
];

/** Quienes usan IA en su trabajo: las dos respuestas afirmativas. */
export const NIVELES_USA_IA = ["Sí, frecuentemente", "Sí, ocasionalmente"] as const;

export const ESCALA_FRECUENCIA: readonly NivelEscala[] = [
  { etiqueta: "Todos o casi todos los días" },
  { etiqueta: "Varias veces por semana" },
  { etiqueta: "Varias veces al mes" },
  { etiqueta: "Esporádicamente" },
  { etiqueta: "Nunca" },
];

/** Uso al menos semanal. */
export const NIVELES_USO_SEMANAL = ["Todos o casi todos los días", "Varias veces por semana"] as const;

/**
 * Forma de uso como escalera de madurez: de quien automatiza con IA a quien
 * solo hace preguntas sencillas. No es una escala del formulario sino el orden
 * en que se leen sus opciones, de más a menos avanzado.
 */
export const ESCALA_FORMA_USO: readonly NivelEscala[] = [
  { etiqueta: "He creado o configurado automatizaciones, asistentes o soluciones apoyadas en IA" },
  { etiqueta: "Integro la IA en varias etapas de mi trabajo para mejorar procesos o resultados" },
  { etiqueta: "Sé dar instrucciones detalladas para obtener mejores resultados" },
  { etiqueta: "Comparo, verifico y ajusto las respuestas antes de utilizarlas" },
  { etiqueta: "Hago preguntas sencillas y utilizo principalmente las respuestas obtenidas" },
  { etiqueta: "No utilizo IA", fueraDeEscala: true },
];

export const ESCALA_COMPETENCIA: readonly NivelEscala[] = [
  { etiqueta: "Muy Alta" },
  { etiqueta: "Alta" },
  { etiqueta: "Media" },
  { etiqueta: "Baja" },
  { etiqueta: "Ninguna" },
];

/** Dominio alto de una competencia. */
export const NIVELES_COMPETENCIA_ALTA = ["Muy Alta", "Alta"] as const;

export const ESCALA_CAMBIO: readonly NivelEscala[] = [
  { etiqueta: "Mucho" },
  { etiqueta: "Bastante" },
  { etiqueta: "Algo" },
  { etiqueta: "Muy poco" },
  { etiqueta: "Nada" },
  { etiqueta: "No utilizo IA", fueraDeEscala: true },
];

export const NIVELES_CAMBIO_ALTO = ["Mucho", "Bastante"] as const;

/**
 * Palabras que repite la pregunta de la tarea repetitiva ("una tarea o proceso
 * que le tome mucho tiempo") y que no distinguen un tema. Se ignoran al agrupar
 * (ver `agruparPorTema`).
 */
export const PALABRAS_SIN_TEMA_TAREA = [
  "tarea",
  "tareas",
  "proceso",
  "procesos",
  "tiempo",
  "mucho",
  "trabajo",
  "repetitivo",
  "repetitiva",
  "repetitivas",
  "actualmente",
  "mejorar",
  "podría",
  "inteligencia",
  "artificial",
] as const;

export const ESCALA_CLARIDAD: readonly NivelEscala[] = [
  { etiqueta: "Sí, completamente" },
  { etiqueta: "Parcialmente" },
  { etiqueta: "He escuchado sobre ellas, pero no las conozco" },
  { etiqueta: "No las conozco" },
  { etiqueta: "No sé si existen" },
];
