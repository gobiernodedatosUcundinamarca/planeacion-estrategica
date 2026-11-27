import "server-only";
import { join } from "node:path";
import type { Actividad2Momento5 } from "@/types/momento5-actividad2";
import type { Momento5Actividad2DataSource } from "./types";
import { CacheArchivo } from "./infrastructure/cache-archivo";
import { hojaAMatriz, leerLibro } from "./infrastructure/excel";
import { HOJAS_ACTIVIDAD2, interpretarActividad2 } from "./momento5-actividad2-formato";

/**
 * Actividad 2 del Momento 5, transcrita literalmente de las fichas por mesa y
 * de Mentimeter a `actividad2.xlsx` (ver docs/decisions/0005). Se lee en vivo:
 * corregir una celda se refleja en la siguiente petición, sin reiniciar.
 */
export class ExcelMomento5Actividad2DataSource implements Momento5Actividad2DataSource {
  private readonly cache: CacheArchivo<Actividad2Momento5>;

  constructor(directorio = join(process.cwd(), "data", "source-momento5-actividad2")) {
    const ruta = join(directorio, "actividad2.xlsx");
    this.cache = new CacheArchivo([ruta], () => {
      const libro = leerLibro(ruta);
      return interpretarActividad2(Object.fromEntries(HOJAS_ACTIVIDAD2.map((h) => [h, hojaAMatriz(libro, h)])));
    });
  }

  getActividad2(): Actividad2Momento5 {
    return this.cache.obtener();
  }
}
