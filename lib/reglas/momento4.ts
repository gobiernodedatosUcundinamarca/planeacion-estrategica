/**
 * Formato exigido a los documentos del Momento 4. Vive en `lib/reglas/` porque
 * lo necesitan a la vez el servidor (que rechaza un archivo que no lo cumpla) y
 * la vista de administración (que muestra al usuario qué se espera antes de
 * subir). Si el criterio viviera en las dos capas por separado, un cambio de
 * formato podría aceptar archivos que la pantalla dice que no acepta.
 */

export const TITULO_MOMENTO4 =
  'Trabajo en territorio con la comunidad universitaria: Experiencia "Transformaciones que nos conectan" — Resultados de encuestas';

/**
 * Las 5 transformaciones, una por documento.
 *
 * A qué transformación pertenece un archivo NO se deduce de su contenido ni de
 * su nombre: lo elige quien lo sube, subiendo de a un documento en su casilla.
 * Las dos alternativas se descartaron contra los archivos reales:
 *  · la columna "Transformación" del Excel no es fiable (el documento de UC
 *    PARA LA VIDA trae "UC Inteligente" en sus filas y el de UC DIGITAL la trae
 *    vacía);
 *  · el nombre del archivo varía entre exports, así que tampoco identifica nada
 *    de forma estable.
 */
export const TRANSFORMACIONES_MOMENTO4 = [
  { id: "uc-inteligente", etiqueta: "UC INTELIGENTE" },
  { id: "uc-translocal", etiqueta: "UC TRANSLOCAL" },
  { id: "uc-digital", etiqueta: "UC DIGITAL" },
  { id: "uc-emprendedora-e-innovadora", etiqueta: "UC EMPRENDEDORA E INNOVADORA" },
  { id: "uc-para-la-vida", etiqueta: "UC PARA LA VIDA" },
] as const;

export type TransformacionMomento4 = (typeof TRANSFORMACIONES_MOMENTO4)[number]["id"];

/**
 * Las 26 columnas del export de Microsoft Forms, en orden. Se exige
 * coincidencia exacta: es lo que garantiza que un archivo subido hoy se pueda
 * leer con el mismo código que los que ya están en la carpeta.
 *
 * El formulario cambió después de los primeros exports y agregó la pregunta
 * "De que programa eres graduado" —con sus dos columnas de calificación—, que
 * solo responde quien se identifica como graduado. Por eso son 26 y no las 23
 * originales.
 */
export const COLUMNAS_MOMENTO4: readonly string[] = [
  "ID",
  "Hora de inicio",
  "Hora de finalización",
  "Correo electrónico",
  "Nombre",
  "Total de puntos",
  "Comentarios del cuestionario",
  "Hora de la última modificación",
  "Tipo de actor",
  "Puntos: Tipo de actor",
  "Comentarios: Tipo de actor",
  "De que programa eres graduado",
  "Puntos: De que programa eres graduado",
  "Comentarios: De que programa eres graduado",
  "Unidad Regional",
  "Puntos: Unidad Regional",
  "Comentarios: Unidad Regional",
  "Transformación",
  "Puntos: Transformación",
  "Comentarios: Transformación",
  "¿Consideran que esta transformación responde a lo que la UCundinamarca necesita del 2027 al 2037?",
  "Puntos: ¿Consideran que esta transformación responde a lo que la UCundinamarca necesita del 2027 al 2037?",
  "Comentarios: ¿Consideran que esta transformación responde a lo que la UCundinamarca necesita del 2027 al 2037?",
  "¿Qué ajustarían en esta transformación?",
  "Puntos: ¿Qué ajustarían en esta transformación?",
  "Comentarios: ¿Qué ajustarían en esta transformación?",
];

/**
 * Redacciones alternas admitidas para una misma columna, indexadas por la
 * columna canónica (la de `COLUMNAS_MOMENTO4`).
 *
 * El formulario se editó después de los primeros exports y la pregunta pasó de
 * "¿Qué ajustarían…?" a "¿Qué ajustaría…?" —singular en vez de plural—. Es la
 * misma pregunta y el mismo dato, así que rechazar el archivo por esa letra
 * sería tratar una corrección de redacción como un cambio de formato. Se
 * aceptan las dos y se guardan en la misma columna.
 *
 * Cualquier variante futura se agrega aquí, no en el código que valida.
 */
const VARIANTES_COLUMNA: Record<string, string[]> = {
  "¿Qué ajustarían en esta transformación?": ["¿Qué ajustaría en esta transformación?"],
  "Puntos: ¿Qué ajustarían en esta transformación?": [
    "Puntos: ¿Qué ajustaría en esta transformación?",
  ],
  "Comentarios: ¿Qué ajustarían en esta transformación?": [
    "Comentarios: ¿Qué ajustaría en esta transformación?",
  ],
};

