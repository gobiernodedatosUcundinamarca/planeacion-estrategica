import type {
  AcuerdoEquipo,
  CatalogoMomento5,
  ComponentePlan,
  FormularioMomento5,
  ResultadosMomento5,
  TipoFormulario,
  TransformacionId,
} from "@/types/momento5";

/**
 * Cálculos de la sección «Resultados Momento 5 · CAI». Son los mismos del
 * dashboard de análisis original (`derive.ts`), como función pura: la vista los
 * recalcula al cambiar el filtro de equipo y las pruebas los comparan con las
 * cifras publicadas. Vive en `lib/reglas/` porque lo usan la vista y las pruebas.
 */

export const TITULO_MOMENTO5 = "Resultados Momento 5 · CAI Planeación Estratégica 2027–2037";

/** null = todos los equipos. */
export type FiltroEquipo = number | null;

const enEquipo = (eq: FiltroEquipo) => (x: { equipo: number | null }) => eq === null || x.equipo === eq;

export interface PropuestaAjuste {
  nombre: string;
  equipo: number | null;
  ajuste?: string;
  justificacion?: string;
}

export interface ComponenteValorado extends ComponentePlan {
  t: TransformacionId;
  V: number;
  A: number;
  total: number;
  /** Fracción (0–1) de valoraciones que piden ajuste. */
  pct: number;
  propuestas: PropuestaAjuste[];
}

/**
 * El enunciado del componente solo si llegó entero. Microsoft Forms exporta los
 * encabezados con un máximo de 200 caracteres y los objetivos y resultados
 * largos llegan cortados («…», `truncado`). Un enunciado a medias no se
 * muestra: sin el texto oficial completo, el componente se nombra por su rótulo.
 */
export function enunciadoCompleto(c: Pick<ComponentePlan, "texto" | "truncado">): string | null {
  return c.texto && !c.truncado ? c.texto : null;
}

export interface ConteoCategoria {
  id: string;
  label: string;
  value: number;
  sub?: string;
}

/** Tipos de componente, en el orden de las columnas de la matriz de acuerdos. */
export const TIPOS_COMPONENTE = ["Objetivo estratégico", "Ámbito de transformación", "Resultado estratégico"];

export const TIPO_CORTO: Record<string, string> = {
  "Objetivo estratégico": "Objetivo",
  "Ámbito de transformación": "Ámbito",
  "Resultado estratégico": "Resultado",
};

const AGRUPACIONES_COMPONENTE = [
  { id: "OE", label: "Objetivos estratégicos" },
  { id: "A", label: "Ámbitos de transformación" },
  { id: "R", label: "Resultados estratégicos" },
];

/** OE = objetivo; Á1, Á2… = ámbitos; el resto (R1, R2…) = resultados. */
export function tipoDeCodigo(code: string): "OE" | "A" | "R" {
  return code === "OE" ? "OE" : code.startsWith("Á") ? "A" : "R";
}

/** Tramo de la escala de calor (fracción que requiere ajuste) → 0…5. */
export const binAjuste = (pct: number) => Math.max(0, Math.min(5, Math.floor((Number.isFinite(pct) ? pct : 0) * 10)));
export const BINS_AJUSTE = ["0–9 %", "10–19 %", "20–29 %", "30–39 %", "40–49 %", "≥ 50 %"];

/** Paso de la escala de la matriz de acuerdos para un conteo (null = sin ajustes). */
export const pasoAjustes = (n: number, max: number) =>
  n === 0 ? null : Math.min(5, Math.ceil((n / Math.max(1, max)) * 5));

/** El equipo validó sin más ajustes los demás componentes («SI»). */
export const validaDemasComponentes = (a: AcuerdoEquipo) => (a.validaDemas ?? "").toUpperCase().startsWith("S");

/**
 * Porcentajes (0–100, un decimal) de «se valida» y «requiere ajuste» que
 * siempre suman 100: se redondea uno y el otro es el complemento.
 */
export function porcentajesComplementarios(A: number, total: number): { valida: number; ajuste: number } {
  if (!total) return { valida: 0, ajuste: 0 };
  const ajuste = Math.round((A / total) * 1000) / 10;
  return { valida: Math.round((100 - ajuste) * 10) / 10, ajuste };
}

/**
 * Los formularios en el orden en que se aplicaron: por fecha y, dentro del
 * mismo día, en el orden del archivo, que sigue la hora de inicio de cada
 * formulario (el JSON no trae horas; ver «estructura de datos.md», §2).
 */
