import {
  CAMPOS_PARTICIPACION,
  campoDeEncabezado,
  interpretarEdad,
  interpretarFecha,
  type CampoParticipacion,
} from "@/lib/reglas/participacion";
import { hojaAMatriz, leerLibroDesdeBuffer } from "./infrastructure/excel";

/**
 * Traducción del Excel de asistencia a filas tipadas. Vive aparte del origen
 * de datos por el mismo motivo que `momento4-formato.ts`: interpretar el
 * archivo es una cosa, y dónde termina guardado, otra.
 */

export type FilaExcelParticipacion = Record<CampoParticipacion, string | number | null>;

export type LecturaParticipacion =
  | { ok: true; filas: FilaExcelParticipacion[]; columnasReconocidas: number }
  | { ok: false; motivo: string };

/**
 * Lee el archivo y se queda solo con los campos de `CAMPOS_PARTICIPACION`.
 * Cualquier otra columna que traiga el Excel —nombre de cédula, correo,
 * teléfono, lo que sea— nunca se lee más allá de esta función: es la
 * anonimización que pide el proyecto para todo lo que no está en la lista.
 *
 * No exige un juego de columnas fijo ni un orden, a diferencia del Momento 4:
 * distintas tandas de asistencia pueden armarse con columnas distintas, así
 * que se acepta el archivo mientras reconozca al menos uno de los campos.
 */
export function leerParticipacion(
  nombreArchivo: string,
  contenido: Buffer
): LecturaParticipacion {
  if (!nombreArchivo.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, motivo: "No es un archivo .xlsx." };
  }
  if (contenido.byteLength === 0) {
    return { ok: false, motivo: "El archivo está vacío." };
  }

  let filas: unknown[][];
  try {
    filas = hojaAMatriz(leerLibroDesdeBuffer(contenido), null, { raw: true, defval: null }) ?? [];
  } catch {
    return {
      ok: false,
      motivo: "No se pudo abrir como Excel: puede estar dañado o no ser un .xlsx real.",
    };
  }

  const encabezados = (filas[0] ?? []).map((celda) => String(celda ?? "").trim());
  if (encabezados.every((encabezado) => encabezado.length === 0)) {
    return {
      ok: false,
      motivo:
        "El archivo no tiene ninguna fila de encabezados: verifica que sea el .xlsx correcto y no otro tipo de archivo renombrado.",
    };
  }

  // Índice campo → columna, por la PRIMERA columna que lo reconozca.
  const indicePorCampo = new Map<CampoParticipacion, number>();
  encabezados.forEach((encabezado, i) => {
    const campo = campoDeEncabezado(encabezado);
    if (campo && !indicePorCampo.has(campo)) indicePorCampo.set(campo, i);
  });

  if (indicePorCampo.size === 0) {
    return {
      ok: false,
      motivo: `Ninguna columna del archivo coincide con el formato esperado (${CAMPOS_PARTICIPACION.map((c) => c.etiqueta).join(", ")}). Verifica los nombres de las columnas.`,
    };
  }

  const filasDeDatos = filas
    .slice(1)
    .filter((fila) => fila.some((celda) => String(celda ?? "").trim().length > 0));

  if (filasDeDatos.length === 0) {
    return {
      ok: false,
      motivo: "El archivo tiene el formato correcto pero ninguna fila de datos: solo trae encabezados.",
    };
  }

  const registros = filasDeDatos.map((fila) => {
    const registro = {} as FilaExcelParticipacion;
    for (const { campo } of CAMPOS_PARTICIPACION) {
      const indice = indicePorCampo.get(campo);
      registro[campo] = celda(indice === undefined ? null : fila[indice]);
    }
    return registro;
  });

  return { ok: true, filas: registros, columnasReconocidas: indicePorCampo.size };
}

/** Traduce una fila ya reconocida a los valores tipados de cada campo. */
export function interpretarFilaParticipacion(fila: FilaExcelParticipacion) {
  return {
    fechaInicio: interpretarFecha(fila.fechaInicio),
    nombreAsistente: texto(fila.nombreAsistente),
    edad: interpretarEdad(fila.edad),
    rol: texto(fila.rol),
    codigoEstudiante: texto(fila.codigoEstudiante),
    programaEstudiante: texto(fila.programaEstudiante),
    unidadEstudiante: texto(fila.unidadEstudiante),
    coordinacionDocente: texto(fila.coordinacionDocente),
    unidadDocente: texto(fila.unidadDocente),
    facultadDocente: texto(fila.facultadDocente),
    areaTrabajador: texto(fila.areaTrabajador),
    unidadTrabajador: texto(fila.unidadTrabajador),
    // Se guarda para trazabilidad; nunca se publica (ver consultarRegistros).
    cedula: texto(fila.cedula),
  };
}

/** Celda vacía y celda ausente son lo mismo: null, no la cadena "". */
function celda(valor: unknown): string | number | null {
  if (typeof valor === "number") return valor;
  const texto = String(valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

function texto(valor: string | number | null): string | null {
  if (valor === null) return null;
  const t = String(valor).trim();
  return t.length > 0 ? t : null;
}
