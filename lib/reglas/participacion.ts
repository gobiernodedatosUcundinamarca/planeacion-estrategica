/**
 * Formato del Excel de "Participación" del Momento 4 (asistencia a las
 * actividades en territorio). Vive en `lib/reglas/` por lo mismo que
 * `momento4.ts`: el servidor y la vista de administración necesitan el mismo
 * criterio para no aceptar en un lado lo que se rechaza en el otro.
 *
 * A diferencia del formulario de Microsoft Forms del Momento 4, este archivo
 * no tiene un formato fijo y conocido de antemano: cada tanda de asistencia
 * puede traer columnas adicionales según cómo se haya armado la planilla. Por
 * eso la validación no exige un juego de columnas exacto y en orden —exige
 * reconocer, por nombre, las columnas que sí importan— y todo lo demás se
 * descarta al leer el archivo sin llegar nunca a la base de datos: esa es la
 * anonimización. Los nombres de columna se comparan normalizados (sin
 * tildes, en mayúsculas) para admitir variantes de escritura razonables.
 */
import type { RegistroParticipacion } from "@/types/participacion";
import { normalizar } from "./momento4";

export const TITULO_PARTICIPACION =
  'Trabajo en territorio con la comunidad universitaria: Experiencia "Transformaciones que nos conectan" - Participación';

export type CampoParticipacion =
  | "fechaInicio"
  | "nombreAsistente"
  | "edad"
  | "rol"
  | "codigoEstudiante"
  | "programaEstudiante"
  | "unidadEstudiante"
  | "coordinacionDocente"
  | "unidadDocente"
  | "facultadDocente"
  | "areaTrabajador"
  | "unidadTrabajador"
  // Se conserva en la base para trazabilidad, pero NUNCA se publica: no la
  // selecciona `consultarRegistros` ni está en `RegistroParticipacion`, así que
  // no llega al cliente. Es la excepción a la anonimización (ver CLAUDE.md §2).
  | "cedula";

/**
 * Los únicos datos que se conservan de cada asistente, con las redacciones de
 * encabezado que se aceptan para cada uno. La primera variante es la etiqueta
 * que se muestra en pantalla (a quien sube el archivo y en la tabla pública).
 *
 * "Coordinación docente" admite también "Cordinación docente" —sin la primera
 * "o"— porque así viene escrito en la planilla de referencia que se usó para
 * definir este formato.
 */
export const CAMPOS_PARTICIPACION: {
  campo: CampoParticipacion;
  etiqueta: string;
  variantes: string[];
}[] = [
  {
    campo: "fechaInicio",
    etiqueta: "Fecha inicio",
    variantes: ["Fecha inicio", "Fecha de inicio", "Fecha"],
  },
  {
    campo: "nombreAsistente",
    etiqueta: "Nombre asistente",
    variantes: ["Nombre asistente", "Nombre del asistente", "Nombre"],
  },
  { campo: "edad", etiqueta: "Edad", variantes: ["Edad"] },
  { campo: "rol", etiqueta: "Rol", variantes: ["Rol"] },
  {
    campo: "codigoEstudiante",
    etiqueta: "Código estudiante",
    variantes: ["Código estudiante", "Codigo estudiante"],
  },
  {
    campo: "programaEstudiante",
    etiqueta: "Programa estudiante",
    variantes: ["Programa estudiante"],
  },
  { campo: "unidadEstudiante", etiqueta: "Unidad estudiante", variantes: ["Unidad estudiante"] },
  {
    campo: "coordinacionDocente",
    etiqueta: "Coordinación docente",
    variantes: ["Coordinación docente", "Cordinación docente"],
  },
  { campo: "unidadDocente", etiqueta: "Unidad docente", variantes: ["Unidad docente"] },
  { campo: "facultadDocente", etiqueta: "Facultad docente", variantes: ["Facultad docente"] },
  { campo: "areaTrabajador", etiqueta: "Área trabajador", variantes: ["Área trabajador", "Area trabajador"] },
  {
    campo: "unidadTrabajador",
    etiqueta: "Unidad trabajador",
    variantes: ["Unidad trabajador", "Unidad del trabajador"],
  },
  {
    campo: "cedula",
    etiqueta: "Documento",
    variantes: [
      "Documento",
      "Número documento",
      "Numero documento",
      "Número de documento",
      "Cédula",
      "Cedula",
      "Identificación",
      "Identificacion",
    ],
  },
];

