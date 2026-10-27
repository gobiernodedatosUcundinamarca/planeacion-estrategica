import "server-only";
import type {
  ClusterComentarios,
  DocumentoMomento4,
  RespuestaMomento4,
  ResultadoCargue,
} from "@/types/momento4";
import type { Momento4DataSource } from "./types";
import { conexionSql } from "./infrastructure/neon";
import {
  actualizarDocumento,
  consultarClusters,
  consultarDocumentos,
  consultarRespuestas,
  eliminarRegistros,
  guardarDocumento,
} from "./momento4-almacen";

/**
 * Las respuestas del Momento 4, guardadas en Postgres (Neon).
 *
 * Es el único origen que no lee un Excel en vivo, y es deliberado: el cargue
 * ocurre desde el sitio publicado, donde el sistema de archivos es de solo
 * lectura (Vercel y cualquier entorno serverless), así que un .xlsx en disco no
 * se podría reemplazar. El Excel sigue siendo el formato de entrada —se valida
 * igual, columna por columna— pero lo que queda guardado son sus filas.
 *
 * La clase es una fachada: la lógica vive en `momento4-almacen.ts` para que el
 * script de carga inicial escriba exactamente por el mismo camino (ver la nota
 * sobre "server-only" allí).
 */
export class PostgresMomento4DataSource implements Momento4DataSource {
  getDocumentos(): Promise<DocumentoMomento4[]> {
    return consultarDocumentos(conexionSql());
  }

  getRespuestas(): Promise<RespuestaMomento4[]> {
    return consultarRespuestas(conexionSql());
  }

  getClusters(): Promise<ClusterComentarios[]> {
    return consultarClusters(conexionSql());
  }

  guardar(
    idTransformacion: string,
    nombreOriginal: string,
    contenido: Buffer
  ): Promise<ResultadoCargue> {
    return guardarDocumento(conexionSql(), idTransformacion, nombreOriginal, contenido);
  }

  actualizar(
    idTransformacion: string,
    nombreOriginal: string,
    contenido: Buffer
  ): Promise<ResultadoCargue> {
    return actualizarDocumento(conexionSql(), idTransformacion, nombreOriginal, contenido);
  }

  eliminar(idTransformacion: string | null): Promise<number> {
    return eliminarRegistros(conexionSql(), idTransformacion);
  }
}
