import "server-only";
import { join } from "node:path";
import type { WorkBook } from "xlsx";
import type {
  CalculoMuestra,
  DepuracionGraduados,
  EstamentoMuestreo,
  EstratoMuestreo,
  NotaMetodologica,
  ParametrosMuestreo,
  TotalEstamento,
  UnidadRegionalMuestreo,
} from "@/types/nota-metodologica";
import { lecturaDeMargen, margenErrorCon } from "@/lib/reglas/nota-metodologica";
import type { NotaMetodologicaDataSource } from "./types";
import { hojaAMatriz, leerLibro } from "./infrastructure/excel";
import { CacheArchivo } from "./infrastructure/cache-archivo";

const ARCHIVO = "Diseño muestral - Mesas de diálogo PE 2027-2037.xlsx";

/** Registros de asistencia que no pertenecen a la unidad donde se contaron (`unidad` va normalizada). */
const AJUSTES_ASISTENCIA: { estamento: EstamentoMuestreo; unidad: string; descontar?: number; dejar?: number }[] = [
  { estamento: "administrativos", unidad: "soacha", descontar: 4 },
  { estamento: "administrativos", unidad: "ubate", dejar: 33 },
];

const HOJA_POR_ESTAMENTO: Record<EstamentoMuestreo, string> = {
  estudiantes: "Estudiantes",
  docentes: "Docentes",
  administrativos: "Administrativos",
  graduados: "Graduados",
};

const ESTAMENTOS = Object.keys(HOJA_POR_ESTAMENTO) as EstamentoMuestreo[];

/** Sin tildes, sin saltos de línea y en minúscula: los encabezados traen «Población\r\n(N)». */
function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function texto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function numero(valor: unknown, contexto: string): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) throw new Error(`Nota metodológica: falta un número en ${contexto}.`);
  return n;
}

