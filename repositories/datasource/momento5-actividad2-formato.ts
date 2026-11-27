import type {
  Actividad2Momento5,
  ArchivoActividad2,
  IndicadorActividad2,
  InstrumentoActividad2,
  InstrumentoActividad2Id,
  MesaActividad2,
  NubeActividad2,
  RegistroReto2,
} from "@/types/momento5-actividad2";
import { textoOpcional } from "./momento5-formato";

/**
 * Traducción de `actividad2.xlsx` (Actividad 2 del Momento 5) a datos tipados.
 * Vive aparte del origen, como `momento5-formato.ts`, para que las pruebas la
 * ejerciten sin `server-only`.
 *
 * El libro es una transcripción literal de las fichas: esta capa no corrige ni
 * recodifica textos. Busca cada columna por su encabezado, y las preguntas de
 * la ficha se toman del encabezado mismo, para mostrarlas tal como las vieron
 * las mesas. Si falta una hoja o una columna, falla con un mensaje que dice
 * cuál: es preferible a publicar una ficha a medias.
 */

/** Filas de una hoja: la primera son los encabezados. */
export type HojasActividad2 = Record<string, unknown[][] | null>;

const IDS_INSTRUMENTO: InstrumentoActividad2Id[] = ["pregunta-inicial", "reto1", "reto2", "aprendizajes"];

interface Tabla {
  encabezados: string[];
  filas: unknown[][];
  /** Índice de la columna cuyo encabezado es exactamente `nombre`. */
  col: (nombre: string) => number;
  /** Índice de la primera columna cuyo encabezado empieza por `prefijo`. */
  colQueEmpieza: (prefijo: string) => number;
}

function tabla(hojas: HojasActividad2, nombre: string): Tabla {
  const filas = hojas[nombre];
  if (!filas?.length) throw new Error(`actividad2.xlsx: falta la hoja «${nombre}» o está vacía.`);
  const encabezados = filas[0].map((h) => (typeof h === "string" ? h.trim() : String(h ?? "")));
  const buscar = (prueba: (h: string) => boolean, descripcion: string) => {
    const i = encabezados.findIndex(prueba);
    if (i < 0) throw new Error(`actividad2.xlsx: a la hoja «${nombre}» le falta la columna ${descripcion}.`);
    return i;
  };
  return {
    encabezados,
    // Una fila sin ningún valor es un renglón vacío del Excel, no un registro.
    filas: filas.slice(1).filter((f) => f.some((v) => textoOpcional(v) !== null)),
    col: (n) => buscar((h) => h === n, `«${n}»`),
    colQueEmpieza: (p) => buscar((h) => h.startsWith(p), `que empieza por «${p}»`),
  };
}

function entero(valor: unknown): number | null {
  const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
}

/** Texto literal: solo se quitan los espacios de los extremos (el relleno «N/A» también cuenta como vacío). */
const txt = (valor: unknown) => textoOpcional(valor);

function idInstrumento(valor: unknown, hoja: string): InstrumentoActividad2Id {
  const id = txt(valor) as InstrumentoActividad2Id | null;
  if (!id || !IDS_INSTRUMENTO.includes(id)) throw new Error(`actividad2.xlsx: instrumento desconocido «${String(valor)}» en la hoja «${hoja}».`);
  return id;
}

function instrumentos(hojas: HojasActividad2): InstrumentoActividad2[] {
  const t = tabla(hojas, "instrumentos");
  const [id, instrumento, nombre, medio, fecha] = ["Id", "Instrumento", "Nombre", "Medio", "Fecha"].map(t.col);
  return t.filas.map((f) => ({
    id: idInstrumento(f[id], "instrumentos"),
    instrumento: txt(f[instrumento]) ?? "",
    nombre: txt(f[nombre]) ?? "",
    medio: txt(f[medio]) ?? "",
    fecha: txt(f[fecha]) ?? "",
  }));
}

