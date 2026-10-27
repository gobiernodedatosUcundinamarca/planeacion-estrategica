import "server-only";
import type {
  DocumentoAportes,
  RespuestaAporte,
  ResultadoCargueAportes,
} from "@/types/aportes";
import { getAportesDataSource } from "./datasource";

/**
 * Única capa de acceso a los aportes generales al Plan (el formulario abierto
 * de UCUNDINAMARCA, que no valora ninguna transformación).
 */
export function getDocumentoAportes(): Promise<DocumentoAportes | null> {
  return getAportesDataSource().getDocumento();
}

/** Los aportes publicados, del más reciente al más antiguo. */
export function getAportes(): Promise<RespuestaAporte[]> {
  return getAportesDataSource().getAportes();
}

/** Valida y guarda el archivo; reemplaza los aportes anteriores. */
export function guardarDocumentoAportes(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueAportes> {
  return getAportesDataSource().guardar(nombreOriginal, contenido);
}

/** Agrega solo los aportes nuevos del export, sin sobrescribir los anteriores. */
export function actualizarDocumentoAportes(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueAportes> {
  return getAportesDataSource().actualizar(nombreOriginal, contenido);
}

/** Borra los aportes cargados. */
export function eliminarAportes(): Promise<number> {
  return getAportesDataSource().eliminar();
}
