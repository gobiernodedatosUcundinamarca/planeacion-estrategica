import type {
  Actividad2Momento5,
  IndicadorActividad2,
  InstrumentoActividad2,
  MesaActividad2,
} from "@/types/momento5-actividad2";
import { numeroActividad, ordenAplicacion, type FiltroEquipo } from "./momento5";

/**
 * Cálculos de la Actividad 2 del Momento 5. Solo cuentan y ordenan lo que las
 * mesas escribieron: ningún texto se reescribe. Vive en `lib/reglas/` porque
 * lo usan la vista y las pruebas.
 *
 * Mesa N es el Equipo N del Momento 5: los integrantes que traen las fichas de
 * las mesas 1, 3 y 8 son exactamente los de esos equipos, y quien guardó cada
 * ficha es del equipo de su mesa (tests/momento5-actividad2.test.ts). Por eso
 * el filtro de equipo de la sección también filtra las mesas.
 */

// --- Menú: los formularios y los instrumentos, agrupados por actividad ----------------------

export interface SeccionMomento5 {
  id: string;
  nombre: string;
  /** «Instrumento 1»…, solo en la Actividad 2. */
  instrumento: string | null;
}

export interface GrupoActividad {
  actividad: number;
  secciones: SeccionMomento5[];
}

/** Nombre del Kahoot de la Actividad 3, como lo llaman los responsables (el reporte no trae título). */
export const NOMBRE_KAHOOT = "Kahoot de Apropiación del MEDIT";

/**
 * El orden en que se vivió la jornada: Actividad 1 (formularios del 17),
 * Actividad 2 (instrumentos por mesa del 17) y Actividad 3 (formularios del
 * 18 y, si hay reporte, el Kahoot de Apropiación del MEDIT, al final). Los
 * formularios sin actividad conocida van al final, con su orden.
 */
export function gruposPorActividad(
  formularios: { id: string; nombre: string; fecha: string }[],
  instrumentos: InstrumentoActividad2[],
  conKahoot = false
): GrupoActividad[] {
  const grupos = new Map<number, SeccionMomento5[]>();
  const agregar = (n: number, s: SeccionMomento5) => grupos.set(n, [...(grupos.get(n) ?? []), s]);
  for (const f of ordenAplicacion(formularios)) agregar(numeroActividad(f.fecha) ?? 99, { id: f.id, nombre: f.nombre, instrumento: null });
  for (const i of instrumentos) agregar(2, { id: i.id, nombre: i.nombre, instrumento: i.instrumento });
  if (conKahoot) agregar(3, { id: "kahoot", nombre: NOMBRE_KAHOOT, instrumento: null });
  return [...grupos.entries()].sort(([a], [b]) => a - b).map(([actividad, secciones]) => ({ actividad, secciones }));
}

// --- Periodicidad de los indicadores -------------------------------------------------------

export const CATEGORIAS_PERIODICIDAD = ["Anual", "Semestral", "Otra", "Sin dato"] as const;
export type CategoriaPeriodicidad = (typeof CATEGORIAS_PERIODICIDAD)[number];

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/**
 * Agrupa lo que la mesa escribió en «Periodicidad» por su primera palabra:
 * «anual», «Anual (por cohorte)» y «Anual, con cortes acumulados…» son
 * anuales. Si la mesa dio dos («Semestral (seguimiento) / Anual (resultado)»),
 * cuenta la primera. «Según periodo certificado» queda en «Otra».
 */
export function categoriaPeriodicidad(texto: string | null): CategoriaPeriodicidad {
  if (!texto) return "Sin dato";
  const t = sinTildes(texto);
  if (t.startsWith("anual")) return "Anual";
  if (t.startsWith("semestral")) return "Semestral";
  return "Otra";
}

// --- Derivados con el filtro de equipo -------------------------------------------------------

export interface MesaConIndicadores extends MesaActividad2 {
  indicadores: IndicadorActividad2[];
}

export interface TransformacionActividad2 {
  nombre: string;
  mesas: MesaConIndicadores[];
}

