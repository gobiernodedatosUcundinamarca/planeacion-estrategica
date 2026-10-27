import "server-only";
import type {
  ClusterComentarios,
  DocumentoMomento4,
  RespuestaMomento4,
  ResultadoCargue,
} from "@/types/momento4";
import { getMomento4DataSource } from "./datasource";

/**
 * Única capa de acceso a los documentos del Momento 4
 * ("Transformaciones que nos conectan"): el estado de las 5 casillas y el
 * cargue de un documento nuevo.
 */
export function getDocumentosMomento4(): Promise<DocumentoMomento4[]> {
  return getMomento4DataSource().getDocumentos();
}

/** Todas las respuestas publicadas, para la sección del Momento 4. */
export function getRespuestasMomento4(): Promise<RespuestaMomento4[]> {
  return getMomento4DataSource().getRespuestas();
}

/** Grupos temáticos vigentes de los comentarios abiertos. */
export function getClustersMomento4(): Promise<ClusterComentarios[]> {
  return getMomento4DataSource().getClusters();
}

/**
 * Valida y guarda el documento de una transformación. El resultado dice si se
 * aceptó y por qué, para mostrárselo a quien lo subió.
 */
export function guardarDocumentoMomento4(
  idTransformacion: string,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargue> {
  return getMomento4DataSource().guardar(idTransformacion, nombreOriginal, contenido);
}

/**
 * Agrega a una transformación solo las respuestas nuevas del export, sin
 * sobrescribir las que ya estaban.
 */
export function actualizarDocumentoMomento4(
  idTransformacion: string,
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargue> {
  return getMomento4DataSource().actualizar(idTransformacion, nombreOriginal, contenido);
}

/**
 * Borra los registros cargados: los de una transformación, o los de todas si
 * se pasa null. Devuelve cuántas respuestas se eliminaron.
 */
export function eliminarRegistrosMomento4(idTransformacion: string | null): Promise<number> {
  return getMomento4DataSource().eliminar(idTransformacion);
}
