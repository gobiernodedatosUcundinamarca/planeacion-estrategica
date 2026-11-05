import "server-only";
import type { EventoDescarga, HojaDescarga, RegistroDescargas } from "@/types/descargas";
import type { DescargasDataSource } from "./types";
import { conexionSql } from "./infrastructure/neon";
import { escribirLibro } from "./infrastructure/excel";
import { consultarRegistro, contarRecientes, huellaTablas, registrarEvento } from "./descargas-almacen";

/**
 * Escritura de los Excel de descarga (con `infrastructure/excel.ts`, la única
 * puerta a las librerías de Excel) y registro de cada petición en Postgres.
 */
export class PostgresDescargasDataSource implements DescargasDataSource {
  escribirExcel(hojas: HojaDescarga[]): Promise<Buffer> {
    return escribirLibro(hojas);
  }

  contarRecientes(
    ipHash: string,
    minutosVisitante: number,
    minutosGlobal: number
  ): Promise<{ visitante: number; global: number }> {
    return contarRecientes(conexionSql(), ipHash, minutosVisitante, minutosGlobal);
  }

  huellaTablas(tablas: readonly string[]): Promise<string> {
    return huellaTablas(conexionSql(), tablas);
  }

  registrar(evento: EventoDescarga): Promise<void> {
    return registrarEvento(conexionSql(), evento);
  }

  getRegistro(dias: number, diasConservacion: number): Promise<RegistroDescargas> {
    return consultarRegistro(conexionSql(), dias, diasConservacion);
  }
}
