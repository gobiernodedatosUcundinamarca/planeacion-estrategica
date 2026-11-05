import "server-only";
import { createHash, createHmac } from "node:crypto";
import type { CeldaDescarga, HojaDescarga, RegistroDescargas, ResultadoDescarga } from "@/types/descargas";
import { NAVEGACION } from "@/constants/navegacion";
import { RUTA_POR_SECCION } from "@/constants/secciones";
import { ETIQUETA_ROL } from "@/constants/marca";
import { PREGUNTAS } from "@/constants/preguntas";
import { ZONA_HORARIA } from "@/constants/admin";
import {
  AVISO_ANONIMATO,
  BYTES_MAXIMOS_DESCARGA,
  DIAS_REGISTRO_DESCARGAS,
  LIMITE_DESCARGAS_GLOBAL,
  LIMITE_DESCARGAS_POR_VISITANTE,
  VENTANA_GLOBAL_MINUTOS,
  VENTANA_VISITANTE_MINUTOS,
  slugDeRuta,
} from "@/lib/reglas/descargas";
import { adscripcionesDe, etiquetaRol, unidadRegionalDe } from "@/lib/reglas/participacion";
import { AFIRMACIONES_VALORACION, etiquetaActor } from "@/lib/reglas/valoracion-territorio";
import { PREGUNTAS_IA, type CampoIa } from "@/lib/reglas/ia-administrativos";
import { separarOpciones } from "@/lib/reglas/formularios";
import type { PreguntaId, Rol } from "@/types/encuesta";
import { getDescargasDataSource } from "./datasource";
import { estaSeccionPublicada } from "./seccionesRepository";
import { getPersonasFiltradas, getRespuestasEncuesta, getRolesAsignadosEncuesta } from "./encuestaRepository";
import { getTablasMetas } from "./metasRepository";
import { getCaiData } from "./caiRepository";
import { getConferencias } from "./conferencistasRepository";
import { getValoracion } from "./valoracionesRepository";
import { getArchivosAnaliticaMomentos, getDetalleAnaliticaMomento } from "./analiticaMomentosRepository";
import { getAccesosCaiData } from "./accesosCaiRepository";
import { getRespuestasMomento4 } from "./momento4Repository";
import { getAportes } from "./aportesRepository";
import { getRegistrosParticipacion } from "./participacionRepository";
import { getVistaValoracionTerritorio } from "./valoracionTerritorioRepository";
import { getVistaIaAdministrativos } from "./iaAdministrativosRepository";

/**
 * Descargas en Excel de cada sección del menú: las respuestas de la sección,
 * anónimas, en una hoja con estilo (a veces dos, cuando la sección reúne dos
 * tipos de registro distintos, como conferencias y sus comentarios).
 *
 * Es público —cualquiera que vea una sección puede bajarla—, así que aquí se
 * aplican las tres protecciones que acotan el consumo:
 *  1. Límite por visitante y límite global (`lib/reglas/descargas.ts`),
 *     contados en Postgres para que valgan entre todas las instancias de
 *     Vercel, no solo en la que atiende.
 *  2. Copia en memoria del último archivo de cada sección, que se reutiliza
 *     mientras sus datos no cambien (se compara una huella de las filas, así
 *     que nunca se entrega un archivo desactualizado).
 *  3. Una sola generación a la vez por sección: si llegan diez peticiones
 *     juntas, las diez esperan la misma.
 * Y cada petición, entregada o rechazada, queda en el registro que audita
 * /admin.
 */

/** Las secciones que se pueden descargar: una por ítem del menú. */
type Constructor = () => Promise<HojaDescarga[]> | HojaDescarga[];

const formatoGenerado = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

// ---------------------------------------------------------------------------
// Utilidades para armar las filas
// ---------------------------------------------------------------------------

/** Solo la fecha de un valor ISO con hora ("2026-08-18T…" → "2026-08-18"). */
function soloFecha(valor: string | null | undefined): string | null {
  const iso = valor?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return iso ?? valor ?? null;
}

/** Opciones de selección múltiple separadas con "; " legible. */
function opciones(texto: string | null): string | null {
  const lista = separarOpciones(texto);
  return lista.length > 0 ? lista.join("; ") : null;
}

