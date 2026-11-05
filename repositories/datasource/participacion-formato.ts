import {
  CAMPOS_PARTICIPACION,
  SIN_ESPECIFICAR,
  adscripcionesDe,
  campoDeEncabezado,
  etiquetaRol,
  interpretarEdad,
  interpretarFecha,
  unidadRegionalDe,
  type CampoParticipacion,
} from "@/lib/reglas/participacion";
import { ZONA_HORARIA } from "@/constants/admin";
import type {
  DocumentoParticipacion,
  RegistroParticipacionAdministracion,
} from "@/types/participacion";
import {
  escribirLibro,
  hojaAMatriz,
  leerLibroDesdeBuffer,
  type CeldaSalida,
} from "./infrastructure/excel";

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

const formatoCargue = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

/**
 * El .xlsx que se descarga desde /admin, con tres hojas:
 *
 * - **Asistencia**: una fila por asistente con todo lo que se guarda —cédula
 *   incluida—, el lugar del evento, la tanda de la que salió y la unidad
 *   regional y la dependencia ya estandarizadas con las mismas reglas del
 *   dashboard, para que una tabla dinámica sobre el archivo dé sus mismas
 *   cifras. Va primera y con las etiquetas de `CAMPOS_PARTICIPACION` como
 *   encabezados, que el cargue reconoce: el archivo se puede volver a subir tal
 *   cual (el lugar del evento no, porque no se lee del Excel).
 * - **Tandas**: lo mismo que la tabla del panel, más las fechas y los lugares
 *   que cubre cada archivo.
 * - **Resumen por jornada**: asistentes por fecha y lugar, abiertos por rol.
 *   Los roles salen de los datos y no de una lista fija, así que uno nuevo
 *   aparece como columna sin tocar código.
 */
export function escribirExcelParticipacion(
  documentos: DocumentoParticipacion[],
  registros: RegistroParticipacionAdministracion[]
): Promise<Buffer> {
  const archivoPorDocumento = new Map(documentos.map((d) => [d.id, d.archivo]));
  const camposSinFecha = CAMPOS_PARTICIPACION.filter(({ campo }) => campo !== "fechaInicio");
  const etiquetaFecha =
    CAMPOS_PARTICIPACION.find(({ campo }) => campo === "fechaInicio")?.etiqueta ?? "Fecha inicio";

  const asistencia: CeldaSalida[][] = [
    [
      etiquetaFecha,
      "Lugar de desarrollo",
      ...camposSinFecha.map(({ etiqueta }) => etiqueta),
      "Unidad regional (estandarizada)",
      "Dependencia (estandarizada)",
      "Tanda (archivo)",
    ],
    ...registros.map((r) => [
      r.fechaInicio,
      r.lugarDesarrollo,
      // El rol con el nombre que ve el usuario en el dashboard; vacío sigue vacío.
      ...camposSinFecha.map(({ campo }) => (campo === "rol" && r.rol ? etiquetaRol(r.rol) : r[campo])),
      unidadRegionalDe(r),
      adscripcionesDe(r).join(" / "),
      archivoPorDocumento.get(r.documentoId) ?? null,
    ]),
  ];

  const registrosPorDocumento = agrupar(registros, (r) => String(r.documentoId));
  const tandas: CeldaSalida[][] = [
    ["Archivo", "Registros", "Cargado", "Fechas del evento", "Lugar de desarrollo"],
    ...documentos.map((d) => {
      const propios = registrosPorDocumento.get(String(d.id)) ?? [];
      return [
        d.archivo,
        d.filas,
        formatoCargue.format(new Date(d.cargadoEn)),
        distintos(propios.map((r) => r.fechaInicio))
          .sort()
          .map(fechaLegible)
          .join(", ") || null,
        distintos(propios.map((r) => r.lugarDesarrollo)).sort().join(", ") || null,
      ];
    }),
  ];

  // Uso interno de /admin: lleva la cédula, y el aviso lo dice en cada hoja.
  const notas = [
    `Descargado el ${formatoCargue.format(new Date())} desde la administración del sitio.`,
    "Uso interno: incluye nombre y documento de los asistentes. No compartir fuera de la administración.",
  ];
  return escribirLibro([
    // Sin título ni notas a propósito: el cargue lee los encabezados en la
    // primera fila, y así el archivo se puede volver a subir tal cual.
    { nombre: "Asistencia", filas: asistencia, columnasFecha: [0] },
    { nombre: "Tandas", titulo: "Participación en territorio · Tandas cargadas", notas, filas: tandas },
    {
      nombre: "Resumen por jornada",
      titulo: "Participación en territorio · Resumen por jornada",
      notas,
      filas: resumenPorJornada(registros),
      columnasFecha: [0],
    },
  ]);
}

/** Asistentes por jornada (fecha + lugar), con una columna por rol y una fila de total. */
function resumenPorJornada(registros: RegistroParticipacionAdministracion[]): CeldaSalida[][] {
  const rolDe = (r: RegistroParticipacionAdministracion) => etiquetaRol(r.rol);

  const totalPorRol = new Map<string, number>();
  for (const r of registros) totalPorRol.set(rolDe(r), (totalPorRol.get(rolDe(r)) ?? 0) + 1);
  // Del más numeroso al menos; "Sin especificar" al final, como en el dashboard.
  const roles = [...totalPorRol.entries()]
    .sort(([a, x], [b, y]) =>
      a === SIN_ESPECIFICAR ? 1 : b === SIN_ESPECIFICAR ? -1 : y - x || a.localeCompare(b)
    )
    .map(([rol]) => rol);

  const jornadas = [
    ...agrupar(registros, (r) => `${r.fechaInicio ?? ""}|${r.lugarDesarrollo?.trim() ?? ""}`).values(),
  ].sort(
    (a, b) =>
      (a[0].fechaInicio ?? "9999").localeCompare(b[0].fechaInicio ?? "9999") ||
      (a[0].lugarDesarrollo ?? "").localeCompare(b[0].lugarDesarrollo ?? "")
  );

  const conteoPorRol = (grupo: RegistroParticipacionAdministracion[]) =>
    roles.map((rol) => grupo.filter((r) => rolDe(r) === rol).length);

  return [
    ["Fecha", "Lugar de desarrollo", "Asistentes", ...roles],
    ...jornadas.map((grupo) => [
      grupo[0].fechaInicio,
      grupo[0].lugarDesarrollo?.trim() || SIN_ESPECIFICAR,
      grupo.length,
      ...conteoPorRol(grupo),
    ]),
    ["Total", null, registros.length, ...roles.map((rol) => totalPorRol.get(rol) ?? 0)],
  ];
}

function agrupar<T>(elementos: T[], clave: (elemento: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const elemento of elementos) {
    const k = clave(elemento);
    const grupo = grupos.get(k);
    if (grupo) grupo.push(elemento);
    else grupos.set(k, [elemento]);
  }
  return grupos;
}

function distintos(valores: (string | null)[]): string[] {
  return [...new Set(valores.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))];
}

/** "2026-10-26" → "26/10/2026". */
function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
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
