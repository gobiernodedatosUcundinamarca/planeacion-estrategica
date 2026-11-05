import "server-only";
import type {
  DocumentoParticipacion,
  JornadaParticipacion,
  ModoCargueParticipacion,
  RegistroParticipacion,
  ResultadoCargueParticipacion,
} from "@/types/participacion";
import { getParticipacionDataSource } from "./datasource";
import { unidadRegionalPorFecha } from "@/lib/reglas/participacion";

/**
 * Única capa de acceso a las tandas de asistencia de Participación
 * ("Trabajo en territorio con la comunidad universitaria" - Participación).
 */
export function getDocumentosParticipacion(): Promise<DocumentoParticipacion[]> {
  return getParticipacionDataSource().getDocumentos();
}

/** Cada día con asistencia registrada y su lugar de desarrollo. */
export function getJornadasParticipacion(): Promise<JornadaParticipacion[]> {
  return getParticipacionDataSource().getJornadas();
}

/**
 * La unidad regional de cada día de jornada ("aaaa-mm-dd" → "SEDE
 * FUSAGASUGÁ"), para ubicar las respuestas de los formularios que se llenaron
 * al cierre de las jornadas (ver `unidadRegionalPorFecha`).
 */
export async function getUnidadRegionalPorFecha(): Promise<Map<string, string>> {
  return unidadRegionalPorFecha(await getJornadasParticipacion());
}

/** Todos los registros de asistencia publicados, de todas las tandas cargadas. */
export function getRegistrosParticipacion(): Promise<RegistroParticipacion[]> {
  return getParticipacionDataSource().getRegistros();
}

/**
 * Valida y guarda un archivo de asistencia. Según `modo`, se suma a lo que ya
 * había o lo reemplaza por completo.
 */
export function guardarDocumentoParticipacion(
  nombreOriginal: string,
  contenido: Buffer,
  modo: ModoCargueParticipacion
): Promise<ResultadoCargueParticipacion> {
  return getParticipacionDataSource().guardar(nombreOriginal, contenido, modo);
}

/**
 * El .xlsx con toda la asistencia —cédula incluida—, las tandas y un resumen
 * por jornada, para la descarga de /admin. Trae datos personales que el
 * dashboard no publica: quien lo llame debe haber comprobado la sesión.
 */
export function generarExcelParticipacion(): Promise<Buffer> {
  return getParticipacionDataSource().exportar();
}

/** Borra una tanda de asistencia, o todas si se pasa null. */
export function eliminarRegistrosParticipacion(documentoId: number | null): Promise<number> {
  return getParticipacionDataSource().eliminar(documentoId);
}