/**
 * Normaliza para comparar nombres y encabezados: sin tildes, en mayúsculas y
 * con los espacios colapsados. Así un archivo renombrado a minúsculas, o un
 * encabezado con doble espacio, no se rechaza por una diferencia cosmética.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Índice variante normalizada → columna canónica normalizada. */
const CANONICA_POR_VARIANTE = new Map(
  Object.entries(VARIANTES_COLUMNA).flatMap(([canonica, variantes]) =>
    variantes.map((variante) => [normalizar(variante), normalizar(canonica)] as const)
  )
);

/**
 * Nombre canónico (normalizado) de un encabezado recibido. Si es una redacción
 * alterna conocida devuelve la columna a la que equivale; si no, el encabezado
 * normalizado tal cual. Es el único punto donde se resuelven las variantes:
 * validación y lectura pasan por aquí, así que no pueden discrepar.
 */
export function canonizarColumna(encabezado: string): string {
  const normalizado = normalizar(encabezado);
  return CANONICA_POR_VARIANTE.get(normalizado) ?? normalizado;
}

/**
 * Solo se guardan las respuestas de esta fecha en adelante. Las anteriores
 * quedan fuera aunque vengan en el archivo: los exports arrastran las
 * respuestas de prueba de la puesta en marcha del formulario, y sumarlas a las
 * reales distorsionaría cada cifra de la sección.
 *
 * El límite es "a partir del 18/08/2026, inclusive": las jornadas reales
 * empiezan ese día, y lo anterior —el 17 quedó una sola respuesta suelta— es
 * de la puesta en marcha. Si hiciera falta mover el corte —o dejar de
 * aplicarlo— se cambia solo esta línea.
 */
export const FECHA_MINIMA_RESPUESTA = new Date("2026-08-18T00:00:00");

/**
 * Convierte una fecha del export ("8/13/26 9:33:03") a Date. Devuelve null si
 * no se puede interpretar, para que quien la use decida qué hacer en vez de
 * quedarse con una fecha inventada.
 *
 * @param diaPrimero Si el primer número es el día (13/8) en vez del mes (8/13).
 *   No se adivina por fila: lo decide `detectarDiaPrimero` mirando el archivo
 *   entero, porque una fila suelta como "5/8/26" es válida en los dos órdenes.
 */
export function interpretarFechaExport(texto: string | null, diaPrimero: boolean): Date | null {
  if (!texto) return null;
  const partes = texto
    .trim()
    .match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|AM|PM)?)?/i);
  if (!partes) return null;

  const primero = Number(partes[1]);
  const segundo = Number(partes[2]);
  const dia = diaPrimero ? primero : segundo;
  const mes = diaPrimero ? segundo : primero;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const anioCrudo = Number(partes[3]);
  const anio = anioCrudo < 100 ? 2000 + anioCrudo : anioCrudo;

  let hora = Number(partes[4] ?? 0);
  const sufijo = (partes[7] ?? "").toLowerCase().replace(/[.\s]/g, "");
  if (sufijo === "pm" && hora < 12) hora += 12;
  if (sufijo === "am" && hora === 12) hora = 0;

  const fecha = new Date(anio, mes - 1, dia, hora, Number(partes[5] ?? 0), Number(partes[6] ?? 0));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Si en este archivo las fechas vienen con el día primero. Se decide con todas
 * las fechas juntas: basta con que una traiga un primer número mayor que 12
 * para saber que no puede ser el mes. Sin ninguna evidencia se asume mes
 * primero, que es como exporta Microsoft Forms por defecto.
 *
 * Se mira el archivo completo y no cada fila porque interpretar mal el orden
 * descartaría respuestas válidas por fecha sin que nadie lo note.
 */
export function detectarDiaPrimero(fechas: (string | null)[]): boolean {
  return fechas.some((texto) => {
    const partes = texto?.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-]/);
    return partes ? Number(partes[1]) > 12 : false;
  });
}

/**
 * Nombre con el que se guarda el documento de una transformación. Se renombra
 * al guardar porque el nombre de origen varía entre exports: con un nombre fijo
 * por casilla, la carpeta siempre dice sin ambigüedad qué documento es cuál.
 */
export function archivoCanonico(id: TransformacionMomento4): string {
  return `${id}.xlsx`;
}

