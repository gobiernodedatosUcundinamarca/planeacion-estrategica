/**
 * Descargas en Excel de cada sección del panel, y el registro con que se
 * auditan. Las descargas son públicas (cualquiera que vea la sección puede
 * bajar sus respuestas), así que todo lo que sale por aquí es anónimo.
 */

/** Valor de una celda de una hoja de descarga. */
export type CeldaDescarga = string | number | null;

/** Una hoja del Excel: título, notas y la tabla (la primera fila son los encabezados). */
export interface HojaDescarga {
  /** Máximo 31 caracteres: límite de Excel para el nombre de una hoja. */
  nombre: string;
  titulo: string;
  notas?: string[];
  filas: CeldaDescarga[][];
  /** Índices de columnas con fechas "aaaa-mm-dd", que se escriben como fecha real. */
  columnasFecha?: number[];
}

/** Cómo terminó una petición de descarga. Se guarda tal cual en el registro. */
export type ResultadoDescarga =
  | "entregada"
  | "limite_ip"
  | "limite_global"
  | "no_publicada"
  | "no_existe"
  | "error";

/** Un evento del registro de descargas, tal como se escribe. */
export interface EventoDescarga {
  seccion: string;
  /** HMAC de la IP: permite contar por visitante sin guardar su dirección. */
  ipHash: string;
  resultado: ResultadoDescarga;
  bytes: number | null;
  milisegundos: number | null;
  /** Si el archivo salió de la copia en memoria en vez de generarse. */
  desdeCache: boolean;
}

/** Lo que muestra /admin del registro. */
export interface RegistroDescargas {
  dias: number;
  porSeccion: { seccion: string; entregadas: number; rechazadas: number; kilobytes: number }[];
  recientes: {
    fecha: string;
    seccion: string;
    resultado: ResultadoDescarga;
    /** Los primeros caracteres del hash: distingue visitantes sin identificarlos. */
    visitante: string;
    kilobytes: number | null;
    milisegundos: number | null;
    desdeCache: boolean;
  }[];
  /** Visitantes con más peticiones en el periodo: es donde se vería un abuso. */
  visitantesMasActivos: { visitante: string; peticiones: number; rechazadas: number }[];
}
