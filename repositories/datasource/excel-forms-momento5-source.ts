import "server-only";
import { existsSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { FormularioEnviadoMomento5 } from "@/types/momento5";
import type { FormulariosMomento5DataSource } from "./types";
import { CacheArchivo } from "./infrastructure/cache-archivo";
import { celdasCombinadas, hojaAMatriz, leerLibro } from "./infrastructure/excel";
import { interpretarExportacionForms } from "./forms-momento5-formato";

/**
 * Las exportaciones de Microsoft Forms de los cinco formularios del Momento 5,
 * tal como se descargaron de Forms (`data/forms_momento_5`, ver
 * docs/decisions/0004). Alimentan solo la descarga en Excel de la sección: las
 * cifras de la página salen de `resultados.json`, que ya viene depurado.
 *
 * Se lee la carpeta entera: reemplazar o agregar una exportación se refleja en
 * la siguiente descarga, sin reiniciar.
 */
export class ExcelFormulariosMomento5DataSource implements FormulariosMomento5DataSource {
  private readonly cache: CacheArchivo<FormularioEnviadoMomento5[]>;

  constructor(directorio = join(process.cwd(), "data", "forms_momento_5")) {
    // «~$…» son los temporales que deja Excel mientras el archivo está abierto.
    const rutas = () =>
      existsSync(directorio)
        ? readdirSync(directorio)
            .filter((a) => a.toLowerCase().endsWith(".xlsx") && !a.startsWith("~$"))
            .sort()
            .map((a) => join(directorio, a))
        : [];
    this.cache = new CacheArchivo(rutas, () =>
      rutas().map((ruta) => {
        const libro = leerLibro(ruta);
        return interpretarExportacionForms(
          basename(ruta, extname(ruta)),
          hojaAMatriz(libro, null) ?? [],
          celdasCombinadas(libro, null)
        );
      })
    );
  }

  getFormularios(): FormularioEnviadoMomento5[] {
    return this.cache.obtener();
  }
}