function numeroOpcional(valor: unknown): number | null {
  if (valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** «40.309» → 40309. */
function enteroDeTexto(valor: string): number {
  return Number(valor.replace(/\./g, ""));
}

/** «Estudiantes (Creadores…)» → "estudiantes"; null si la celda no nombra un estamento. */
function estamentoDe(valor: unknown): EstamentoMuestreo | null {
  const primeraPalabra = normalizar(valor).split(/[\s(]/)[0];
  return ESTAMENTOS.find((e) => e === primeraPalabra) ?? null;
}

function columna(encabezados: string[], hoja: string, criterio: (h: string) => boolean): number {
  const indice = encabezados.findIndex(criterio);
  if (indice < 0) throw new Error(`Nota metodológica: la hoja «${hoja}» cambió de columnas.`);
  return indice;
}

/** Viñetas «• …» entre el título de una sección y el de la siguiente. */
function vinetasDeSeccion(filas: unknown[][], inicio: string, fin: string | null): string[] {
  const desde = filas.findIndex((f) => normalizar(f[0]).startsWith(inicio));
  if (desde < 0) return [];
  const hasta = fin ? filas.findIndex((f, i) => i > desde && normalizar(f[0]).startsWith(fin)) : -1;
  return filas
    .slice(desde + 1, hasta < 0 ? undefined : hasta)
    .map((f) => texto(f[0]))
    .filter((t) => t.startsWith("•"))
    .map((t) => t.replace(/^•\s*/, ""));
}

/**
 * Lee el libro del diseño muestral de las mesas de diálogo. Las cifras se toman
 * como las calculó el Excel (no se recalculan aquí): la sección debe mostrar
 * exactamente lo que se entrega para verificar la metodología. Las columnas se
 * buscan por su encabezado y no por letra, para que insertar una columna no
 * desplace los datos en silencio.
 */
export class ExcelNotaMetodologicaDataSource implements NotaMetodologicaDataSource {
  private readonly cache: CacheArchivo<NotaMetodologica>;

  constructor(directorioFuente = join(process.cwd(), "data", "source-nota-metodologica")) {
    const ruta = join(directorioFuente, ARCHIVO);
    this.cache = new CacheArchivo([ruta], () => this.leer(leerLibro(ruta)));
  }

  getNotaMetodologica(): NotaMetodologica {
    return this.cache.obtener();
  }

  private hoja(libro: WorkBook, nombre: string): unknown[][] {
    const filas = hojaAMatriz(libro, nombre, { raw: true, defval: null });
    if (!filas) throw new Error(`Nota metodológica: falta la hoja «${nombre}».`);
    return filas;
  }

  private leer(libro: WorkBook): NotaMetodologica {
    const metodologia = this.hoja(libro, "Metodología");
    const parametros = this.leerParametros(metodologia);
    const calculos = ESTAMENTOS.flatMap((e) => this.leerCalculos(libro, e));
    const { estratos, totales, unidades, fuente } = this.leerParticipacion(libro, calculos);
    this.descontarAsistentesAjenos(estratos, totales, parametros);

    const etiquetas = new Map<EstamentoMuestreo, string>();
    for (const fila of metodologia) {
      const estamento = estamentoDe(fila[0]);
      if (estamento && !etiquetas.has(estamento) && typeof fila[1] === "number") {
        etiquetas.set(estamento, texto(fila[0]));
      }
    }
    for (const total of totales) total.etiqueta = etiquetas.get(total.estamento) ?? total.etiqueta;

    const notasPoblacion = vinetasDeSeccion(metodologia, "3. poblacion", "4. tipo");
    return {
      parametros,
      unidades,
      totales,
      estratos,
      calculos,
      fuentePoblacion: texto(metodologia.find((f) => normalizar(f[0]).startsWith("fuente:"))?.[0]),
      notasPoblacion,
      depuracionGraduados: this.leerDepuracion(notasPoblacion),
      asistencia: {
        fuente,
        registros: (() => {
          const m = fuente.match(/([\d.]+)\s+registros/);
          return m ? enteroDeTexto(m[1]) : null;
        })(),
        // El Excel escribe la fecha con guiones no separables, que varias tipografías no traen.
        corte:
          fuente.match(/\d{1,2}[‐‑-][a-záéíóú]{3}[‐‑-]\d{4}/i)?.[0].replace(/[‐‑]/g, "-") ??
          null,
      },
      alcance: vinetasDeSeccion(metodologia, "9. alcance", null),
    };
  }

  private leerParametros(filas: unknown[][]): ParametrosMuestreo {
    const valor = (prefijo: string) =>
      numero(filas.find((f) => normalizar(f[0]).startsWith(prefijo))?.[1], `el parámetro «${prefijo}»`);
    return {
      confianza: valor("nivel de confianza"),
      z: valor("z (valor"),
      proporcion: valor("p (proporcion"),
      margenError: valor("e (margen"),
      umbralCenso: valor("umbral de censo"),
    };
  }

  private leerCalculos(libro: WorkBook, estamento: EstamentoMuestreo): CalculoMuestra[] {
    const nombre = HOJA_POR_ESTAMENTO[estamento];
    const filas = this.hoja(libro, nombre);
    const inicio = filas.findIndex((f) => normalizar(f[0]) === "unidad regional");
    if (inicio < 0) throw new Error(`Nota metodológica: la hoja «${nombre}» no tiene la tabla de cálculo.`);
    const enc = filas[inicio].map(normalizar);
    const c = {
      vinculacion: enc.findIndex((h) => h.startsWith("vinculacion")),
      poblacion: columna(enc, nombre, (h) => h.startsWith("poblacion")),
      metodo: columna(enc, nombre, (h) => h.startsWith("metodo")),
      muestra: columna(enc, nombre, (h) => h.includes("muestra calculada")),
      tope: columna(enc, nombre, (h) => h.startsWith("tope")),
      convocados: columna(enc, nombre, (h) => h.includes("poblacion convocada")),
      observacion: enc.findIndex((h) => h.startsWith("observacion")),
    };

    const calculos: CalculoMuestra[] = [];
    for (const fila of filas.slice(inicio + 1)) {
      const unidad = texto(fila[0]);
      if (!unidad || normalizar(unidad) === "total") break;
      const contexto = `«${nombre}», ${unidad}`;
      calculos.push({
        estamento,
        unidad,
        vinculacion: c.vinculacion >= 0 ? texto(fila[c.vinculacion]) || null : null,
        poblacion: numero(fila[c.poblacion], contexto),
        censo: normalizar(fila[c.metodo]) === "censo",
        muestraCalculada: numero(fila[c.muestra], contexto),
        topeLogistico: numeroOpcional(fila[c.tope]),
        convocados: numero(fila[c.convocados], contexto),
        observacion: c.observacion >= 0 ? texto(fila[c.observacion]) || null : null,
      });
    }
    return calculos;
  }

  private leerParticipacion(libro: WorkBook, calculos: CalculoMuestra[]) {
    const nombre = "Participación";
    const filas = this.hoja(libro, nombre);
    const estratos: EstratoMuestreo[] = [];
    const totales: TotalEstamento[] = [];
    const unidades: UnidadRegionalMuestreo[] = [];

    for (let i = 0; i < filas.length - 1; i++) {
      const estamento = estamentoDe(filas[i][0]);
      if (!estamento || normalizar(filas[i + 1][0]) !== "unidad regional") continue;
      const enc = filas[i + 1].map(normalizar);
      const c = {
        tipo: columna(enc, nombre, (h) => h.startsWith("tipo de unidad")),
        poblacion: columna(enc, nombre, (h) => h.startsWith("poblacion (n)")),
        convocados: columna(enc, nombre, (h) => h.startsWith("poblacion convocada")),
        asistentes: columna(enc, nombre, (h) => h === "asistentes"),
        enCalculo: columna(enc, nombre, (h) => h.startsWith("asistentes usados")),
        margenDiseno: columna(enc, nombre, (h) => h.startsWith("margen de error de diseno")),
        margenReal: columna(enc, nombre, (h) => h.startsWith("margen de error real")),
        lectura: columna(enc, nombre, (h) => h === "lectura"),
      };

      for (const fila of filas.slice(i + 2)) {
        const unidad = texto(fila[0]);
        if (!unidad) break;
        const contexto = `«${nombre}», ${estamento}, ${unidad}`;
        const comunes = {
          poblacion: numero(fila[c.poblacion], contexto),
          convocados: numero(fila[c.convocados], contexto),
          asistentes: numero(fila[c.asistentes], contexto),
          margenDiseno: numero(fila[c.margenDiseno], contexto),
          margenReal: numero(fila[c.margenReal], contexto),
          lectura: texto(fila[c.lectura]),
        };
        const propios = calculos.filter((k) => k.estamento === estamento);

        if (normalizar(unidad) === "total") {
          totales.push({
            estamento,
            etiqueta: texto(filas[i][0]),
            ...comunes,
            muestraCalculada: propios.reduce((s, k) => s + k.muestraCalculada, 0),
          });
          break;
        }

        if (!unidades.some((u) => u.nombre === unidad)) unidades.push({ nombre: unidad, tipo: texto(fila[c.tipo]) });
        // Administrativos se calcula por vinculación (planta y OPS-APA) y se suma por unidad.
        const deLaUnidad = propios.filter((k) => k.unidad === unidad);
        const topes = deLaUnidad.map((k) => k.topeLogistico).filter((t): t is number => t !== null);
        estratos.push({
          estamento,
          unidad,
          ...comunes,
          asistentesDescontados: 0,
          asistentesEnCalculo: numero(fila[c.enCalculo], contexto),
          muestraCalculada: deLaUnidad.reduce((s, k) => s + k.muestraCalculada, 0),
          topeLogistico: topes.length ? topes.reduce((s, t) => s + t, 0) : null,
          censo: deLaUnidad.length > 0 && deLaUnidad.every((k) => k.censo),
          observacion: [...new Set(deLaUnidad.map((k) => k.observacion).filter(Boolean))].join(" ") || null,
        });
      }
    }

    if (totales.length !== ESTAMENTOS.length) {
      throw new Error("Nota metodológica: la hoja «Participación» no trae los cuatro estamentos.");
    }
    const fuente = texto(filas.find((f) => normalizar(f[0]).startsWith("asistentes:"))?.[0]);
    return { estratos, totales, unidades, fuente };
  }

  /**
   * La asistencia se cuenta por «Lugar de desarrollo» y la base no trae la
   * unidad regional de origen del personal administrativo, así que no hay
   * forma de detectar en los datos a quienes asistieron desde otra unidad:
   * el descuento lo informó la coordinación y se aplica aquí.
   */
  private descontarAsistentesAjenos(
    estratos: EstratoMuestreo[],
    totales: TotalEstamento[],
    parametros: ParametrosMuestreo
  ) {
    for (const ajuste of AJUSTES_ASISTENCIA) {
      const estrato = estratos.find(
        (e) => e.estamento === ajuste.estamento && normalizar(e.unidad).includes(ajuste.unidad)
      );
      const total = totales.find((t) => t.estamento === ajuste.estamento);
      if (!estrato || !total) continue;
      const quitar = ajuste.dejar !== undefined ? estrato.asistentes - ajuste.dejar : (ajuste.descontar ?? 0);
      if (quitar <= 0) continue;
      estrato.asistentes -= quitar;
      estrato.asistentesDescontados = quitar;
      estrato.asistentesEnCalculo = Math.min(estrato.asistentes, estrato.poblacion);
      estrato.margenReal = margenErrorCon(estrato.poblacion, estrato.asistentesEnCalculo, parametros);
      estrato.lectura = lecturaDeMargen(estrato.margenReal, parametros);
      total.asistentes -= quitar;
    }
  }

  /** Las cifras de la depuración solo están en el texto de la viñeta de graduados. */
  private leerDepuracion(notas: string[]): DepuracionGraduados | null {
    for (const nota of notas) {
      const m = nota.match(
        /de\s+([\d.]+)\s+registros.*?eliminaron\s+([\d.]+).*?:\s*([\d.]+)\s+personas;\s*([\d.]+)\s+en/i
      );
      if (m) {
        return {
          registros: enteroDeTexto(m[1]),
          repetidos: enteroDeTexto(m[2]),
          personas: enteroDeTexto(m[3]),
          enUnidades: enteroDeTexto(m[4]),
        };
      }
    }
    return null;
  }
}
