import "server-only";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { KahootMomento5 } from "@/types/momento5-kahoot";
import type { Momento5KahootDataSource } from "./types";
import { CacheArchivo } from "./infrastructure/cache-archivo";
import { hojaAMatriz, leerLibro } from "./infrastructure/excel";
import { HOJAS_KAHOOT, interpretarKahoot } from "./momento5-kahoot-formato";

/** Un reporte de Kahoot es el libro que trae la hoja «Quiz Details». */
export function esReporteKahoot(hojas: string[]): boolean {
  return hojas.includes("Quiz Details");
}

/**
 * El reporte del Kahoot de la Actividad 3 del Momento 5. Vive junto a las
 * exportaciones de Forms (`data/forms_momento_5`) y se reconoce por sus hojas,
 * no por el nombre. Se lee en vivo; sin reporte devuelve null.
 */
export class ExcelMomento5KahootDataSource implements Momento5KahootDataSource {
  private readonly cache: CacheArchivo<KahootMomento5 | null>;

  constructor(directorio = join(process.cwd(), "data", "forms_momento_5")) {
    const rutas = () =>
      existsSync(directorio)
        ? readdirSync(directorio)
            .filter((a) => a.toLowerCase().endsWith(".xlsx") && !a.startsWith("~$"))
            .sort()
            .map((a) => join(directorio, a))
        : [];
    this.cache = new CacheArchivo(rutas, () => {
      for (const ruta of rutas()) {
        const libro = leerLibro(ruta);
        if (esReporteKahoot(libro.SheetNames)) {
          return interpretarKahoot(Object.fromEntries(HOJAS_KAHOOT.map((h) => [h, hojaAMatriz(libro, h)])));
        }
      }
      return null;
    });
  }

  getKahoot(): KahootMomento5 | null {
    return this.cache.obtener();
  }
}