/** Índice encabezado normalizado → campo, construido a partir de las variantes. */
const CAMPO_POR_ENCABEZADO = new Map(
  CAMPOS_PARTICIPACION.flatMap(({ campo, variantes }) =>
    variantes.map((variante) => [normalizar(variante), campo] as const)
  )
);

/** A qué campo corresponde un encabezado del archivo, o null si no se reconoce. */
export function campoDeEncabezado(encabezado: string): CampoParticipacion | null {
  return CAMPO_POR_ENCABEZADO.get(normalizar(encabezado)) ?? null;
}

/**
 * Los campos de texto que SÍ se publican y se usan en el dashboard (todos menos
 * `edad`, que es número, y `cedula`, que se guarda pero nunca se muestra). Por
 * eso este tipo se puede usar para indexar `RegistroParticipacion`, que no
 * incluye la cédula.
 */
export type CampoTextoParticipacion = Exclude<CampoParticipacion, "edad" | "cedula">;

/**
 * De dónde sale la unidad regional (sede, seccional o extensión) de un
 * asistente. Cada rol la trae en su propia columna y solo una viene llena, así
 * que se toma la primera no vacía en este orden.
 */
export const CAMPOS_UNIDAD_REGIONAL: CampoTextoParticipacion[] = [
  "unidadEstudiante",
  "unidadDocente",
  "unidadTrabajador",
];

/**
 * Las unidades regionales reales de la UCundinamarca, con la etiqueta con que
 * se muestran. Se reconocen por la ciudad que contiene el texto, no por
 * coincidencia exacta: la columna del Excel a veces trae el programa o la
 * facultad en vez de la sede ("ENFERMERIA", "ADMINISTRACION DEL MEDIO
 * AMBIENTE", "LICENCIATURA EN LENGUAS MODERNAS"), y esas filas deben quedar
 * como "Sin especificar" en vez de inventar una sede que no existe.
 *
 * "Bogotá" se mantiene como unidad válida aunque no sea una sede en el sentido
 * estricto: es el único destino externo que sí interesa distinguir.
 */
const UNIDADES_REGIONALES: { patron: RegExp; etiqueta: string }[] = [
  { patron: /GIRARDOT/, etiqueta: "SECCIONAL GIRARDOT" },
  { patron: /UBATE/, etiqueta: "SECCIONAL UBATÉ" },
  { patron: /ZIPAQUIRA/, etiqueta: "EXTENSIÓN ZIPAQUIRÁ" },
  { patron: /FUSAGASUGA/, etiqueta: "SEDE FUSAGASUGÁ" },
  { patron: /CHIA/, etiqueta: "EXTENSIÓN CHÍA" },
  { patron: /SOACHA/, etiqueta: "EXTENSIÓN SOACHA" },
  { patron: /FACATATIVA/, etiqueta: "EXTENSIÓN FACATATIVÁ" },
  { patron: /BOGOTA/, etiqueta: "BOGOTÁ" },
];

/**
 * La unidad regional estandarizada de un valor de columna, o `null` si el
 * texto no nombra ninguna unidad reconocida (la vista lo muestra como "Sin
 * especificar"). Antes se compara sin el prefijo "UNIDAD REGIONAL," con que
 * vienen casi todas.
 */
export function estandarizarUnidadRegional(texto: string | null): string | null {
  const limpio = (texto ?? "").trim().replace(/^UNIDAD\s+REGIONAL\s*,?\s*/i, "").trim();
  if (!limpio) return null;

  const clave = normalizar(limpio);
  for (const { patron, etiqueta } of UNIDADES_REGIONALES) {
    if (patron.test(clave)) return etiqueta;
  }
  return null;
}