/**
 * Seudónimos estables ("Participante 001") para distinguir personas sin
 * identificarlas. El orden sale de un hash de la clave, no del correo: si
 * fuera alfabético, el número dejaría adivinar por dónde empieza el correo.
 */
function seudonimos(claves: string[]): Map<string, string> {
  const unicas = [...new Set(claves)];
  const huella = (k: string) => createHash("sha1").update(k).digest("hex");
  unicas.sort((a, b) => huella(a).localeCompare(huella(b)));
  const digitos = Math.max(3, String(unicas.length).length);
  return new Map(unicas.map((k, i) => [k, `Participante ${String(i + 1).padStart(digitos, "0")}`]));
}

function clavePersona(p: { correo?: string | null; nombre?: string | null }): string {
  return (p.correo || p.nombre || "").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Diagnóstico: Tu Voz Fundamental (las cuatro páginas comparten encuesta)
// ---------------------------------------------------------------------------

function filasEncuesta(preguntas: PreguntaId[]): { filas: CeldaDescarga[][]; columnasFecha: number[] } {
  const rolesDe = new Map<number, string[]>();
  for (const r of getRolesAsignadosEncuesta()) {
    rolesDe.set(r.personaId, [...(rolesDe.get(r.personaId) ?? []), ETIQUETA_ROL[r.rol as Rol] ?? r.rol]);
  }
  const respuestasDe = new Map<string, string[]>();
  for (const r of getRespuestasEncuesta()) {
    const clave = `${r.personaId}|${r.preguntaId}`;
    respuestasDe.set(clave, [...(respuestasDe.get(clave) ?? []), r.esOtro ? `Otro: ${r.opcion}` : r.opcion]);
  }
  const textoPregunta = (id: PreguntaId) => `${id}. ${PREGUNTAS.find((p) => p.id === id)?.texto ?? id}`;

  return {
    columnasFecha: [1],
    filas: [
      [
        "ID",
        "Fecha",
        "Tipo de participante",
        "Rol principal",
        "Todos sus roles",
        "Sede",
        "Facultad",
        "Programa o área",
        ...preguntas.map(textoPregunta),
      ],
      ...getPersonasFiltradas().map((p) => [
        p.id,
        soloFecha(p.fechaInicio),
        p.tipoParticipante,
        ETIQUETA_ROL[p.rolPrincipal] ?? p.rolPrincipal,
        [...new Set(rolesDe.get(p.id) ?? [])].join("; ") || null,
        p.sede,
        p.facultad,
        p.programaOArea,
        ...preguntas.map((id) => (respuestasDe.get(`${p.id}|${id}`) ?? []).join("; ") || null),
      ]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Constructores por sección
// ---------------------------------------------------------------------------

const CONSTRUCTORES: Record<string, Constructor> = {
  encuesta: () => [{ nombre: "Respuestas", titulo: "", ...filasEncuesta(["P1", "P2", "P3", "P4"]) }],

  "encuesta-participacion": () => [{ nombre: "Participantes", titulo: "", ...filasEncuesta([]) }],

  "encuesta-fundamentos-planeacion": () => [{ nombre: "Respuestas", titulo: "", ...filasEncuesta(["P1", "P2"]) }],

  "encuesta-vision-estrategica": () => [{ nombre: "Respuestas", titulo: "", ...filasEncuesta(["P3", "P4"]) }],

  metas: () => [
    {
      nombre: "Metas",
      titulo: "",
      filas: [
        ["Tabla", "Grupo", "Sí", "No", "Total", "% de cumplimiento"],
        ...getTablasMetas().flatMap((t) =>
          t.filas.map((f) => [
            t.subtitulo ? `${t.titulo} — ${t.subtitulo}` : t.titulo,
            f.etiqueta,
            f.si,
            f.no,
            f.total,
            Math.round(f.porcentaje * 10) / 10,
          ])
        ),
      ],
    },
  ],

  seguimiento: () => {
    const actividades = getCaiData().actividades;
    const nombres = seudonimos(actividades.flatMap((a) => a.participantes.map(clavePersona)));
    const filas = actividades.flatMap((a) =>
      a.participantes.map((p) => [nombres.get(clavePersona(p)) ?? "Participante", a.etiquetaMomento, a.tituloCompleto, p.estado])
    );
    filas.sort((x, y) => String(x[0]).localeCompare(String(y[0])));
    return [
      {
        nombre: "Avance por participante",
        titulo: "",
        filas: [["Participante", "Momento", "Actividad", "Estado"], ...filas],
      },
    ];
  },

  conferencistas: () => {
    const conferencias = getConferencias().map((c) => ({ ...c, valoracion: getValoracion(c.slug) }));
    return [
      {
        nombre: "Conferencias",
        titulo: "",
        columnasFecha: [0],
        filas: [
          [
            "Fecha",
            "Jornada",
            "Conferencista",
            "Título",
            "Modalidad",
            "Ubicación",
            "Asistentes presenciales",
            "Vistas en redes sociales",
            "Respuestas de valoración",
            "Promedio (1 a 5)",
            "5 estrellas",
            "4 estrellas",
            "3 estrellas",
            "2 estrellas",
            "1 estrella",
          ],
          ...conferencias.map((c) => [
            c.fecha,
            c.jornada,
            c.nombre,
            c.titulo,
            c.modalidad,
            c.ubicacion,
            c.asistentesPresenciales,
            c.vistasRedesSociales,
            c.valoracion?.totalRespuestas ?? null,
            c.valoracion ? Math.round(c.valoracion.promedio * 100) / 100 : null,
            ...([5, 4, 3, 2, 1] as const).map((n) => c.valoracion?.distribucion[n] ?? null),
          ]),
        ],
      },
      {
        nombre: "Comentarios",
        titulo: "",
        // El autor del comentario no sale: el texto es la respuesta.
        filas: [
          ["Conferencista", "Título", "Comentario"],
          ...conferencias.flatMap((c) => (c.valoracion?.comentarios ?? []).map((m) => [c.nombre, c.titulo, m.texto])),
        ],
      },
    ];
  },

  "analitica-momentos": () => {
    const detalles = getArchivosAnaliticaMomentos().flatMap((a) => {
      const d = getDetalleAnaliticaMomento(a.archivo);
      return d ? [d] : [];
    });
    const hojas: HojaDescarga[] = [
      {
        nombre: "Valoraciones",
        titulo: "",
        filas: [
          ["Actividad", "Pregunta", "Opción", "Valor", "Respuestas", "%"],
          ...detalles.flatMap((d) =>
            d.preguntasValoracion.flatMap((p) =>
              p.distribucion.map((o) => [d.titulo, p.pregunta, o.valor, o.valorNumerico, o.cantidad, Math.round(o.porcentaje * 10) / 10])
            )
          ),
        ],
      },
      {
        nombre: "Respuestas abiertas",
        titulo: "",
        filas: [
          ["Actividad", "Pregunta", "Respuesta"],
          ...detalles.flatMap((d) => d.preguntasAbiertas.flatMap((p) => p.respuestas.map((r) => [d.titulo, p.pregunta, r]))),
        ],
      },
      {
        nombre: "Foro",
        titulo: "",
        columnasFecha: [1],
        // Sin el autor de cada publicación: sede, facultad y fecha bastan para el contexto.
        filas: [
          ["Actividad", "Fecha", "Sede", "Facultad", "Tipo", "Publicación"],
          ...detalles.flatMap((d) =>
            d.publicacionesForo.map((p) => [
              d.titulo,
              soloFecha(p.fecha),
              p.sede,
              p.facultad,
              p.esPublicacionOriginal ? "Publicación" : "Respuesta",
              p.texto,
            ])
          ),
        ],
      },
    ];
    return hojas.filter((h) => h.filas.length > 1);
  },

  "accesos-cai": () => {
    const cortes = getAccesosCaiData().cortes;
    const nombres = seudonimos(cortes.flatMap((c) => c.personas.map(clavePersona)));
    return [
      {
        nombre: "Accesos",
        titulo: "",
        columnasFecha: [0],
        filas: [
          ["Corte", "Participante", "Días con acceso"],
          ...cortes.flatMap((c) => c.personas.map((p) => [soloFecha(c.fecha), nombres.get(clavePersona(p)) ?? "Participante", p.dias])),
        ],
      },
    ];
  },

  transformaciones: async () => {
    const [respuestas, aportes] = await Promise.all([getRespuestasMomento4(), getAportes()]);
    return [
      {
        nombre: "Respuestas",
        titulo: "",
        columnasFecha: [0],
        // Sin correo ni nombre, aunque el export de Forms los traiga.
        filas: [
          [
            "Fecha",
            "Transformación",
            "Tipo de actor",
            "Unidad regional",
            "Programa del graduado",
            "¿Responde a lo que la UCundinamarca necesita?",
            "¿Qué ajustaría?",
          ],
          ...respuestas.map((r) => [
            r.fechaInicio,
            r.etiqueta,
            r.tipoActor,
            r.unidadRegional,
            r.programaGraduado,
            r.respondeNecesidad,
            r.ajustes,
          ]),
        ],
      },
      {
        nombre: "Aportes generales",
        titulo: "",
        columnasFecha: [0],
        filas: [
          ["Fecha", "Tipo de actor", "Unidad regional", "Aporte"],
          ...aportes.map((a) => [a.fechaInicio, a.tipoActor, a.unidadRegional, a.aporte]),
        ],
      },
    ];
  },

  "transformaciones-participacion": async () => [
    {
      nombre: "Asistencia",
      titulo: "",
      columnasFecha: [0],
      // Sin nombre, código de estudiante ni documento: la unidad y la
      // dependencia salen ya estandarizadas, como en el dashboard.
      filas: [
        [
          "Fecha",
          "Lugar de desarrollo",
          "Rol",
          "Edad",
          "Unidad regional",
          "Dependencia",
          "Programa estudiante",
          "Coordinación docente",
          "Facultad docente",
          "Área trabajador",
        ],
        ...(await getRegistrosParticipacion()).map((r) => [
          r.fechaInicio,
          r.lugarDesarrollo,
          etiquetaRol(r.rol),
          r.edad,
          unidadRegionalDe(r),
          adscripcionesDe(r).join(" / "),
          r.programaEstudiante,
          r.coordinacionDocente,
          r.facultadDocente,
          r.areaTrabajador,
        ]),
      ],
    },
  ],

  "valoracion-territorio": async () => [
    {
      nombre: "Respuestas",
      titulo: "",
      columnasFecha: [0],
      filas: [
        ["Fecha", "Unidad regional (jornada)", "Tipo de actor", ...AFIRMACIONES_VALORACION.map((a) => a.texto), "¿Qué podríamos mejorar?"],
        ...(await getVistaValoracionTerritorio()).respuestas.map((r) => [
          r.fechaRespuesta,
          r.unidadRegional,
          etiquetaActor(r.tipoActor),
          ...AFIRMACIONES_VALORACION.map((a) => r[a.campo]),
          r.mejora,
        ]),
      ],
    },
  ],

  "ia-administrativos": async () => {
    const campos = Object.keys(PREGUNTAS_IA) as CampoIa[];
    return [
      {
        nombre: "Respuestas",
        titulo: "",
        columnasFecha: [0],
        filas: [
          ["Fecha", "Unidad regional (jornada)", ...campos.map((c) => PREGUNTAS_IA[c].texto)],
          ...(await getVistaIaAdministrativos()).respuestas.map((r) => [
            r.fechaRespuesta,
            r.unidadRegional,
            ...campos.map((c) => opciones(r[c])),
          ]),
        ],
      },
    ];
  },
};

/**
 * Las tablas de Neon de las que sale cada sección que no lee un Excel. Con
 * ellas se calcula una huella en la base (`huellaTablas`) para saber si el
 * archivo guardado sigue vigente SIN traer las filas: traer las ~3.800
 * respuestas de Transformaciones llegó a tardar 16 s, y la huella, menos de
 * uno. Valoración e IA dependen además de Participación, porque su unidad
 * regional sale de las fechas de las jornadas.
 */
const TABLAS_POR_SECCION: Record<string, readonly string[]> = {
  transformaciones: ["momento4_respuestas", "aportes_respuestas"],
  "transformaciones-participacion": ["participacion_registros"],
  "valoracion-territorio": ["valoracion_territorio_respuestas", "participacion_registros"],
  "ia-administrativos": ["ia_administrativos_respuestas", "participacion_registros"],
};

/**
 * Cualquier correo escrito dentro de una respuesta abierta se tapa: las
 * descargas son públicas, y aunque ninguna lleva columna de correo, alguien
 * puede haber escrito uno en un texto libre (pasó en la encuesta de IA).
 */
const CORREO = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

function sinCorreos(hojas: HojaDescarga[]): HojaDescarga[] {
  return hojas.map((h) => ({
    ...h,
    filas: h.filas.map((fila) =>
      fila.map((celda) => (typeof celda === "string" ? celda.replace(CORREO, "[correo omitido]") : celda))
    ),
  }));
}

/** El nombre de cada sección, tal como aparece en el menú. */
function tituloDe(slug: string): string {
  return NAVEGACION.find((item) => slugDeRuta(item.href) === slug)?.etiqueta ?? slug;
}

/** Si existe la descarga de esa sección (las que no, ni siquiera se registran con su nombre). */
export function existeDescarga(slug: string): boolean {
  return Object.hasOwn(CONSTRUCTORES, slug);
}

// ---------------------------------------------------------------------------
// Generación con límites, caché y registro
// ---------------------------------------------------------------------------

export type Descarga =
  | { ok: true; contenido: Buffer; archivo: string }
  | { ok: false; estado: number; motivo: string; reintentarEnSegundos?: number };

const copias = new Map<string, { huella: string; contenido: Buffer }>();
const enCurso = new Map<string, Promise<Buffer>>();

/**
 * HMAC de la IP: el mismo visitante da siempre el mismo valor, pero no se puede
 * volver a la dirección. La clave es `ADMIN_PIN` para no exigir otra variable
 * de entorno en Vercel; rotar el PIN solo reinicia los conteos por visitante.
 */
function huellaVisitante(ip: string): string {
  return createHmac("sha256", process.env.ADMIN_PIN || "descargas-planeacion").update(ip).digest("hex").slice(0, 32);
}

/** Fecha en Colombia para el nombre del archivo ("2026-11-05"). */
function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
}

export async function generarDescarga(slug: string, ip: string): Promise<Descarga> {
  const inicio = performance.now();
  const ipHash = huellaVisitante(ip);
  const datos = getDescargasDataSource();

  const registrar = (resultado: ResultadoDescarga, extra: { bytes?: number; desdeCache?: boolean } = {}) =>
    datos
      .registrar({
        // Un nombre que no existe no se guarda tal cual: lo escribe quien pide,
        // y el registro no debe llenarse de texto arbitrario.
        seccion: existeDescarga(slug) ? slug : "(no existe)",
        ipHash,
        resultado,
        bytes: extra.bytes ?? null,
        milisegundos: Math.round(performance.now() - inicio),
        desdeCache: extra.desdeCache ?? false,
      })
      .catch((error) => console.error("No se pudo registrar la descarga:", error));

  if (!existeDescarga(slug)) {
    await registrar("no_existe");
    return { ok: false, estado: 404, motivo: "Esa sección no existe." };
  }

  if (slug in RUTA_POR_SECCION && !(await estaSeccionPublicada(slug))) {
    await registrar("no_publicada");
    return { ok: false, estado: 404, motivo: "Esta sección no está disponible por ahora." };
  }

  // Si no se pueden contar las descargas, no se entrega: sin el conteo no hay
  // límite, y el límite es lo que protege los recursos.
  let recientes: { visitante: number; global: number };
  try {
    recientes = await datos.contarRecientes(ipHash, VENTANA_VISITANTE_MINUTOS, VENTANA_GLOBAL_MINUTOS);
  } catch (error) {
    console.error("No se pudo consultar el registro de descargas:", error);
    return { ok: false, estado: 503, motivo: "Las descargas no están disponibles en este momento. Inténtalo más tarde." };
  }

  if (recientes.visitante >= LIMITE_DESCARGAS_POR_VISITANTE) {
    await registrar("limite_ip");
    return {
      ok: false,
      estado: 429,
      motivo: `Llegaste al límite de ${LIMITE_DESCARGAS_POR_VISITANTE} descargas cada ${VENTANA_VISITANTE_MINUTOS} minutos. Inténtalo de nuevo en unos minutos.`,
      reintentarEnSegundos: VENTANA_VISITANTE_MINUTOS * 60,
    };
  }
  if (recientes.global >= LIMITE_DESCARGAS_GLOBAL) {
    await registrar("limite_global");
    return {
      ok: false,
      estado: 429,
      motivo: "El sitio alcanzó el máximo de descargas de esta hora. Inténtalo de nuevo más tarde.",
      reintentarEnSegundos: VENTANA_GLOBAL_MINUTOS * 60,
    };
  }

  try {
    // La huella dice si el archivo guardado sigue valiendo. En las secciones
    // de Neon se calcula en la base sin traer las filas; en las de Excel, que
    // ya están en memoria, sale de las filas mismas. Nunca de las notas, que
    // llevan la fecha.
    const tablas = TABLAS_POR_SECCION[slug];
    let hojas: HojaDescarga[] | null = null;
    let huella: string;
    if (tablas) {
      huella = await datos.huellaTablas(tablas);
    } else {
      hojas = await CONSTRUCTORES[slug]();
      huella = createHash("sha1").update(JSON.stringify(hojas.map((h) => [h.nombre, h.filas]))).digest("hex");
    }
    const copia = copias.get(slug);
    let desdeCache = copia?.huella === huella;

    let contenido: Buffer;
    if (copia && desdeCache) {
      contenido = copia.contenido;
    } else {
      const clave = `${slug}|${huella}`;
      let pendiente = enCurso.get(clave);
      // Si ya hay una generación en marcha, esta petición la espera y no
      // genera nada: en el registro cuenta como copia, no como otra generación.
      if (pendiente) desdeCache = true;
      if (!pendiente) {
        pendiente = generarArchivo(slug, hojas).finally(() => enCurso.delete(clave));
        enCurso.set(clave, pendiente);
      }
      contenido = await pendiente;
      copias.set(slug, { huella, contenido });
    }

    if (contenido.byteLength > BYTES_MAXIMOS_DESCARGA) {
      await registrar("error", { bytes: contenido.byteLength });
      return { ok: false, estado: 413, motivo: "El archivo de esta sección es demasiado grande para descargarlo desde el sitio." };
    }

    await registrar("entregada", { bytes: contenido.byteLength, desdeCache });
    return { ok: true, contenido, archivo: `${slug}-${hoy()}.xlsx` };
  } catch (error) {
    console.error(`No se pudo generar la descarga de ${slug}:`, error);
    await registrar("error");
    return { ok: false, estado: 500, motivo: "No se pudo generar el archivo. Inténtalo de nuevo más tarde." };
  }
}

/**
 * Arma el Excel de una sección: sus hojas (si no llegaron ya construidas), sin
 * correos, con título y notas.
 */
async function generarArchivo(slug: string, construidas: HojaDescarga[] | null): Promise<Buffer> {
  const hojas = sinCorreos(construidas ?? (await CONSTRUCTORES[slug]()));
  const titulo = tituloDe(slug);
  const totalFilas = hojas.reduce((suma, h) => suma + h.filas.length - 1, 0);
  return getDescargasDataSource().escribirExcel(
    hojas.map((h) => ({
      ...h,
      titulo: hojas.length > 1 ? `${titulo} · ${h.nombre}` : titulo,
      notas: [
        `Universidad de Cundinamarca · Planeación Estratégica 2027-2037 · ${formatNumeroSimple(h.filas.length - 1)} registros${hojas.length > 1 ? ` (de ${formatNumeroSimple(totalFilas)} en el archivo)` : ""}.`,
        `Generado el ${formatoGenerado.format(new Date())} con los datos vigentes en ese momento.`,
        AVISO_ANONIMATO,
      ],
    }))
  );
}

function formatNumeroSimple(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

/** El registro para /admin: últimos `dias` días y los eventos más recientes. */
export function getRegistroDescargas(dias = 7): Promise<RegistroDescargas> {
  return getDescargasDataSource().getRegistro(dias, DIAS_REGISTRO_DESCARGAS);
}
