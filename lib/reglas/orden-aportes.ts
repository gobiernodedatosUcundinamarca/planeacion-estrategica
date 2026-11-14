/**
 * Orden de lectura, no una calificación del valor estratégico de las respuestas.
 * Prioriza indicios explícitos de propuestas, necesidades o problemas; después
 * presenta otras observaciones, reconocimientos genéricos y textos sin contenido.
 * No infiere importancia estadística ni premia la extensión o el tono positivo.
 * Dentro de cada grupo conserva el orden de la fuente y todos sus registros.
 */
const GENERICAS = new Set([
  'gracias', 'agradecimiento', 'agradecimientos', 'felicitaciones', 'felicidades',
  'excelente', 'excelentes', 'bueno', 'buena', 'buenos', 'buenas', 'buen',
  'muy', 'todo', 'todos', 'bien', 'actividad', 'actividades', 'experiencia',
  'experiencias', 'plan', 'estrategico', 'universidad', 'universitaria',
  'universitario', 'evento', 'charla', 'iniciativa', 'gran', 'apuesta',
  'institucional', 'mejorar', 'mejora', 'de', 'por', 'para', 'la', 'el', 'los',
  'las', 'y', 'un', 'una', 'que', 'se', 'su', 'lo', 'a', 'al', 'del', 'en',
  'con', 'mas', 'es', 'esta', 'este', 'esto', 'estos', 'estas',
  'interesante', 'interesantes', 'orientacion', 'presentacion', 'ejercicio',
  'excelentemente', 'exelente', 'genial', 'perfecto', 'perfecta', 'agradable',
  'enriquecedora', 'enriquecedor', 'encuentro', 'encuentros', 'reunion',
  'nos', 'tenernos', 'tener', 'tengan', 'tienen', 'cuenta', 'encuenta',
  'muchas', 'muchos', 'mucho', 'siempre', 'todo', 'tan', 'super',
]);

// Señales de lectura, no etiquetas analíticas ni sustitutos de la clasificación oficial.
const PROPUESTA_O_PROBLEMA = /\b(?:mejor\w*|fortalec\w*|implement\w*|ampli\w*|invert\w*|automatiz\w*|simplific\w*|articul\w*|propon\w*|propongo|sugier\w*|suger\w*|recom\w*|neces\w*|deber\w*|podri\w*|permit\w*|foment\w*|prioriz\w*|garantiz\w*|reduc\w*|aument\w*|crear|creacion|realizar|enfocar|abrir|incorpor\w*|falta\w*|insuficien\w*|deficien\w*|problema\w*|limitacion\w*|dificultad\w*|demasiad\w*)\b|\bno (?:hay|cuenta|funciona|es eficiente|dejen)\b|\bmala gestion\b/;

function ordenLectura(texto: string): number {
  const normalizado = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!normalizado || /^(?:n a|na|nada|ninguna?|ninguno|no|no aplica|gg|ok|okay|sin (?:comentarios?|respuesta|aportes?)|no tengo (?:comentarios?|aportes?|sugerencias?)|ningun aporte)$/.test(normalizado) || /^(\p{L})\1{2,}$/u.test(normalizado)) return 3;
  const palabras = normalizado.split(/\s+/).filter(p => !/^\d+$/.test(p));
  if (!palabras.length) return 3;
  if (palabras.every(p => GENERICAS.has(p))) return 2;
  return PROPUESTA_O_PROBLEMA.test(normalizado) ? 0 : 1;
}

export function ordenarAportesParaLectura<T extends { aporte: string }>(aportes: readonly T[]): T[] {
  return aportes.map((aporte, indice) => ({ aporte, indice, orden: ordenLectura(aporte.aporte) }))
    .sort((a, b) => a.orden - b.orden || a.indice - b.indice)
    .map(item => item.aporte);
}
