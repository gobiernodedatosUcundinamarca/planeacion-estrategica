/**
 * Límites de las descargas en Excel. Viven en `lib/reglas/` porque los usan el
 * servidor —que los hace cumplir— y el botón de descarga —que los explica
 * cuando alguien llega al tope—.
 *
 * Los números salen de cuánto cuesta una descarga (medido: la más pesada,
 * Transformaciones con ~3.900 respuestas, tarda menos de un segundo en
 * generarse y pesa unos cientos de KB) y de cuánto la necesita alguien de
 * verdad: nadie baja el mismo archivo diez veces en diez minutos.
 */

/** Descargas que puede pedir un mismo visitante (por IP) en la ventana. */
export const LIMITE_DESCARGAS_POR_VISITANTE = 10;
export const VENTANA_VISITANTE_MINUTOS = 10;

/**
 * Tope para todo el sitio, sumando a todos los visitantes. Es el que acota el
 * consumo si muchas IP distintas descargan a la vez: por encima, el sitio deja
 * de generar archivos hasta que pase la hora.
 */
export const LIMITE_DESCARGAS_GLOBAL = 300;
export const VENTANA_GLOBAL_MINUTOS = 60;

/**
 * Peso máximo de un archivo. Vercel corta las respuestas de una función por
 * encima de ~4,5 MB; si una sección creciera hasta ahí, mejor un error claro
 * que una descarga rota.
 */
export const BYTES_MAXIMOS_DESCARGA = 4 * 1024 * 1024;

/** Días que se conserva el registro de descargas. */
export const DIAS_REGISTRO_DESCARGAS = 180;

/**
 * Identificador de la descarga de una sección: su ruta sin barras
 * ("/encuesta/participacion" → "encuesta-participacion"). Sale de la ruta para
 * que el botón y el servidor no tengan que mantener otra lista.
 */
export function slugDeRuta(ruta: string): string {
  return ruta.replace(/^\//, "").replace(/\//g, "-");
}

/** Texto que acompaña a cada descarga pública: qué trae y qué no. */
export const AVISO_ANONIMATO =
  "Datos anónimos: no incluye nombres, correos ni documentos. Donde hace falta distinguir personas se usa un seudónimo (Participante 001…).";