/**
 * A qué transformación corresponde un archivo ya presente en la carpeta.
 * Primero por el nombre canónico; si no, se mira si el nombre menciona una sola
 * etiqueta, que es como vienen los exports originales
 * ("…(UC INTELIGENTE)(1-1).xlsx"). Ese segundo intento es lo que permite
 * reconocer los documentos que ya estaban antes de que existiera el cargue, sin
 * tener que renombrarlos a mano.
 */
export function transformacionDeArchivo(
  nombreArchivo: string
): (typeof TRANSFORMACIONES_MOMENTO4)[number] | null {
  const canonico = TRANSFORMACIONES_MOMENTO4.find(
    (t) => archivoCanonico(t.id).toLowerCase() === nombreArchivo.toLowerCase()
  );
  if (canonico) return canonico;

  const nombre = normalizar(nombreArchivo);
  const coincidencias = TRANSFORMACIONES_MOMENTO4.filter((t) =>
    nombre.includes(normalizar(t.etiqueta))
  );
  return coincidencias.length === 1 ? coincidencias[0] : null;
}

/**
 * Las tres opciones de "¿Consideran que esta transformación responde a lo que
 * la UCundinamarca necesita del 2027 al 2037?", en orden de mayor a menor
 * respaldo. El orden es el del gráfico y el de la leyenda: es una escala de
 * grado, no una lista de categorías sueltas, así que se pinta con la rampa
 * ordinal del proyecto (--valoracion-*) y no con la paleta categórica.
 */
export const OPCIONES_RESPALDO = [
  { id: "si", etiqueta: "Sí", color: "var(--valoracion-5)" },
  { id: "parcialmente", etiqueta: "Parcialmente", color: "var(--valoracion-3)" },
  { id: "no", etiqueta: "No", color: "var(--valoracion-1)" },
  // Cualquier otro texto cae aquí en vez de desaparecer del conteo: si un
  // export trae una opción nueva, se ve que existe en vez de perderse.
  { id: "otra", etiqueta: "Sin responder u otra", color: "var(--muted-foreground)" },
] as const;

export type OpcionRespaldo = (typeof OPCIONES_RESPALDO)[number]["id"];

/**
 * Clasifica el texto de esa respuesta. Se normaliza (sin tildes, en
 * mayúsculas) porque el mismo valor llega escrito de varias formas entre
 * exports —"Si", "SÍ", "sí"— y contarlos por separado partiría el gráfico en
 * categorías que son la misma.
 */
export function clasificarRespaldo(texto: string | null): OpcionRespaldo {
  const valor = normalizar(texto ?? "");
  if (valor === "SI") return "si";
  if (valor === "NO") return "no";
  if (valor === "PARCIALMENTE") return "parcialmente";
  return "otra";
}

/**
 * Programas de graduación reconocidos, en el orden en que se listan y se
 * pintan. Es una lista cerrada: la pregunta del formulario es de texto libre y
 * en los documentos reales hay ~130 redacciones distintas —"Administración de
 * empresas", "Adm empresas", "Ingeniería ambiental", "Ing ambiental",
 * "Enfermeria", "Wnfermeria"…— para una docena de carreras. Sin unificarlas,
 * cada variante era una barra propia y el gráfico mostraba la misma carrera
 * cinco o seis veces con una respuesta cada una.
 */
export const PROGRAMAS_GRADUADO = [
  "Administración de Empresas",
  "Contaduría Pública",
  "Enfermería",
  "Ingeniería Ambiental",
  "Ingeniería de Software",
  "Ingeniería de Sistemas",
  "Música",
  "Zootecnia",
  "Licenciatura en Educación Básica",
  "Biología y Química",
  "Gestión Turística y Hotelera",
  "Administración del Medio Ambiente",
  "Gerencia para el Desarrollo Organizacional",
] as const;

/**
 * Los programas que menciona una respuesta de graduado, ya unificados.
 *
 * Devuelve una lista y no un valor único a propósito: hay respuestas que citan
 * varias carreras ("Administración de Empresas e Ingeniería de Software",
 * "Administrador de empresas, zootecnia") y cada una debe contar en su barra.
 *
 * Se reconoce por palabras clave sobre el texto normalizado (sin tildes, en
 * mayúsculas), no con una tabla de equivalencias exactas: mientras alguien
 * escriba "nfermer" o "ambiental", su respuesta cae en la carrera correcta
 * aunque la escriba distinto a como la escribió nadie antes.
 *
 * Devuelve `[]` —que la vista pinta como "Sin especificar"— cuando el texto no
 * nombra ninguna carrera: no-respuestas ("N/A", "Ninguno", ".", "No me he
 * graduado"), nombres de sede sueltos ("Girardot"), o párrafos pegados por
 * error en el campo. El umbral de 90 caracteres descarta esos párrafos sin
 * tocar el nombre real más largo (la licenciatura, de 78).
 */
