import {
  FECHA_MINIMA_RESPUESTA,
  canonizarColumna,
  detectarDiaPrimero,
  interpretarFechaExport,
  quitarCorreosRepetidos,
  validarColumnas,
} from "@/lib/reglas/momento4";
import { hojaAMatriz, leerLibroDesdeBuffer } from "./infrastructure/excel";

/**
 * Traducción del Excel del Momento 4 a filas tipadas. Vive aparte del origen de
 * datos porque es lo único que no cambia si mañana las respuestas se guardan en
 * otro sitio: interpretar el archivo es una cosa, y dónde termina guardado, otra.
 */

/**
 * Una fila del Excel, ya interpretada. Es la forma del archivo de entrada —no
 * la de lo que se publica, que vive en `types/momento4.ts`— y por eso incluye
 * campos que la sección nunca muestra (horas, total de puntos).
 */
export interface FilaExcelMomento4 {
  respuestaId: string | null;
  horaInicio: string | null;
  horaFinalizacion: string | null;
  correo: string | null;
  nombre: string | null;
  totalPuntos: string | null;
  comentariosCuestionario: string | null;
  horaUltimaModificacion: string | null;
  tipoActor: string | null;
  /** Solo lo responde quien es graduado; en el resto de filas viene vacío. */
  programaGraduado: string | null;
  unidadRegional: string | null;
  /** La columna "Transformación" del propio archivo, que no es de fiar como
   *  identificador (ver lib/reglas/momento4) pero sí vale como dato. */
  transformacionDeclarada: string | null;
  respondeNecesidad: string | null;
  ajustes: string | null;
}

export type LecturaMomento4 =
  | {
      ok: true;
      /** Ya sin correos repetidos: una respuesta por persona. */
      respuestas: FilaExcelMomento4[];
      /** Cuántas filas se descartaron por venir con un correo ya presente. */
      descartadas: number;
      correosRepetidos: string[];
      /** Cuántas quedaron fuera por ser anteriores al corte de fecha. */
      descartadasPorFecha: number;
      /** Cuántas se descartaron por no traer ninguna respuesta (solo correo/fecha). */
      sinRespuesta: number;
    }
  | { ok: false; motivo: string };

/**
 * Columnas que se guardan, con el nombre exacto del export. Quedan fuera a
 * propósito las diez "Puntos: …" y "Comentarios: …" de cada pregunta: son los
 * campos de calificación que Microsoft Forms agrega a todo cuestionario y en
 * estos documentos vienen siempre vacíos. Se siguen exigiendo en la validación
 * (el formato es el formato), pero guardarlas sería llenar la base de columnas
 * en blanco.
 */
const CAMPOS: { columna: string; campo: keyof FilaExcelMomento4 }[] = [
  { columna: "ID", campo: "respuestaId" },
  { columna: "Hora de inicio", campo: "horaInicio" },
  { columna: "Hora de finalización", campo: "horaFinalizacion" },
  { columna: "Correo electrónico", campo: "correo" },
  { columna: "Nombre", campo: "nombre" },
  { columna: "Total de puntos", campo: "totalPuntos" },
  { columna: "Comentarios del cuestionario", campo: "comentariosCuestionario" },
  { columna: "Hora de la última modificación", campo: "horaUltimaModificacion" },
  { columna: "Tipo de actor", campo: "tipoActor" },
  { columna: "De que programa eres graduado", campo: "programaGraduado" },
  { columna: "Unidad Regional", campo: "unidadRegional" },
  { columna: "Transformación", campo: "transformacionDeclarada" },
  {
    columna:
      "¿Consideran que esta transformación responde a lo que la UCundinamarca necesita del 2027 al 2037?",
    campo: "respondeNecesidad",
  },
  { columna: "¿Qué ajustarían en esta transformación?", campo: "ajustes" },
];

/**
 * Valida el archivo contra el formato y devuelve sus respuestas. No lanza: el
 * motivo del rechazo se le muestra tal cual a quien subió el documento.
 */