export function ordenAplicacion<T extends { fecha: string }>(formularios: T[]): T[] {
  return formularios
    .map((f, i) => ({ f, i }))
    .sort((a, b) => a.f.fecha.localeCompare(b.f.fecha) || a.i - b.i)
    .map(({ f }) => f);
}

/** Un individual cuenta personas; un grupal, equipos. */
export function unidadFormulario(tipo: TipoFormulario, valor: number): string {
  return tipo === "Grupal" ? (valor === 1 ? "equipo" : "equipos") : "personas";
}

export function indicePorId(catalogo: CatalogoMomento5[]): Record<string, string> {
  return Object.fromEntries(catalogo.map((c) => [c.id, c.nombre]));
}

export function nombresDeTransformacion(datos: ResultadosMomento5): Record<string, string> {
  return Object.fromEntries(datos.transformaciones.map((t) => [t.id, t.nombre]));
}

const fechaLargaFmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
const fechaCortaFmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });

function fechaIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const fecha = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** «2026-11-17» → «17 de noviembre». Si la fecha no es válida, se devuelve tal cual. */
export function fechaLarga(iso: string): string {
  const fecha = fechaIso(iso);
  return fecha ? fechaLargaFmt.format(fecha) : iso;
}

/**
 * Número de la actividad en que se aplicó cada formulario, como se nombra de
 * cara al público: los del 17 son la Actividad 1 y los del 18, la Actividad 3.
 * La Actividad 2 (también el 17, después de la 1) no tiene formularios de
 * Forms: son las fichas por mesa y Mentimeter (`momento5-actividad2.ts`).
 */
const ACTIVIDAD_DE_FECHA: Record<string, number> = { "2026-11-17": 1, "2026-11-18": 3 };

export function numeroActividad(iso: string): number | null {
  return ACTIVIDAD_DE_FECHA[iso] ?? null;
}

export function nombreActividad(iso: string): string {
  const n = numeroActividad(iso);
  return n === null ? fechaLarga(iso) : `Actividad ${n}`;
}

/** «2026-11-17» → «17 nov.» (es-CO formatea «17 de nov.»; la tabla usa la forma compacta). */
export function fechaCorta(iso: string): string {
  const fecha = fechaIso(iso);
  if (!fecha) return iso;
  const partes = fechaCortaFmt.formatToParts(fecha);
  const dia = partes.find((p) => p.type === "day")?.value;
  const mes = partes.find((p) => p.type === "month")?.value.replace(/\.$/, "");
  return dia && mes ? `${dia} ${mes}.` : fechaCortaFmt.format(fecha);
}

function contarPorCatalogo<T>(catalogo: CatalogoMomento5[], filas: T[], incluye: (fila: T, id: string) => boolean): ConteoCategoria[] {
  return catalogo
    .map((c) => ({ id: c.id, label: c.nombre, value: filas.filter((f) => incluye(f, c.id)).length }))
    .sort((a, b) => b.value - a.value);
}

