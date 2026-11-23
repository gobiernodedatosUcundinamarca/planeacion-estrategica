import "server-only";
import { join } from "node:path";
import type { ResultadosMomento5 } from "@/types/momento5";
import type { Momento5DataSource } from "./types";
import { CacheArchivo } from "./infrastructure/cache-archivo";
import { leerJson } from "./infrastructure/json";
import { normalizarResultadosMomento5 } from "./momento5-formato";

/**
 * Resultados del Momento 5 del CAI, tal como los entrega el proyecto de
 * análisis en `resultados.json` (ver docs/decisions/0003). Se lee en vivo:
 * reemplazar el archivo se refleja en la siguiente petición, sin reiniciar.
 */
export class JsonMomento5DataSource implements Momento5DataSource {
  private readonly cache: CacheArchivo<ResultadosMomento5>;

  constructor(directorio = join(process.cwd(), "data", "source-momento5-cai")) {
    const ruta = join(directorio, "resultados.json");
    this.cache = new CacheArchivo([ruta], () => normalizarResultadosMomento5(leerJson(ruta)));
  }

  getResultados(): ResultadosMomento5 {
    return this.cache.obtener();
  }
}
