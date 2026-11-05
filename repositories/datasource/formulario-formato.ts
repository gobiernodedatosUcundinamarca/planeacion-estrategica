import { detectarDiaPrimero, interpretarFechaExport, normalizar } from "@/lib/reglas/momento4";
import { hojaAMatriz, leerLibroDesdeBuffer } from "./infrastructure/excel";

/**
 * Lectura del export de Microsoft Forms de los formularios que se cargan como
 * un solo documento (valoración de la experiencia en territorio, encuesta de
 * IA a administrativos). Vive aparte del almacén por lo mismo que los demás
 * `*-formato.ts`: interpretar el archivo es una cosa, y dónde termina
 * guardado, otra.
 */

/** Una pregunta que se guarda: con qué campo y cómo se reconoce su columna. */
export interface ColumnaFormulario<C extends string> {
  campo: C;
  /**
   * El inicio del encabezado. Se reconoce por el inicio y no por el texto
   * entero porque Forms recorta los encabezados largos ("…favoreció mi par...")
   * o les deja un salto de línea al final; las columnas "Puntos:" y
   * "Comentarios:" que acompañan a cada pregunta no empiezan igual y quedan
   * fuera solas.
   */
  inicio: string;
}

/** Una fila del export ya interpretada. */
export interface FilaFormulario<C extends string> {
  respuestaId: string | null;
  /** Día de la respuesta en ISO; null si la hora del export no se pudo leer. */
  fechaRespuesta: string | null;
  valores: Record<C, string | null>;
}

export type LecturaFormulario<C extends string> =
  | { ok: true; filas: FilaFormulario<C>[] }
  | { ok: false; motivo: string };

/**
 * Valida el archivo y devuelve sus respuestas, solo con las columnas pedidas:
 * correo, nombre, puntos y comentarios del export no se leen. No lanza: el
 * motivo del rechazo se le muestra tal cual a quien subió el archivo.
 */
export function leerExportForms<C extends string>(
  nombreArchivo: string,
  contenido: Buffer,
  columnas: readonly ColumnaFormulario<C>[]
): LecturaFormulario<C> {
  if (!nombreArchivo.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, motivo: "No es un archivo .xlsx." };
  }
  if (contenido.byteLength === 0) {
    return { ok: false, motivo: "El archivo está vacío." };
  }

  let filas: unknown[][];
  try {
    filas = hojaAMatriz(leerLibroDesdeBuffer(contenido), null, { raw: false, defval: "" }) ?? [];
  } catch {
    return { ok: false, motivo: "No se pudo abrir como Excel: puede estar dañado o no ser un .xlsx real." };
  }

  const encabezados = (filas[0] ?? []).map((celda) => normalizar(String(celda ?? "")));
  const indiceDe = (inicio: string) => {
    const buscado = normalizar(inicio);
    return encabezados.findIndex((e) => e.startsWith(buscado));
  };

  const fijas = {
    // Exacto y no por inicio: "Identificar cuándo no es apropiado…" también
    // empieza por "ID".
    respuestaId: encabezados.indexOf("ID"),
    inicio: indiceDe("Hora de inicio"),
    fin: indiceDe("Hora de finalización"),
  };
  const indices = columnas.map((c) => ({ ...c, indice: indiceDe(c.inicio) }));
  const faltantes = indices.filter((c) => c.indice === -1);

  if (faltantes.length === columnas.length) {
    return {
      ok: false,
      motivo:
        "Ninguna de sus columnas coincide con este formulario: parece ser otro archivo (¿el de la otra encuesta?). Debe ser el .xlsx exportado de Microsoft Forms.",
    };
  }
  if (faltantes.length > 0) {
    return {
      ok: false,
      motivo: `El formato no es compatible: faltan ${faltantes.length} de las ${columnas.length} preguntas. La primera que falta empieza por "${faltantes[0].inicio}".`,
    };
  }
  if (fijas.respuestaId === -1 || fijas.inicio === -1 || fijas.fin === -1) {
    return {
      ok: false,
      motivo: 'Faltan las columnas "ID", "Hora de inicio" u "Hora de finalización" del export de Forms.',
    };
  }

  const crudas = filas
    .slice(1)
    .filter((fila) => fila.some((celda) => String(celda ?? "").trim().length > 0));

  if (crudas.length === 0) {
    return { ok: false, motivo: "Tiene el formato correcto pero ninguna respuesta: solo trae los encabezados." };
  }

  // El orden día/mes se decide con todas las fechas juntas, no fila por fila:
  // "9/7/26" es válido en los dos órdenes (ver detectarDiaPrimero).
  const diaPrimero = detectarDiaPrimero(
    crudas.flatMap((f) => [texto(f[fijas.fin]), texto(f[fijas.inicio])])
  );

  return {
    ok: true,
    filas: crudas.map((fila) => {
      const fecha =
        interpretarFechaExport(texto(fila[fijas.fin]), diaPrimero) ??
        interpretarFechaExport(texto(fila[fijas.inicio]), diaPrimero);
      const valores = {} as Record<C, string | null>;
      for (const { campo, indice } of indices) valores[campo] = texto(fila[indice]);
      return {
        respuestaId: texto(fila[fijas.respuestaId]),
        fechaRespuesta: fecha ? soloFecha(fecha) : null,
        valores,
      };
    }),
  };
}

/** La parte de fecha, con los componentes locales (mismo criterio que aportes). */
function soloFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Celda vacía y celda ausente son lo mismo: null, no la cadena "". */
function texto(celda: unknown): string | null {
  const valor = String(celda ?? "").trim();
  return valor.length > 0 ? valor : null;
}
