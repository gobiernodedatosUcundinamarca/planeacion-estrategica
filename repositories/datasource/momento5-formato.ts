import type {
  AcuerdoEquipo,
  AjusteEquipo,
  CatalogoMomento5,
  ComponentePlan,
  ConsolidacionMedit,
  EquipoMomento5,
  ExclusionMomento5,
  FormularioMomento5,
  MatrizEquipo,
  ParticipanteMomento5,
  PercepcionDigital,
  ResultadosMomento5,
  TransformacionPlan,
  ValoracionComponente,
} from "@/types/momento5";

/**
 * Traducción de `resultados.json` (Momento 5) a datos tipados. Vive aparte del
 * origen de datos, como `momento4-formato.ts`, porque interpretar el archivo no
 * depende de dónde se guarde, y así las pruebas lo ejercitan sin `server-only`.
 *
 * El JSON ya llega depurado por el proyecto de análisis; esta capa no recalcula
 * ni recodifica nada. Solo impide que un campo nulo, vacío, de relleno («N/A»,
 * «No aplica»…) o ausente llegue a la vista como `undefined`, `NaN` o texto
 * basura. Con el archivo actual no cambia ninguna cifra.
 */

type Registro = Record<string, unknown>;

/** Valores de relleno que los formularios usan para "sin respuesta". */
const RELLENO = new Set(["", "n/a", "na", "n.a.", "no aplica", ".", "-", "–", "—"]);

function objeto(valor: unknown): Registro {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? (valor as Registro) : {};
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

/** Texto con contenido, o null si falta, está vacío o es relleno. */
export function textoOpcional(valor: unknown): string | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return RELLENO.has(limpio.toLowerCase()) ? null : limpio;
}

function texto(valor: unknown, siFalta: string): string {
  return textoOpcional(valor) ?? siFalta;
}

/** Entero (también si llega como texto, «3»), o null. */
function entero(valor: unknown): number | null {
  const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
  return typeof n === "number" && Number.isInteger(n) ? n : null;
}

function conteo(valor: unknown): number {
  const n = entero(valor);
  return n !== null && n >= 0 ? n : 0;
}

function textos(valor: unknown): string[] {
  return lista(valor)
    .map(textoOpcional)
    .filter((t): t is string => t !== null);
}

const verdadero = (valor: unknown) => valor === true;

function catalogo(valor: unknown): CatalogoMomento5[] {
  return lista(valor).flatMap((v) => {
    const o = objeto(v);
    const id = textoOpcional(o.id);
    return id ? [{ id, nombre: texto(o.nombre, id) }] : [];
  });
}

function componente(valor: unknown): ComponentePlan[] {
  const o = objeto(valor);
  const code = textoOpcional(o.code);
  if (!code) return [];
  return [
    {
      code,
      tipo: texto(o.tipo, ""),
      titulo: texto(o.titulo, code),
      texto: textoOpcional(o.texto),
      truncado: verdadero(o.truncado),
    },
  ];
}

function transformacion(valor: unknown): TransformacionPlan[] {
  const o = objeto(valor);
  const id = textoOpcional(o.id);
  if (!id) return [];
  return [{ id, nombre: texto(o.nombre, id), numero_plan: entero(o.numero_plan), componentes: lista(o.componentes).flatMap(componente) }];
}

function formulario(valor: unknown): FormularioMomento5[] {
  const o = objeto(valor);
  const id = textoOpcional(o.id);
  if (!id) return [];
  return [
    {
      id,
      nombre: texto(o.nombre, id),
      tipo: o.tipo === "Grupal" ? "Grupal" : "Individual",
      fecha: texto(o.fecha, ""),
      respuestas_originales: conteo(o.respuestas_originales),
      respuestas_validas: conteo(o.respuestas_validas),
    },
  ];
}

function exclusion(valor: unknown): ExclusionMomento5 {
  const o = objeto(valor);
  return { formulario: texto(o.formulario, ""), id_respuesta: entero(o.id_respuesta), motivo: texto(o.motivo, "") };
}

/** Identificador estable para un registro sin `pid`: el origen no lo trae vacío, pero la vista lo usa como clave. */
const pidDe = (o: Registro, i: number, prefijo: string) => texto(o.pid, `${prefijo}-sin-identificador-${i + 1}`);

function participante(valor: unknown, i: number): ParticipanteMomento5 {
  const o = objeto(valor);
  const f = objeto(o.formularios);
  return {
    pid: pidDe(o, i, "participante"),
    nombre: texto(o.nombre, "Sin nombre registrado"),
    cargo: textoOpcional(o.cargo),
    // «Sin dato» es la misma categoría que el análisis asigna cuando el cargo no permite clasificar.
    rol: texto(o.rol, "Sin dato"),
    equipo: entero(o.equipo),
    sede: textoOpcional(o.sede),
    sedeTipo: textoOpcional(o.sedeTipo),
    formularios: {
      validacion: verdadero(f.validacion),
      percepcion: verdadero(f.percepcion),
      consolidacion: verdadero(f.consolidacion),
      acuerdos_registro: verdadero(f.acuerdos_registro),
      matriz_registro: verdadero(f.matriz_registro),
    },
  };
}