function mesas(hojas: HojasActividad2): MesaActividad2[] {
  const t = tabla(hojas, "mesas");
  const mesa = t.col("Mesa");
  const transformacion = t.col("Transformación");
  const nombreEquipo = t.colQueEmpieza("Nombre equipo");
  const integrantes = t.col("Integrantes");
  const archivo = t.col("Archivo");
  const resultado = t.colQueEmpieza("¿Qué resultado");
  const cierre = t.colQueEmpieza("Mensaje de cierre");
  // Las tres preguntas de la «Propuesta MESA», en el orden de la ficha.
  const preguntas = t.encabezados.flatMap((h, i) => (h.startsWith("¿") && i !== resultado ? [i] : []));
  if (preguntas.length !== 3) throw new Error("actividad2.xlsx: la hoja «mesas» debe traer las tres preguntas de la ficha («¿Qué cambio…», «¿En quién…», «¿Cómo sabremos…»).");
  return t.filas.map((f) => {
    const n = entero(f[mesa]);
    if (n === null) throw new Error(`actividad2.xlsx: mesa sin número en la hoja «mesas» («${String(f[mesa])}»).`);
    return {
      mesa: n,
      transformacion: txt(f[transformacion]) ?? "",
      nombreEquipo: txt(f[nombreEquipo]),
      integrantes: txt(f[integrantes]),
      resultado: { pregunta: t.encabezados[resultado], texto: txt(f[resultado]) },
      respuestas: preguntas.map((i) => ({ pregunta: t.encabezados[i], texto: txt(f[i]) })),
      cierre: { pregunta: t.encabezados[cierre], texto: txt(f[cierre]) },
      archivo: txt(f[archivo]) ?? "",
    };
  });
}

const COLUMNAS_INDICADOR = {
  indicador: "Indicador",
  formula: "Fórmula de cálculo",
  desagregacion: "Desagregación",
  medio: "Medio de verificación",
  periodicidad: "Periodicidad",
  responsable: "Responsable",
} as const;

function indicadores(hojas: HojasActividad2): { lista: IndicadorActividad2[]; encabezados: Actividad2Momento5["encabezadosIndicadores"] } {
  const t = tabla(hojas, "indicadores");
  const mesa = t.col("Mesa");
  const orden = t.col("Orden");
  const adicional = t.col("Texto adicional de la mesa");
  const origen = t.col("Origen");
  // «Desagregación (Multicampus, sede o programas)»: se busca por el comienzo y se muestra completo.
  const c = Object.fromEntries(Object.entries(COLUMNAS_INDICADOR).map(([k, v]) => [k, k === "desagregacion" ? t.colQueEmpieza(v) : t.col(v)])) as Record<
    keyof typeof COLUMNAS_INDICADOR,
    number
  >;
  const lista = t.filas.map((f) => {
    const n = entero(f[mesa]);
    const indicador = txt(f[c.indicador]);
    if (n === null || !indicador) throw new Error(`actividad2.xlsx: fila de «indicadores» sin mesa o sin indicador («${String(f[c.indicador])}»).`);
    return {
      mesa: n,
      orden: entero(f[orden]) ?? 0,
      indicador,
      formula: txt(f[c.formula]),
      desagregacion: txt(f[c.desagregacion]),
      medio: txt(f[c.medio]),
      periodicidad: txt(f[c.periodicidad]),
      responsable: txt(f[c.responsable]),
      adicional: txt(f[adicional]),
      origen: txt(f[origen]),
    };
  });
  lista.sort((a, b) => a.mesa - b.mesa || a.orden - b.orden);
  const encabezados = Object.fromEntries(Object.entries(c).map(([k, i]) => [k, t.encabezados[i]])) as Actividad2Momento5["encabezadosIndicadores"];
  return { lista, encabezados };
}