export function programasDeGraduado(texto: string | null): string[] {
  const clave = normalizar((texto ?? "").trim().replace(/\s+/g, " "));
  if (!clave || clave.length > 90) return [];

  const tiene = (patron: RegExp) => patron.test(clave);
  const encontrados: string[] = [];
  const agregar = (programa: (typeof PROGRAMAS_GRADUADO)[number]) => {
    if (!encontrados.includes(programa)) encontrados.push(programa);
  };

  // "medio ambiente" es una carrera distinta de "ingeniería ambiental" y de
  // "administración de empresas": se resuelve aparte para que "Administración
  // del Medio Ambiente" no caiga en "Administración de Empresas" por el "adm".
  const medioAmbiente = tiene(/MEDIO ?AMBIENTE/);
  if (medioAmbiente) agregar("Administración del Medio Ambiente");

  if (tiene(/EMPRESA/) || tiene(/\bADMON\b|\bADM\b/) || (tiene(/ADMINISTRAC/) && !medioAmbiente)) {
    agregar("Administración de Empresas");
  }
  if (tiene(/CONTADUR/)) agregar("Contaduría Pública");
  // "NFERMER" cubre "Enfermeria", "Enfermería" y el error "Wnfermeria".
  if (tiene(/NFERMER|ENFEREMR|ENFERMERA/)) agregar("Enfermería");
  if (tiene(/AMBIENTAL/)) agregar("Ingeniería Ambiental");
  if (tiene(/SOFTWARE/)) agregar("Ingeniería de Software");
  if (tiene(/SISTEMAS/)) agregar("Ingeniería de Sistemas");
  if (tiene(/MUSICA/)) agregar("Música");
  if (tiene(/ZOOTECN/)) agregar("Zootecnia");
  if (tiene(/LICENCIAT|LICENCIAD|EDUCACION BASICA|HUMANIDAD|ANIDADES INGLES/)) {
    agregar("Licenciatura en Educación Básica");
  }
  if (tiene(/BIOLOGIA/) && tiene(/QUIMICA/)) agregar("Biología y Química");
  if (tiene(/GESTION TURISTICA/) || (tiene(/TURISTIC/) && tiene(/HOTELER/))) {
    agregar("Gestión Turística y Hotelera");
  }
  if (tiene(/GERENCIA|DESARROLLO ORGANIZACIONAL/)) {
    agregar("Gerencia para el Desarrollo Organizacional");
  }

  // Se devuelven en el orden canónico, no en el de aparición: así una barra no
  // cambia de sitio porque alguien escribió las dos carreras al revés.
  return PROGRAMAS_GRADUADO.filter((p) => encontrados.includes(p));
}

/**
 * Valores de la columna de correo que NO identifican a una persona.
 *
 * Cuando el formulario admite respuestas anónimas, Microsoft Forms no deja la
 * celda vacía: escribe literalmente "anonymous" en todas. Tratarlo como un
 * correo cualquiera hace que la deduplicación considere a todos los anónimos
 * la misma persona y conserve solo uno por documento. En los documentos
 * reales eso borraba 42 de 47 respuestas anónimas —y hundía el conteo de
 * graduados de 54 a 15—, porque casi todos los graduados respondieron sin
 * identificarse.
 *
 * Se comparan en minúsculas, igual que los correos.
 */
const CORREOS_SIN_IDENTIDAD = new Set(["anonymous", "anónimo", "anonimo"]);

/**
 * Si ese valor de correo identifica a una persona concreta. Lo usan tanto la
 * deduplicación como el conteo de participantes únicos: si discreparan, la
 * sección diría que hay menos participantes de los que muestra en la tabla.
 */
export function correoIdentifica(correo: string | null): boolean {
  const valor = correo?.trim().toLowerCase() ?? "";
  return valor.length > 0 && !CORREOS_SIN_IDENTIDAD.has(valor);
}