/**
 * Los campos que agrupa el desplegable unificado de "programa, facultad,
 * coordinación o área".
 *
 * Van juntos en un solo filtro y no en cuatro porque son la misma pregunta
 * —a qué dependencia pertenece quien asistió— formulada distinto según el
 * rol: de un estudiante se sabe su programa, de un docente su facultad o su
 * coordinación, y de un trabajador su área. Cuatro desplegables obligarían a
 * saber de antemano el rol de quien se busca, y tres estarían siempre vacíos.
 *
 * **El código de estudiante queda fuera a propósito**, aunque sea una de las
 * columnas del archivo: identifica a una persona, no a una dependencia. Al
 * incluirlo, el desplegable listaba 350 códigos sueltos entre los programas y
 * la tarjeta de "dependencias representadas" contaba 413 donde hay unas
 * cincuenta. Agrupar por él es contar personas, no unidades.
 *
 * La unidad regional también queda fuera: tiene su propio desplegable.
 */
export const CAMPOS_FILTRO_UNIFICADO: CampoTextoParticipacion[] = [
  "programaEstudiante",
  "facultadDocente",
  "coordinacionDocente",
  "areaTrabajador",
];

/**
 * Nombre estandarizado de una dependencia (programa, facultad, coordinación o
 * área).
 *
 * Los programas llegan con la promoción y la sede pegadas al nombre
 * —"CONTADURIA PUBLICA 2024" y "CONTADURIA PUBLICA 2008", "ZOOTECNIA 2020 -
 * SEC. UBATE"—, así que un mismo programa aparecía como varias barras y varias
 * opciones del desplegable. Se corta en el año: lo que va después es la
 * promoción o la sede, y la sede ya tiene su propio filtro.
 *
 * Se comparan sin tildes y en mayúsculas porque la misma dependencia llega
 * escrita de las dos formas ("ADMINISTRACIÓN" y "ADMINISTRACION"), y contarlas
 * por separado partiría el grupo en dos.
 */
export function estandarizarDependencia(texto: string | null): string | null {
  const limpio = (texto ?? "").trim();
  if (!limpio) return null;

  const sinPromocion = limpio.split(/\b(?:19|20)\d{2}\b/)[0];
  const normalizado = normalizar(sinPromocion)
    // Restos del corte y puntuación final: separadores, abreviaturas de sede
    // que quedaban colgando ("ZOOTECNIA -", "… - SEC.") y el punto con que
    // algunas filas cierran el nombre —"ADMINISTRACION AGROPECUARIA." y
    // "ADMINISTRACION AGROPECUARIA" son la misma dependencia—.
    .replace(/[\s,.\-–]*(?:SEC\.?)?[\s,.\-–]*$/, "")
    .trim();

  return normalizado || normalizar(limpio);
}

/**
 * Etiqueta para las filas que no traen rol, unidad o dependencia.
 *
 * Sin ella esas filas desaparecían de los gráficos y de los desplegables: las
 * barras de unidad regional sumaban 470 sobre 478 asistentes, sin nada que
 * explicara los 8 que faltaban. Es el mismo criterio que sigue la sección de
 * resultados de encuestas.
 */
export const SIN_ESPECIFICAR = "Sin especificar";

/**
 * La unidad regional del asistente: la primera columna (estudiante, docente o
 * trabajador) que nombre una sede reconocida, ya estandarizada por
 * `estandarizarUnidadRegional`.
 *
 * Solo se aceptan las unidades reales de la UCundinamarca (más Bogotá). La
 * columna del Excel a veces trae el programa o la facultad en su lugar
 * —"ENFERMERIA", "ADMINISTRACION DEL MEDIO AMBIENTE"—; esas filas caen en
 * "Sin especificar" en vez de aparecer como una sede inexistente.
 *
 * Vive aquí y no en el dashboard porque la descarga de /admin la necesita
 * igual: si cada lado la calculara a su manera, el Excel y el gráfico de
 * unidades regionales podrían no cuadrar.
 */
