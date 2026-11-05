import "server-only";
import type {
  DocumentoParticipacion,
  JornadaParticipacion,
  ModoCargueParticipacion,
  RegistroParticipacion,
  ResultadoCargueParticipacion,
} from "@/types/participacion";
import type { ParticipacionDataSource } from "./types";
import { conexionSql } from "./infrastructure/neon";
import {
  consultarDocumentos,
  consultarJornadas,
  consultarRegistros,
  eliminarRegistros,
  generarExcel,
  guardarDocumento,
} from "./participacion-almacen";

/**
 * Las tandas de asistencia de Participación, guardadas en Postgres (Neon).
 * Fachada delgada, igual que `postgres-momento4-source.ts`: la lógica vive en
 * `participacion-almacen.ts` para que el script de migración pueda escribir
 * por el mismo camino sin pasar por "server-only".
 */
export class PostgresParticipacionDataSource implements ParticipacionDataSource {
  getDocumentos(): Promise<DocumentoParticipacion[]> {
    return consultarDocumentos(conexionSql());
  }

  getRegistros(): Promise<RegistroParticipacion[]> {
    return consultarRegistros(conexionSql());
  }

  getJornadas(): Promise<JornadaParticipacion[]> {
    return consultarJornadas(conexionSql());
  }

  guardar(
    nombreOriginal: string,
    contenido: Buffer,
    modo: ModoCargueParticipacion
  ): Promise<ResultadoCargueParticipacion> {
    return guardarDocumento(conexionSql(), nombreOriginal, contenido, modo);
  }

  eliminar(documentoId: number | null): Promise<number> {
    return eliminarRegistros(conexionSql(), documentoId);
  }

  exportar(): Promise<Buffer> {
    return generarExcel(conexionSql());
  }
}
