import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

/**
 * Acceso de bajo nivel a los .xlsx: abrir un libro y volcar una hoja a filas,
 * o armar uno nuevo para descargar. Es la única puerta a la librería XLSX — que ningún origen la use por su
 * cuenta mantiene idénticas las opciones de lectura (`raw`, `defval`,
 * `cellDates`) en todo el proyecto, que es lo que hace que dos módulos
 * interpreten una misma celda de la misma forma.
 *
 * A diferencia del resto de esta carpeta no lleva "server-only": los scripts de
 * mantenimiento (`scripts/`) deben poder validar los Excel leyéndolos
 * exactamente como los lee el sitio, y ese guard —pensado para el bundle del
 * cliente— haría fallar su ejecución en Node. La protección real sigue en su
 * sitio: los orígenes que consumen este módulo sí declaran "server-only", que
 * es la capa que un componente podría importar por error.
 */

/**
 * Abre un .xlsx. Se lee el buffer explícitamente (en vez de XLSX.readFile)
 * para evitar depender de cómo el bundler del servidor (Turbopack/webpack)
 * transforma el acceso a fs interno de la librería.
 */
export function leerLibro(ruta: string, opciones: { cellDates?: boolean } = {}): XLSX.WorkBook {
  return XLSX.read(readFileSync(ruta), { type: "buffer", cellDates: opciones.cellDates ?? false });
}

/**
 * Abre un .xlsx que aún no está en disco (el contenido de un archivo que el
 * usuario acaba de subir). Pasa por aquí, y no por XLSX directamente, para que
 * un archivo se valide leyéndolo con las mismas opciones con que después se
 * leerá desde la carpeta: si difirieran, podría aceptarse un archivo que luego
 * el sitio interpreta distinto.
 */
export function leerLibroDesdeBuffer(contenido: Buffer): XLSX.WorkBook {
  return XLSX.read(contenido, { type: "buffer", cellDates: false });
}

/**
 * Convierte una hoja del libro en matriz de filas. Devuelve null si la hoja no
 * existe, para que quien la pida pueda decidir si es opcional o un error.
 */
export function hojaAMatriz(
  libro: XLSX.WorkBook,
  nombreHoja: string | null,
  opciones: { raw?: boolean; defval?: unknown } = {}
): unknown[][] | null {
  const nombre = nombreHoja ?? libro.SheetNames[0];
  const hoja = libro.Sheets[nombre];
  if (!hoja) return null;
  return XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    raw: opciones.raw ?? true,
    defval: opciones.defval ?? null,
  }) as unknown[][];
}

/** Lee la primera hoja de un .xlsx como matriz de filas crudas. */
export function leerPrimeraHoja(ruta: string): unknown[][] {
  return hojaAMatriz(leerLibro(ruta), null) ?? [];
}

/** Valor de una celda al escribir un libro. */
export type CeldaSalida = string | number | null;

export interface HojaSalida {
  /** Máximo 31 caracteres: es el límite de Excel para el nombre de una hoja. */
  nombre: string;
  /** La primera fila son los encabezados. */
  filas: CeldaSalida[][];
  /**
   * Índices de las columnas que traen fechas "aaaa-mm-dd". Se escriben como
   * fecha real de Excel —número de serie con formato dd/mm/aaaa— y no como
   * texto, para que quien abra el archivo pueda ordenarlas y filtrarlas.
   */
  columnasFecha?: number[];
}

/** Tope de ancho de columna, en caracteres: un texto largo no debe empujar el resto fuera de la vista. */
const ANCHO_MAXIMO_COLUMNA = 50;

/**
 * Arma un .xlsx en memoria. Cada hoja sale con el filtro puesto en los
 * encabezados y el ancho de cada columna ajustado a su contenido, para que se
 * pueda trabajar apenas se abre.
 */
export function escribirLibro(hojas: HojaSalida[]): Buffer {
  const libro = XLSX.utils.book_new();

  for (const { nombre, filas, columnasFecha = [] } of hojas) {
    const datos = filas.map((fila, indiceFila) =>
      indiceFila === 0
        ? fila
        : fila.map((valor, columna) =>
            columnasFecha.includes(columna) && typeof valor === "string"
              ? (isoAExcelSerial(valor) ?? valor)
              : valor
          )
    );
    const hoja = XLSX.utils.aoa_to_sheet(datos);

    for (let fila = 1; fila < datos.length; fila++) {
      for (const columna of columnasFecha) {
        const celda = hoja[XLSX.utils.encode_cell({ r: fila, c: columna })];
        if (celda?.t === "n") celda.z = "dd/mm/yyyy";
      }
    }

    const columnas = Math.max(0, ...filas.map((fila) => fila.length));
    hoja["!cols"] = Array.from({ length: columnas }, (_, columna) => ({
      wch: columnasFecha.includes(columna)
        ? 12
        : Math.min(
            ANCHO_MAXIMO_COLUMNA,
            Math.max(8, ...filas.map((fila) => String(fila[columna] ?? "").length + 2))
          ),
    }));
    if (hoja["!ref"]) hoja["!autofilter"] = { ref: hoja["!ref"] };

    XLSX.utils.book_append_sheet(libro, hoja, nombre);
  }

  return XLSX.write(libro, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}

/**
 * "aaaa-mm-dd" al número de serie de Excel (inverso de `excelSerialToISO`).
 * Se calcula en UTC a propósito: con la hora local, un servidor al oeste de
 * UTC correría todas las fechas un día.
 */
function isoAExcelSerial(iso: string): number | null {
  const partes = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return null;
  const ms = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return (ms - Date.UTC(1899, 11, 30)) / 86_400_000;
}

/**
 * Convierte el número de serie de fecha de Excel a ISO 8601. El epoch es el
 * 30/12/1899 (y no el 31/12) porque Excel arrastra a propósito el bug de 1900
 * como año bisiesto, por compatibilidad con Lotus 1-2-3.
 */
export function excelSerialToISO(serial: number): string {
  const EPOCH_MS = Date.UTC(1899, 11, 30);
  const ms = EPOCH_MS + Math.round(serial * 86400) * 1000;
  return new Date(ms).toISOString();
}