/** Una valoración sin transformación conocida o sin estado V/A no se puede ubicar: se descarta. */
function valoracion(valor: unknown, transformaciones: Set<string>): ValoracionComponente[] {
  const o = objeto(valor);
  const t = textoOpcional(o.t);
  const c = textoOpcional(o.c);
  const e = textoOpcional(o.e)?.toUpperCase();
  if (!t || !c || !transformaciones.has(t) || (e !== "V" && e !== "A")) return [];
  const aj = textoOpcional(o.aj);
  const ju = textoOpcional(o.ju);
  return [
    {
      pid: texto(o.pid, ""),
      equipo: entero(o.equipo),
      t,
      c,
      e,
      ...(aj ? { aj } : {}),
      ...(ju ? { ju } : {}),
    },
  ];
}

function ajuste(valor: unknown, i: number): AjusteEquipo {
  const o = objeto(valor);
  return {
    n: entero(o.n) ?? i + 1,
    t: texto(o.t, ""),
    c: texto(o.c, ""),
    tipo: texto(o.tipo, ""),
    ajuste: texto(o.ajuste, ""),
    justificacion: textoOpcional(o.justificacion),
    nota: textoOpcional(o.nota),
  };
}

/** Los registros grupales sin número de equipo no se pueden atribuir: se descartan. */
function acuerdo(valor: unknown): AcuerdoEquipo[] {
  const o = objeto(valor);
  const equipo = entero(o.equipo);
  if (equipo === null) return [];
  return [
    {
      equipo,
      relator: textoOpcional(o.relator),
      integrantes: textoOpcional(o.integrantes),
      transformaciones: textos(o.transformaciones),
      validaDemas: textoOpcional(o.validaDemas),
      desacuerdos: textoOpcional(o.desacuerdos),
      ajustes: lista(o.ajustes).map(ajuste),
    },
  ];
}

function percepcion(valor: unknown, i: number): PercepcionDigital {
  const o = objeto(valor);
  return {
    pid: pidDe(o, i, "percepcion"),
    equipo: entero(o.equipo),
    nombre: texto(o.nombre, "Sin nombre registrado"),
    dependencia: textoOpcional(o.dependencia),
    proceso: textoOpcional(o.proceso),
    consiste: textoOpcional(o.consiste),
    dificultad: textoOpcional(o.dificultad),
    afectacion: textoOpcional(o.afectacion),
    cat: texto(o.cat, ""),
    difs: textos(o.difs),
    ia: verdadero(o.ia),
    auto: verdadero(o.auto),
  };
}

function consolidacion(valor: unknown, i: number): ConsolidacionMedit {
  const o = objeto(valor);
  return {
    pid: pidDe(o, i, "consolidacion"),
    equipo: entero(o.equipo),
    nombre: texto(o.nombre, "Sin nombre registrado"),
    rol: textoOpcional(o.rol),
    facultad: textoOpcional(o.facultad),
    sede: textoOpcional(o.sede),
    sedeTipo: textoOpcional(o.sedeTipo),
    aspecto: textoOpcional(o.aspecto),
    cambio: textoOpcional(o.cambio),
    temas: textos(o.temas),
  };
}

function matriz(valor: unknown): MatrizEquipo[] {
  const o = objeto(valor);
  const equipo = entero(o.equipo);
  if (equipo === null) return [];
  return [
    {
      equipo,
      integrantes: textoOpcional(o.integrantes),
      aspectos: textos(o.aspectos),
      cambios: textos(o.cambios),
      indicadores: textos(o.indicadores),
      temas: textos(o.temas),
    },
  ];
}

function equipo(valor: unknown): EquipoMomento5[] {
  const o = objeto(valor);
  const n = entero(o.equipo);
  return n === null ? [] : [{ equipo: n, transformaciones: textos(o.transformaciones), integrantes: textos(o.integrantes) }];
}

/** Interpreta el contenido de `resultados.json`. Falla solo si la raíz no es un objeto. */
export function normalizarResultadosMomento5(raw: unknown): ResultadosMomento5 {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("El archivo de resultados del Momento 5 no tiene el formato esperado.");
  }
  const o = raw as Registro;
  const meta = objeto(o.meta);
  const catalogos = objeto(o.catalogos);
  const transformaciones = lista(o.transformaciones).flatMap(transformacion);
  const idsTransformacion = new Set(transformaciones.map((t) => t.id));

  return {
    meta: {
      titulo: texto(meta.titulo, ""),
      institucion: texto(meta.institucion, ""),
      fechas: textos(meta.fechas),
      generado: texto(meta.generado, ""),
      formularios: lista(meta.formularios).flatMap(formulario),
      exclusiones: lista(meta.exclusiones).map(exclusion),
    },
    transformaciones,
    equipos: lista(o.equipos).flatMap(equipo),
    participantes: lista(o.participantes).map(participante),
    validacion: lista(o.validacion).flatMap((v) => valoracion(v, idsTransformacion)),
    acuerdos: lista(o.acuerdos).flatMap(acuerdo),
    percepcion: lista(o.percepcion).map(percepcion),
    consolidacion: lista(o.consolidacion).map(consolidacion),
    matriz: lista(o.matriz).flatMap(matriz),
    catalogos: {
      categoriasProceso: catalogo(catalogos.categoriasProceso),
      dificultades: catalogo(catalogos.dificultades),
      temasMedit: catalogo(catalogos.temasMedit),
      sedes: lista(catalogos.sedes).flatMap((v) => {
        const s = objeto(v);
        const nombre = textoOpcional(s.nombre);
        return nombre ? [{ nombre, tipo: texto(s.tipo, "") }] : [];
      }),
    },
  };
}