function reto2(hojas: HojasActividad2): RegistroReto2[] {
  const t = tabla(hojas, "reto2");
  const [registro, mesaQueRegistra, mesaRevisada, transformacion, encabezado, registradoPor, elemento, diligenciamiento, archivo] = [
    "Registro",
    "Mesa que registra",
    "Mesa revisada",
    "Transformación",
    "Encabezado",
    "Registrado por",
    "Elemento",
    "Diligenciamiento",
    "Archivo",
  ].map(t.col);
  const porRegistro = new Map<number, RegistroReto2>();
  for (const f of t.filas) {
    const n = entero(f[registro]);
    const mesa = entero(f[mesaQueRegistra]);
    if (n === null || mesa === null) throw new Error("actividad2.xlsx: fila de «reto2» sin número de registro o sin mesa que registra.");
    let r = porRegistro.get(n);
    if (!r) {
      r = {
        registro: n,
        mesaQueRegistra: mesa,
        mesaRevisada: entero(f[mesaRevisada]),
        transformacion: txt(f[transformacion]),
        encabezado: txt(f[encabezado]),
        registradoPor: txt(f[registradoPor]),
        elementos: [],
        archivo: txt(f[archivo]) ?? "",
      };
      porRegistro.set(n, r);
    }
    r.elementos.push({ elemento: txt(f[elemento]) ?? "", texto: txt(f[diligenciamiento]) });
  }
  return [...porRegistro.values()].sort((a, b) => a.registro - b.registro);
}

function nubes(hojas: HojasActividad2): NubeActividad2[] {
  const t = tabla(hojas, "nubes");
  const [instrumento, pregunta, frase, tamano, omite] = ["Instrumento", "Pregunta", "Frase", "Tamaño en la imagen", "Se omite"].map(t.col);
  const porInstrumento = new Map<InstrumentoActividad2Id, NubeActividad2>();
  for (const f of t.filas) {
    const id = idInstrumento(f[instrumento], "nubes");
    const texto = txt(f[frase]);
    if (!texto) continue;
    let nube = porInstrumento.get(id);
    if (!nube) {
      nube = { instrumento: id, pregunta: txt(f[pregunta]) ?? "", frases: [], omitidas: [] };
      porInstrumento.set(id, nube);
    }
    const motivo = txt(f[omite]);
    if (motivo) nube.omitidas.push({ frase: texto, motivo });
    // Tamaño 1–3; fuera de rango cuenta como el más pequeño.
    else nube.frases.push({ frase: texto, tamano: Math.max(1, Math.min(3, entero(f[tamano]) ?? 1)) });
  }
  return [...porInstrumento.values()];
}

function archivos(hojas: HojasActividad2): ArchivoActividad2[] {
  const t = tabla(hojas, "archivos");
  const [archivo, carpeta, mesa, guardadoPor, guardadoEl, uso, nota] = ["Archivo", "Carpeta", "Mesa", "Guardado por", "Guardado el", "Uso", "Nota"].map(t.col);
  return t.filas.map((f) => ({
    archivo: txt(f[archivo]) ?? "",
    carpeta: txt(f[carpeta]) ?? "",
    mesa: entero(f[mesa]),
    guardadoPor: txt(f[guardadoPor]),
    guardadoEl: txt(f[guardadoEl]),
    uso: txt(f[uso]) ?? "",
    nota: txt(f[nota]),
  }));
}

export function interpretarActividad2(hojas: HojasActividad2): Actividad2Momento5 {
  const enunciados = tabla(hojas, "enunciados");
  const [instrumento, enunciado] = ["Instrumento", "Enunciado"].map(enunciados.col);
  const ind = indicadores(hojas);
  return {
    instrumentos: instrumentos(hojas),
    enunciados: enunciados.filas.flatMap((f) => {
      const texto = txt(f[enunciado]);
      return texto ? [{ instrumento: idInstrumento(f[instrumento], "enunciados"), enunciado: texto }] : [];
    }),
    encabezadosIndicadores: ind.encabezados,
    mesas: mesas(hojas).sort((a, b) => a.mesa - b.mesa),
    indicadores: ind.lista,
    reto2: reto2(hojas),
    nubes: nubes(hojas),
    archivos: archivos(hojas),
  };
}

/** Hojas que lee el origen, en el orden del libro. */
export const HOJAS_ACTIVIDAD2 = ["instrumentos", "enunciados", "mesas", "indicadores", "reto2", "nubes", "archivos"];