/**
 * Deja una sola respuesta por correo **y rol** DENTRO de un mismo documento.
 *
 * La identidad no es el correo solo: una misma persona puede tener varios
 * roles en la universidad —ser graduada y además administrativa— y responder
 * el formulario una vez por cada uno. Esas dos filas son respuestas legítimas
 * y distintas. Lo que no puede haber es el mismo correo dos veces con el mismo
 * rol: eso sí es la misma persona respondiendo dos veces.
 *
 * El alcance es el documento y no el conjunto de los cinco a propósito. Las 5
 * transformaciones son formularios distintos y una misma persona puede opinar
 * sobre varias — de hecho ocurre en los documentos reales, donde el correo de
 * Estadística de Planeación aparece en cuatro de ellos. Deduplicar entre
 * documentos borraría respuestas legítimas.
 *
 * De cada repetición se conserva **la última** aparición: el export viene
 * ordenado por ID de respuesta ascendente, así que la última fila es la
 * respuesta más reciente de esa persona. Se prefiere ese criterio a leer la
 * columna de fecha porque el export la trae como texto en formato ambiguo
 * (`8/13/26 9:33`), y una fecha mal interpretada elegiría la respuesta
 * equivocada sin que nadie lo note.
 *
 * Las filas sin correo se conservan todas: un export puede traer respuestas
 * anónimas, y tratarlas como repetidas entre sí borraría respuestas distintas.
 */
export function quitarCorreosRepetidos<T>(
  filas: T[],
  correoDe: (fila: T) => string | null,
  rolDe: (fila: T) => string | null
): { unicas: T[]; descartadas: number; correosRepetidos: string[] } {
  // Se compara en minúsculas: los correos no distinguen mayúsculas, y el mismo
  // buzón escrito de dos formas es la misma persona. Los valores que no
  // identifican a nadie (ver CORREOS_SIN_IDENTIDAD) cuentan como "sin correo".
  //
  // El rol entra en la clave normalizado y separado por " ", un carácter
  // que no aparece en un correo ni en un rol: sin un separador imposible,
  // "a@x.com" + "BC" y "a@x.comB" + "C" darían la misma clave.
  const clave = (fila: T) => {
    const correo = correoDe(fila)?.trim().toLowerCase() || null;
    if (!correo || CORREOS_SIN_IDENTIDAD.has(correo)) return null;
    return `${correo} ${normalizar(rolDe(fila) ?? "")}`;
  };

  const ultimaPosicion = new Map<string, number>();
  filas.forEach((fila, indice) => {
    const identidad = clave(fila);
    if (identidad) ultimaPosicion.set(identidad, indice);
  });

  // Se reporta solo el correo y no la clave completa: el aviso lo lee una
  // persona, y "alguien@ucundinamarca.edu.co GRADUADOS" no se entiende.
  const repetidos = new Set<string>();
  const unicas = filas.filter((fila, indice) => {
    const identidad = clave(fila);
    if (!identidad) return true;
    const esLaUltima = ultimaPosicion.get(identidad) === indice;
    if (!esLaUltima) repetidos.add(correoDe(fila)!.trim().toLowerCase());
    return esLaUltima;
  });

  return {
    unicas,
    descartadas: filas.length - unicas.length,
    correosRepetidos: [...repetidos],
  };
}

/**
 * Compara los encabezados de un archivo contra el formato exigido y describe la
 * primera diferencia en términos que el usuario pueda accionar. Devuelve null
 * cuando el formato es correcto.
 */
export function validarColumnas(encabezados: string[]): string | null {
  const recibidas = encabezados.map(canonizarColumna).filter((c) => c.length > 0);
  const esperadas = COLUMNAS_MOMENTO4.map(normalizar);

  // Ni una sola columna en común: no es un export de este formulario con algún
  // problema, es otro archivo. Enumerar cuántas columnas faltan en ese caso
  // sugiere que se puede arreglar editando el Excel, cuando lo que hay que
  // hacer es buscar el archivo correcto.
  if (!esperadas.some((columna) => recibidas.includes(columna))) {
    return "Ninguna de sus columnas coincide con el formulario del Momento 4: parece ser otro archivo. Debe ser el .xlsx exportado de Microsoft Forms.";
  }

  const faltantes = COLUMNAS_MOMENTO4.filter((_, i) => !recibidas.includes(esperadas[i]));
  if (faltantes.length > 0) {
    return `Faltan ${faltantes.length} de las ${COLUMNAS_MOMENTO4.length} columnas del formato. La primera que falta es "${faltantes[0]}".`;
  }

  const sobrantes = recibidas.filter((c) => !esperadas.includes(c));
  if (sobrantes.length > 0) {
    return `El archivo trae ${sobrantes.length} columna(s) que no son del formato. La primera es "${sobrantes[0]}".`;
  }

  const desordenada = esperadas.findIndex((c, i) => recibidas[i] !== c);
  if (desordenada !== -1) {
    return `Las columnas están en otro orden: en la posición ${desordenada + 1} se esperaba "${COLUMNAS_MOMENTO4[desordenada]}".`;
  }

  return null;
}