/** Todas las cifras de la sección para un equipo (o para todos, con `null`). */
export function derivarMomento5(datos: ResultadosMomento5, eq: FiltroEquipo) {
  const participantes = datos.participantes.filter(enEquipo(eq));
  const validacion = datos.validacion.filter(enEquipo(eq));
  const acuerdos = datos.acuerdos.filter(enEquipo(eq));
  const percepcion = datos.percepcion.filter(enEquipo(eq));
  const consolidacion = datos.consolidacion.filter(enEquipo(eq));
  const matriz = datos.matriz.filter(enEquipo(eq));
  const equipoInfo = eq === null ? null : (datos.equipos.find((e) => e.equipo === eq) ?? null);
  const nombreDe = new Map(datos.participantes.map((p) => [p.pid, p.nombre]));

  // --- Validación por transformación ---------------------------------------------------
  const porT = datos.transformaciones.map((t) => {
    const vs = validacion.filter((v) => v.t === t.id);
    const A = vs.filter((v) => v.e === "A").length;
    return { t: t.id, nombre: t.nombre, V: vs.length - A, A, total: vs.length };
  });

  // --- Validación por tipo de componente -------------------------------------------------
  const porTipoComp = AGRUPACIONES_COMPONENTE.map((x) => {
    const vs = validacion.filter((v) => tipoDeCodigo(v.c) === x.id);
    const A = vs.filter((v) => v.e === "A").length;
    return { ...x, V: vs.length - A, A, total: vs.length };
  });

  // --- Validación por componente --------------------------------------------------------
  const porComp: Record<TransformacionId, ComponenteValorado[]> = {};
  for (const t of datos.transformaciones) {
    porComp[t.id] = t.componentes.map((c) => {
      const vs = validacion.filter((v) => v.t === t.id && v.c === c.code);
      const aj = vs.filter((v) => v.e === "A");
      return {
        ...c,
        t: t.id,
        V: vs.length - aj.length,
        A: aj.length,
        total: vs.length,
        pct: vs.length ? aj.length / vs.length : 0,
        propuestas: aj.map((v) => ({
          nombre: nombreDe.get(v.pid) ?? "Sin nombre registrado",
          equipo: v.equipo,
          ajuste: v.aj,
          justificacion: v.ju,
        })),
      };
    });
  }

  // --- Acuerdos de equipo ----------------------------------------------------------------
  const tipos = TIPOS_COMPONENTE;
  const ajustes = acuerdos.flatMap((a) => a.ajustes.map((x) => ({ ...x, equipo: a.equipo })));
  const matrizAjustes = datos.transformaciones.map((t) => ({
    t: t.id,
    nombre: t.nombre,
    porTipo: tipos.map((tp) => ajustes.filter((a) => a.t === t.id && a.tipo === tp).length),
    total: ajustes.filter((a) => a.t === t.id).length,
  }));

  // --- Percepción sobre transformación digital -----------------------------------------
  const catProceso = contarPorCatalogo(datos.catalogos.categoriasProceso, percepcion, (p, id) => p.cat === id);
  const dificultades = contarPorCatalogo(datos.catalogos.dificultades, percepcion, (p, id) => p.difs.includes(id));

  // --- Consolidación del MEDIT ---------------------------------------------------------
  const temas = contarPorCatalogo(datos.catalogos.temasMedit, consolidacion, (c, id) => c.temas.includes(id));

  // --- Participación ---------------------------------------------------------------------
  const conteoRoles = new Map<string, number>();
  for (const p of participantes) conteoRoles.set(p.rol, (conteoRoles.get(p.rol) ?? 0) + 1);
  const roles: ConteoCategoria[] = [...conteoRoles.entries()]
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((a, b) => (a.label === "Sin dato" ? 1 : b.label === "Sin dato" ? -1 : b.value - a.value));

  const sedes: ConteoCategoria[] = datos.catalogos.sedes
    .map((s) => ({ id: s.nombre, label: s.nombre, sub: s.tipo, value: participantes.filter((p) => p.sede === s.nombre).length }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);
  const sinSede = participantes.filter((p) => !p.sede).length;

  const formularios = datos.meta.formularios.map((f: FormularioMomento5) => {
    let value = 0;
    if (f.id === "validacion") value = participantes.filter((p) => p.formularios.validacion).length;
    if (f.id === "percepcion") value = percepcion.length;
    if (f.id === "consolidacion") value = consolidacion.length;
    if (f.id === "acuerdos") value = acuerdos.length;
    if (f.id === "matriz") value = matriz.length;
    return { ...f, value };
  });

  const totalV = validacion.length;
  const totalA = validacion.filter((v) => v.e === "A").length;

  return {
    eq,
    equipoInfo,
    participantes,
    validacion,
    acuerdos,
    percepcion,
    consolidacion,
    matriz,
    porT,
    porTipoComp,
    porComp,
    tipos,
    ajustes,
    matrizAjustes,
    catProceso,
    dificultades,
    temas,
    roles,
    sedes,
    sinSede,
    formularios,
    kpi: {
      participantes: participantes.length,
      equipos: eq === null ? datos.equipos.length : 1,
      valoraciones: totalV,
      pctValida: totalV ? (totalV - totalA) / totalV : 0,
      ajustesIndividuales: totalA,
      ajustesEquipo: ajustes.length,
      procesos: percepcion.length,
      procesosIA: percepcion.filter((p) => p.ia).length,
      procesosAuto: percepcion.filter((p) => p.auto || p.ia).length,
      consolidacion: consolidacion.length,
    },
  };
}

export type DerivadosMomento5 = ReturnType<typeof derivarMomento5>;
export type FormularioConValor = DerivadosMomento5["formularios"][number];

/**
 * Lo que el relato cuenta en cada capítulo, sacado de las mismas cifras: el
 * componente y el tipo de componente con más ajustes, lo más citado en
 * transformación digital y en el MEDIT. Con un filtro de equipo puede faltar
 * cualquiera de ellos (null), y el relato lo dice en vez de inventar.
 */
export function destacadosMomento5(d: DerivadosMomento5) {
  const valorados = Object.values(d.porComp)
    .flat()
    .filter((c) => c.total > 0);
  // El primero con el % más alto, en el orden del plan: el mismo criterio del mapa de componentes.
  const componenteMasAjustado = valorados.reduce<ComponenteValorado | null>((m, c) => (!m || c.pct > m.pct ? c : m), null);
  const tipos = d.porTipoComp.filter((t) => t.total > 0).map((t) => ({ ...t, pct: t.A / t.total }));
  const tipoMasCorregido = tipos.reduce<(typeof tipos)[number] | null>((m, t) => (!m || t.pct > m.pct ? t : m), null);
  return {
    componenteMasAjustado,
    tipoMasCorregido,
    transformacionMasCorregida: d.porT
      .filter((t) => t.total > 0)
      .reduce<(typeof d.porT)[number] | null>((m, t) => (!m || t.A / t.total > m.A / m.total ? t : m), null),
    categoriaPrincipal: d.catProceso.find((c) => c.value > 0) ?? null,
    dificultadPrincipal: d.dificultades.find((c) => c.value > 0) ?? null,
    temasPrincipales: d.temas.filter((t) => t.value > 0).slice(0, 3),
    rolPrincipal: d.roles.find((r) => r.label !== "Sin dato") ?? null,
    validanDemas: d.acuerdos.filter(validaDemasComponentes).length,
    conDesacuerdo: d.acuerdos.filter((a) => a.desacuerdos),
  };
}

export type DestacadosMomento5 = ReturnType<typeof destacadosMomento5>;

/**
 * Citas para un tema del MEDIT: respuestas que lo tocan, con un aspecto que se
 * lee de un vistazo (ni una palabra suelta ni un párrafo). Se toman en el orden
 * del archivo para que la selección no cambie entre visitas; si ninguna tiene
 * ese largo, se usa cualquiera que tenga texto.
 */
export function citasDeTema(consolidacion: DerivadosMomento5["consolidacion"], tema: string, cuantas = 2) {
  const delTema = consolidacion.filter((c) => c.temas.includes(tema) && c.aspecto);
  const legibles = delTema.filter((c) => (c.aspecto ?? "").length >= 40 && (c.aspecto ?? "").length <= 220);
  return (legibles.length ? legibles : delTema).slice(0, cuantas);
}

export interface ConformacionEquipo {
  equipo: number;
  /** Nombres de las dos transformaciones asignadas, en el orden del plan. */
  transformaciones: string[];
  integrantes: { pid: string; nombre: string; cargo: string | null }[];
}

/**
 * Quiénes formaron cada equipo: el «Equipo asignado:» de la validación
 * estratégica, ya consolidado en `equipos`. Los integrantes van por orden
 * alfabético; un pid sin participante no se inventa, se omite.
 */
export function conformacionEquipos(datos: ResultadosMomento5): ConformacionEquipo[] {
  const porPid = new Map(datos.participantes.map((p) => [p.pid, p]));
  const ordenT = new Map(datos.transformaciones.map((t, i) => [t.id, i]));
  const nombreT = new Map(datos.transformaciones.map((t) => [t.id, t.nombre]));
  return [...datos.equipos]
    .sort((a, b) => a.equipo - b.equipo)
    .map((e) => ({
      equipo: e.equipo,
      transformaciones: [...e.transformaciones]
        .sort((a, b) => (ordenT.get(a) ?? 99) - (ordenT.get(b) ?? 99))
        .map((t) => nombreT.get(t) ?? t),
      integrantes: e.integrantes
        .flatMap((pid) => {
          const p = porPid.get(pid);
          return p ? [{ pid, nombre: p.nombre, cargo: p.cargo }] : [];
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }));
}

const palabras = (texto: string) =>
  new Set(
    texto
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      // Sin «de», «del», «la»…: solo palabras que distinguen un formulario de otro.
      .filter((p) => p.length > 3)
  );

/**
 * Nombre exacto del formulario al que se refiere una nota de depuración: las
 * exclusiones del análisis los abrevian («Validación estratégica», «Matriz de
 * Construcción Colaborativa del MEDIT»). Se elige el formulario que comparte
 * más palabras; sin ninguna en común, queda el texto original.
 */
export function nombreFormularioDe(texto: string, formularios: FormularioMomento5[]): string {
  const buscadas = palabras(texto);
  let mejor: { nombre: string; comunes: number } | null = null;
  for (const f of formularios) {
    const comunes = [...palabras(f.nombre)].filter((p) => buscadas.has(p)).length;
    if (comunes > 0 && (!mejor || comunes > mejor.comunes)) mejor = { nombre: f.nombre, comunes };
  }
  return mejor?.nombre ?? texto;
}