export function derivarActividad2(a2: Actividad2Momento5, eq: FiltroEquipo) {
  const enMesa = (n: number | null) => eq === null || n === eq;
  const indicadores = a2.indicadores.filter((i) => enMesa(i.mesa));
  const mesas: MesaConIndicadores[] = a2.mesas
    .filter((m) => enMesa(m.mesa))
    .map((m) => ({ ...m, indicadores: indicadores.filter((i) => i.mesa === m.mesa) }));

  // Las transformaciones en el orden de las mesas (1 y 2, Inteligente; 3 y 4, Translocal…).
  const nombres = [...new Set(a2.mesas.map((m) => m.transformacion))];
  const transformaciones: TransformacionActividad2[] = nombres
    .map((nombre) => ({ nombre, mesas: mesas.filter((m) => m.transformacion === nombre) }))
    .filter((t) => t.mesas.length > 0);

  const maximo = Math.max(0, ...mesas.map((m) => m.indicadores.length));
  const mesasConMas = maximo ? mesas.filter((m) => m.indicadores.length === maximo).map((m) => m.mesa) : [];

  const periodicidad = CATEGORIAS_PERIODICIDAD.map((c) => ({
    id: c,
    label: c,
    value: indicadores.filter((i) => categoriaPeriodicidad(i.periodicidad) === c).length,
  })).filter((c) => c.value > 0);

  return {
    eq,
    mesas,
    indicadores,
    transformaciones,
    maximo,
    mesasConMas,
    periodicidad,
    cierres: mesas.filter((m) => m.cierre.texto),
    reto2: a2.reto2.filter((r) => enMesa(r.mesaQueRegistra) || (r.mesaRevisada !== null && enMesa(r.mesaRevisada))),
  };
}

export type DerivadosActividad2 = ReturnType<typeof derivarActividad2>;

// --- Personas ------------------------------------------------------------------------------

/**
 * Equipo de una persona por su nombre completo (sin tildes ni mayúsculas):
 * sirve para decir a qué equipo pertenece quien guardó un archivo. Sin
 * coincidencia exacta, null; nunca se adivina por parecido.
 */
export function equipoDePersona(nombre: string | null, participantes: { nombre: string; equipo: number | null }[]): number | null {
  if (!nombre) return null;
  const buscado = sinTildes(nombre).replace(/\s+/g, " ");
  return participantes.find((p) => sinTildes(p.nombre).replace(/\s+/g, " ") === buscado)?.equipo ?? null;
}

// --- Nube de frases --------------------------------------------------------------------------

/** Caja de una frase ya medida (ancho y alto con su margen), en unidades del dibujo. */
export interface CajaNube {
  ancho: number;
  alto: number;
}

/** Centro de cada caja, en el mismo orden en que llegaron. */
export interface PosicionNube {
  x: number;
  y: number;
}

/** Ángulo áureo: reparte el punto de partida de cada frase alrededor del centro. */
const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));

/**
 * Acomoda las frases como una nube: la más grande en el centro y cada una de
 * las siguientes en el primer hueco libre de una espiral elíptica (más ancha
 * que alta, `proporcion`), sin rotarlas para que se lean. Las cajas no se
 * solapan y ninguna frase se descarta: la espiral sigue hasta encontrar sitio,
 * a diferencia de d3-cloud, que deja fuera lo que no cabe en el lienzo. Es
 * determinista: las mismas cajas dan siempre la misma nube.
 */
export function disponerNube(cajas: CajaNube[], proporcion = 2.3): PosicionNube[] {
  // Primero las más altas (letra más grande); entre iguales, el orden de la transcripción.
  const orden = cajas.map((_, i) => i).sort((a, b) => cajas[b].alto - cajas[a].alto || a - b);
  const puestas: { x: number; y: number; ancho: number; alto: number }[] = [];
  const posiciones: PosicionNube[] = cajas.map(() => ({ x: 0, y: 0 }));
  const choca = (x: number, y: number, c: CajaNube) =>
    puestas.some((p) => Math.abs(p.x - x) * 2 < p.ancho + c.ancho && Math.abs(p.y - y) * 2 < p.alto + c.alto);

  orden.forEach((i, k) => {
    const caja = cajas[i];
    // Sentido y punto de partida alternos: así la nube crece pareja hacia los lados y no en una sola dirección.
    const sentido = k % 2 === 0 ? 1 : -1;
    const inicio = k * ANGULO_AUREO;
    let x = 0;
    let y = 0;
    for (let t = 0; choca(x, y, caja); t += 0.05) {
      const radio = 1.2 * t;
      x = proporcion * radio * Math.cos(inicio + sentido * t);
      y = radio * Math.sin(inicio + sentido * t);
    }
    puestas.push({ x, y, ...caja });
    posiciones[i] = { x, y };
  });
  return posiciones;
}