export function leerDocumentoMomento4(
  nombreArchivo: string,
  contenido: Buffer
): LecturaMomento4 {
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
    return {
      ok: false,
      motivo: "No se pudo abrir como Excel: puede estar dañado o no ser un .xlsx real.",
    };
  }

  const encabezados = (filas[0] ?? []).map((celda) => String(celda ?? "").trim());

  // La librería no siempre falla al abrir algo que no es un .xlsx (un PDF o un
  // texto plano renombrado le devuelven un libro vacío en vez de lanzar), y sin
  // esta comprobación el mensaje resultante era "faltan las 23 columnas" —
  // técnicamente cierto, pero manda a revisar el formato a quien en realidad
  // se equivocó de archivo.
  if (encabezados.every((encabezado) => encabezado.length === 0)) {
    return {
      ok: false,
      motivo:
        "El archivo no se pudo leer como Excel: no tiene ninguna hoja con datos. Verifica que sea el .xlsx exportado de Microsoft Forms y no otro tipo de archivo renombrado.",
    };
  }

  const errorColumnas = validarColumnas(encabezados);
  if (errorColumnas) {
    return { ok: false, motivo: `El formato no es compatible. ${errorColumnas}` };
  }

  // El índice se arma con el nombre CANÓNICO de cada encabezado: así una
  // redacción alterna del formulario (ver VARIANTES_COLUMNA) alimenta el mismo
  // campo, y la lectura no puede discrepar de lo que aceptó la validación.
  const indice = new Map(encabezados.map((encabezado, i) => [canonizarColumna(encabezado), i]));
  const respuestas = filas
    .slice(1)
    // Un export con filas en blanco al final es común y no son respuestas.
    .filter((fila) => fila.some((celda) => String(celda ?? "").trim().length > 0))
    .map((fila) => {
      const respuesta = {} as FilaExcelMomento4;
      for (const { columna, campo } of CAMPOS) {
        respuesta[campo] = texto(fila[indice.get(canonizarColumna(columna)) ?? -1]);
      }
      return respuesta;
    });

  if (respuestas.length === 0) {
    return {
      ok: false,
      motivo: "Tiene el formato correcto pero ninguna respuesta: solo trae los encabezados.",
    };
  }

  // Corte por fecha. El orden día/mes se decide con todas las fechas del
  // archivo antes de interpretar ninguna (ver detectarDiaPrimero).
  const diaPrimero = detectarDiaPrimero(
    respuestas.flatMap((r) => [r.horaFinalizacion, r.horaInicio])
  );
  const enPlazo = respuestas.filter((respuesta) => {
    // Se mira cuándo se envió; si esa celda viniera vacía, cuándo se empezó.
    const fecha =
      interpretarFechaExport(respuesta.horaFinalizacion, diaPrimero) ??
      interpretarFechaExport(respuesta.horaInicio, diaPrimero);
    // Sin fecha legible no se puede afirmar que sea posterior al corte, y el
    // corte existe justamente para dejar fuera lo anterior: se descarta.
    return fecha !== null && fecha >= FECHA_MINIMA_RESPUESTA;
  });
  const descartadasPorFecha = respuestas.length - enPlazo.length;

  // Que TODAS sean anteriores al corte no es un error del archivo: es un export
  // que todavía no trae respuestas nuevas. Se acepta igual y se guarda lo que
  // haya —aunque sea nada—, para que subir el export de siempre no obligue a
  // interpretar un rechazo cada vez.

  // Una fila con correo y fecha pero sin ninguna respuesta de contenido es un
  // formulario que se abrió y no se contestó: no alimenta ninguna cifra de la
  // sección y solo inflaría el conteo de participantes. Basta con que haya
  // contestado una pregunta real —"Tipo de actor" en adelante— para conservarla.
  const conRespuesta = enPlazo.filter(tieneAlgunaRespuesta);
  const sinRespuesta = enPlazo.length - conRespuesta.length;

  // El documento tampoco se rechaza por traer repetidos: se cargan las
  // respuestas únicas y se informa cuántas quedaron fuera.
  // La identidad es correo + rol: la misma persona puede responder una vez por
  // cada rol que tenga (graduada y administrativa, por ejemplo), y esas filas
  // no son duplicados.
  const sinRepetidos = quitarCorreosRepetidos(
    conRespuesta,
    (r) => r.correo,
    (r) => r.tipoActor
  );

  return {
    ok: true,
    respuestas: sinRepetidos.unicas,
    descartadas: sinRepetidos.descartadas,
    correosRepetidos: sinRepetidos.correosRepetidos,
    descartadasPorFecha,
    sinRespuesta,
  };
}

/**
 * Campos de contenido de la encuesta, de "Tipo de actor" en adelante. Son las
 * respuestas propiamente dichas; lo anterior (ID, horas, correo, nombre) es
 * metadato del envío, no algo que la persona haya contestado.
 */
const CAMPOS_RESPUESTA: (keyof FilaExcelMomento4)[] = [
  "tipoActor",
  "programaGraduado",
  "unidadRegional",
  "transformacionDeclarada",
  "respondeNecesidad",
  "ajustes",
];

/** Si la fila trae al menos una respuesta de contenido llena. */
function tieneAlgunaRespuesta(fila: FilaExcelMomento4): boolean {
  return CAMPOS_RESPUESTA.some((campo) => fila[campo] !== null);
}

/** Celda vacía y celda ausente son lo mismo: null, no la cadena "". */
function texto(celda: unknown): string | null {
  const valor = String(celda ?? "").trim();
  return valor.length > 0 ? valor : null;
}
