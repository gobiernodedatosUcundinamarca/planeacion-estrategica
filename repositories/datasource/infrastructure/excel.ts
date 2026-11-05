import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

/**
 * Acceso de bajo nivel a los .xlsx: abrir un libro y volcar una hoja a filas,
 * o armar uno nuevo con estilo para descargar. Es la única puerta a las
 * librerías de Excel (XLSX para leer, exceljs para escribir) — que ningún origen la use por su
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
  /** Título grande sobre la tabla. */
  titulo?: string;
  /** Líneas de contexto bajo el título: fuente, fecha de descarga, aviso de anonimato. */
  notas?: string[];
  /** La primera fila son los encabezados. */
  filas: CeldaSalida[][];
  /**
   * Índices de las columnas que traen fechas "aaaa-mm-dd". Se escriben como
   * fecha real de Excel —número de serie con formato dd/mm/aaaa— y no como
   * texto, para que quien abra el archivo pueda ordenarlas y filtrarlas.
   */
  columnasFecha?: number[];
}

/** Tope de ancho de columna, en caracteres: más allá, el texto se parte en líneas. */
const ANCHO_MAXIMO_COLUMNA = 60;

/** Colores del sitio en ARGB: el verde institucional (`--valoracion-5`) y sus derivados. */
const COLOR_MARCA = "FF00612F";
const COLOR_FRANJA = "FFF1F7F3";
const COLOR_BORDE = "FFD5E3D9";
const COLOR_TEXTO_SUAVE = "FF5B6B61";

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: COLOR_BORDE } },
  bottom: { style: "thin", color: { argb: COLOR_BORDE } },
  left: { style: "thin", color: { argb: COLOR_BORDE } },
  right: { style: "thin", color: { argb: COLOR_BORDE } },
};

/**
 * Arma un .xlsx con estilo, en memoria (en Vercel el disco es de solo
 * lectura). Cada hoja lleva título, notas de contexto, encabezado con el verde
 * del sitio, filas alternadas, el encabezado fijo al desplazarse, filtro en
 * cada columna, anchos ajustados al contenido y fechas reales de Excel: que se
 * pueda leer e imprimir apenas se abre.
 *
 * Escribe con `exceljs` y no con la librería XLSX de lectura porque la edición
 * gratuita de esa no guarda estilos. Las dos viven solo en este archivo.
 */
export async function escribirLibro(hojas: HojaSalida[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Universidad de Cundinamarca · Planeación Estratégica 2027-2037";
  libro.created = new Date();

  for (const hoja of hojas) {
    const [encabezados = [], ...datos] = hoja.filas;
    const totalColumnas = Math.max(1, encabezados.length, ...datos.map((f) => f.length));
    const fechas = new Set(hoja.columnasFecha ?? []);
    const ws = libro.addWorksheet(hoja.nombre.slice(0, 31));

    let fila = 1;
    if (hoja.titulo) {
      ws.mergeCells(fila, 1, fila, totalColumnas);
      const celda = ws.getCell(fila, 1);
      celda.value = hoja.titulo;
      celda.font = { bold: true, size: 14, color: { argb: COLOR_MARCA } };
      celda.alignment = { vertical: "middle" };
      ws.getRow(fila).height = 26;
      fila++;
    }
    for (const nota of hoja.notas ?? []) {
      ws.mergeCells(fila, 1, fila, totalColumnas);
      const celda = ws.getCell(fila, 1);
      celda.value = nota;
      celda.font = { italic: true, size: 9, color: { argb: COLOR_TEXTO_SUAVE } };
      fila++;
    }
    // Una fila en blanco separa el encabezado del documento de la tabla.
    if (fila > 1) fila++;

    const anchos = Array.from({ length: totalColumnas }, (_, c) =>
      fechas.has(c)
        ? 12
        : Math.min(
            ANCHO_MAXIMO_COLUMNA,
            Math.max(10, ...hoja.filas.map((f) => String(f[c] ?? "").length + 2))
          )
    );
    ws.columns = anchos.map((width) => ({ width }));

    const filaEncabezado = fila;
    const encabezado = ws.getRow(filaEncabezado);
    for (let c = 0; c < totalColumnas; c++) {
      const celda = encabezado.getCell(c + 1);
      celda.value = encabezados[c] ?? "";
      celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_MARCA } };
      celda.alignment = { vertical: "middle", wrapText: true };
      celda.border = BORDE;
    }
    encabezado.height = 32;

    datos.forEach((valores, indice) => {
      const r = ws.getRow(filaEncabezado + 1 + indice);
      for (let c = 0; c < totalColumnas; c++) {
        const valor = valores[c] ?? null;
        const celda = r.getCell(c + 1);
        const serial = fechas.has(c) && typeof valor === "string" ? isoAExcelSerial(valor) : null;
        celda.value = serial ?? valor;
        if (serial !== null) celda.numFmt = "dd/mm/yyyy";
        celda.alignment = {
          vertical: "top",
          // Solo se parte en líneas lo que no cabe en el ancho máximo.
          wrapText: typeof valor === "string" && valor.length + 2 > anchos[c],
        };
        celda.border = BORDE;
        if (indice % 2 === 1) {
          celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_FRANJA } };
        }
      }
    });

    ws.views = [{ state: "frozen", ySplit: filaEncabezado }];
    ws.autoFilter = {
      from: { row: filaEncabezado, column: 1 },
      to: { row: filaEncabezado + Math.max(datos.length, 1), column: totalColumnas },
    };
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
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