export function unidadRegionalDe(r: RegistroParticipacion): string {
  for (const campo of CAMPOS_UNIDAD_REGIONAL) {
    const unidad = estandarizarUnidadRegional(r[campo]);
    if (unidad) return unidad;
  }
  return SIN_ESPECIFICAR;
}

/**
 * A qué dependencia pertenece el asistente (programa, facultad, coordinación o
 * área), ya estandarizada: sin la promoción ni la sede pegadas al nombre, que
 * es lo que hacía aparecer un mismo programa como varias entradas distintas.
 */
export function adscripcionesDe(r: RegistroParticipacion): string[] {
  const valores = CAMPOS_FILTRO_UNIFICADO.map((campo) => estandarizarDependencia(r[campo]));
  // Un docente puede traer facultad y coordinación con el mismo nombre; sin
  // quitar repetidos, esa fila contaría dos veces en su propia barra.
  const unicas = [...new Set(valores.filter((v): v is string => Boolean(v)))];
  // Quien no trae ninguna sigue siendo un asistente: se le agrupa en vez de
  // dejarlo fuera de todo filtro.
  return unicas.length > 0 ? unicas : [SIN_ESPECIFICAR];
}

/**
 * Cómo se le muestra cada rol al usuario. Solo cambia lo que se ve: en la base
 * y en los archivos que se suben el rol sigue siendo el de la planilla
 * (ESTUDIANTE, DOCENTE…), que es con el que trabajan las reglas de cargue
 * (`--solo-roles`, "administrativos = TRABAJADOR + PLANTA").
 *
 * Estudiantes y docentes se nombran como los nombra la universidad, igual que
 * el formulario de las transformaciones. Van en mayúsculas como el resto de
 * roles de la planilla, para que no desentonen en el mismo gráfico.
 */
const NOMBRE_VISIBLE_ROL: Record<string, string> = {
  ESTUDIANTE: "CREADORES DE OPORTUNIDADES",
  DOCENTE: "GESTORES DEL CONOCIMIENTO Y EL APRENDIZAJE",
};

/** El rol tal como se muestra; "Sin especificar" si la fila no lo trae. */
export function etiquetaRol(rol: string | null): string {
  const limpio = rol?.trim();
  if (!limpio) return SIN_ESPECIFICAR;
  return NOMBRE_VISIBLE_ROL[normalizar(limpio)] ?? limpio;
}

/**
 * Interpreta una fecha del Excel, que puede llegar como número de serie de
 * Excel, como texto "dd/mm/aaaa" o como texto "aaaa-mm-dd". Devuelve solo la
 * parte de fecha en ISO ("aaaa-mm-dd"); null si no se puede interpretar.
 */
export function interpretarFecha(valor: string | number | null): string | null {
  if (valor === null || valor === "") return null;

  if (typeof valor === "number") {
    const EPOCH_MS = Date.UTC(1899, 11, 30);
    const fecha = new Date(EPOCH_MS + Math.round(valor * 86400) * 1000);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
  }

  const texto = valor.trim();
  const isoDirecto = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDirecto) return `${isoDirecto[1]}-${isoDirecto[2]}-${isoDirecto[3]}`;

  const conBarras = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (conBarras) {
    const dia = Number(conBarras[1]);
    const mes = Number(conBarras[2]);
    const anioCrudo = Number(conBarras[3]);
    const anio = anioCrudo < 100 ? 2000 + anioCrudo : anioCrudo;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  return null;
}

/** "38" o "38 años" → 38. null si no hay un número interpretable. */
export function interpretarEdad(valor: string | number | null): number | null {
  if (valor === null || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.round(valor) : null;
  const numero = valor.match(/\d+/);
  return numero ? Number(numero[0]) : null;
}
