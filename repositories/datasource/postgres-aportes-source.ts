import "server-only";
import type {
  DocumentoAportes,
  RespuestaAporte,
  ResultadoCargueAportes,
} from "@/types/aportes";
import type { AportesDataSource } from "./types";
import { conexionSql } from "./infrastructure/neon";
import {
  actualizarDocumento,
  consultarAportes,
  consultarDocumento,
  eliminarAportes,
  guardarDocumento,
} from "./aportes-almacen";

/**
 * Los aportes generales al Plan, guardados en Postgres (Neon). Fachada
 * delgada, igual que los demás orígenes de este tipo: la lógica vive en
 * `aportes-almacen.ts` para que los scripts puedan escribir por el mismo
 * camino sin tropezar con "server-only".
 */
export class PostgresAportesDataSource implements AportesDataSource {
  getDocumento(): Promise<DocumentoAportes | null> {
    return consultarDocumento(conexionSql());
  }

  getAportes(): Promise<RespuestaAporte[]> {
    return consultarAportes(conexionSql());
  }

  guardar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueAportes> {
    return guardarDocumento(conexionSql(), nombreOriginal, contenido);
  }

  actualizar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueAportes> {
    return actualizarDocumento(conexionSql(), nombreOriginal, contenido);
  }

  eliminar(): Promise<number> {
    return eliminarAportes(conexionSql());
  }
}
