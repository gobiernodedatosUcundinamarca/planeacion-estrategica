import type { Persona, RolAsignado, RespuestaPregunta } from "@/types/encuesta";
import type { FilaMeta } from "@/types/metas";
import type { ConferenciaCard } from "@/types/conferencistas";
import type { ValoracionConferencista } from "@/types/valoraciones";
import type { CaiData } from "@/types/cai";
import type { AccesosCaiData } from "@/types/accesos-cai";
import type {
  AnaliticaMomentoDetalle,
  ArchivoAnaliticaMomentos,
  ResumenAnaliticaMomentos,
} from "@/types/analitica-momentos";
import type {
  ClusterComentarios,
  DocumentoMomento4,
  RespuestaMomento4,
  ResultadoCargue,
} from "@/types/momento4";
import type { MetricasUso } from "@/types/metricas";
import type {
  DocumentoParticipacion,
  ModoCargueParticipacion,
  RegistroParticipacion,
  ResultadoCargueParticipacion,
} from "@/types/participacion";
import type {
  DocumentoAportes,
  RespuestaAporte,
  ResultadoCargueAportes,
} from "@/types/aportes";

/**
 * Contrato que debe cumplir cualquier origen de datos de la encuesta.
 * `encuestaRepository.ts` depende únicamente de esta interfaz — nunca de
 * Excel, JSON, SQL o una API en concreto. Migrar a otra fuente en el futuro
 * (PostgreSQL, MySQL, SQL Server, una API REST, etc.) implica escribir una
 * nueva clase que la implemente y cambiar un único punto de construcción
 * (`getEncuestaDataSource` en `index.ts`); ningún componente de la interfaz
 * ni el resto del repositorio necesita cambiar.
 */
export interface EncuestaDataSource {
  getPersonas(): Persona[];
  getRolesAsignados(): RolAsignado[];
  getRespuestas(): RespuestaPregunta[];
}

/**
 * Contrato del origen de datos del módulo Metas. Cada método devuelve una de
 * las tablas ya agregadas (los .xlsx de origen son en sí mismos tablas
 * dinámicas exportadas, una fila por categoría) — igual que con la encuesta,
 * `metasRepository.ts` solo conoce esta interfaz.
 */
export interface MetasDataSource {
  getGestoresConocimiento(): FilaMeta[];
  getAdministrativosPorContrato(): FilaMeta[];
  getAdministrativosPorSede(): FilaMeta[];
  getCreadorOportunidad(): FilaMeta[];
  getGraduados(): FilaMeta[];
}

/**
 * Contrato del origen de datos del módulo Conferencistas. Una única hoja
 * ("Base de Datos" de Participación jornadas.xlsx) ya trae una fila por
 * tarjeta a publicar, con columnas *_card listas para presentar — no hace
 * falta agregación, solo tipar y filtrar por `publicar`.
 */
export interface ConferencistasDataSource {
  getConferencias(): ConferenciaCard[];
}

/**
 * Contrato del origen de datos de Valoraciones.xlsx. El mapeo hoja/columna ->
 * conferencista vive dentro de la implementación (ver
 * excel-valoraciones-source.ts); acá solo se expone la consulta por slug,
 * que devuelve null cuando no hay evidencia confiable para asociar una
 * valoración a esa persona (en vez de inventar una).
 */
export interface ValoracionesDataSource {
  getValoracion(slug: string): ValoracionConferencista | null;
}

/** Persona del padrón oficial del CAI. */
export interface ParticipanteCai {
  nombre: string;
  correo: string;
}

/**
 * Contrato del origen de datos del módulo Seguimiento
 * ("Seguimiento participación actividades.xlsx"). Una hoja con una fila por
 * participante y una columna por actividad; la implementación deriva de ahí
 * los totales y el % de finalización. `getParticipantes` expone el padrón
 * oficial, que `AccesosCaiDataSource` necesita para filtrar sus registros.
 */
export interface CaiDataSource {
  getCaiData(): CaiData;
  getParticipantes(): ParticipanteCai[];
}

/**
 * Contrato del origen de datos del módulo Accesos
 * ("Accesos a CAI Planeación estratégica.xlsx"). Depende del padrón del CAI:
 * solo se reportan accesos de participantes oficiales.
 */
export interface AccesosCaiDataSource {
  getAccesosCaiData(): AccesosCaiData;
}

/**
 * Contrato del origen de datos de Analítica actividades momentos
 * ("data/source-analitica-momentos/*.xlsx"). A diferencia del resto, el
 * conjunto de archivos no es fijo: cada .xlsx del directorio es una tarjeta, y
 * publicar una actividad nueva es soltar un archivo con el nombre adecuado.
 * `getDetalle` devuelve null si el archivo no está en el directorio, para que
 * la página pueda responder 404 en vez de reventar.
 */
export interface AnaliticaMomentosDataSource {
  getArchivos(): ArchivoAnaliticaMomentos[];
  getDetalle(archivo: string): AnaliticaMomentoDetalle | null;
  getResumen(): ResumenAnaliticaMomentos;
}

/**
 * Contrato del estado de publicación de las secciones. Separado del origen del
 * Momento 4 aunque hoy solo se aplique a su sección: son dos cosas distintas
 * —qué respuestas hay y si la sección se muestra— y mezclarlas obligaría a
 * tocar el módulo de datos cada vez que se quiera publicar o retirar algo.
 */
export interface SeccionesDataSource {
  estaPublicada(seccion: string): Promise<boolean>;
  /** Publica o retira la sección; devuelve el estado que quedó guardado. */
  publicar(seccion: string, publicada: boolean): Promise<boolean>;
}

/**
 * Contrato del origen de los documentos del Momento 4. Es el único con
 * escritura: la vista de administración reemplaza cada uno de los 5 documentos
 * subiéndolo en su casilla. `guardar` valida antes de escribir y no lanza —
 * informa del rechazo en el resultado, porque el motivo se le muestra a quien
 * sube.
 *
 * Asíncrono, a diferencia del resto: la implementación vigente habla con
 * Postgres (ver postgres-momento4-source.ts). El contrato no menciona ni Excel
 * ni SQL a propósito — la entrada sigue siendo un .xlsx y dónde terminan las
 * filas es cosa de la implementación.
 */
export interface Momento4DataSource {
  getDocumentos(): Promise<DocumentoMomento4[]>;
  /** Las respuestas publicadas, que alimentan la sección del Momento 4. */
  getRespuestas(): Promise<RespuestaMomento4[]>;
  /** Grupos temáticos vigentes de los comentarios abiertos. */
  getClusters(): Promise<ClusterComentarios[]>;
  guardar(
    idTransformacion: string,
    nombreOriginal: string,
    contenido: Buffer
  ): Promise<ResultadoCargue>;
  /**
   * Agrega a una transformación solo las respuestas del export que todavía no
   * estaban guardadas, sin sobrescribir las demás.
   */
  actualizar(
    idTransformacion: string,
    nombreOriginal: string,
    contenido: Buffer
  ): Promise<ResultadoCargue>;
  /**
   * Borra los registros cargados: los de una transformación, o los de todas si
   * se pasa null. Devuelve cuántas respuestas se eliminaron.
   */
  eliminar(idTransformacion: string | null): Promise<number>;
}

/**
 * Contrato de las métricas de uso del portal. `registrar` suma contadores
 * sobre una fila agregada por sección y día —no guarda un evento por visita—,
 * así que la tabla no crece con el tráfico y no contiene dato alguno de quien
 * navega.
 */
export interface MetricasDataSource {
  registrar(
    seccion: string,
    incrementos: { visitas?: number; sesiones?: number; clics?: number }
  ): Promise<void>;
  /** Acumulados y serie diaria de los últimos `dias` días. */
  getMetricas(dias: number): Promise<MetricasUso>;
}

/**
 * Contrato del origen de datos de Participación (asistencia a las
 * actividades en territorio). Igual que el Momento 4, vive en Postgres
 * porque se actualiza desde el sitio publicado; a diferencia de aquel, no
 * tiene casillas fijas: el cargue agrega una tanda o reemplaza todo, según lo
 * que elija quien sube (ver `ModoCargueParticipacion`).
 */
/**
 * Contrato del origen de los aportes generales al Plan. Es el formulario
 * abierto de UCUNDINAMARCA, que no valora ninguna transformación y por eso no
 * cabe entre las cinco casillas del Momento 4. Solo se conserva el último
 * archivo: el export de Forms es acumulativo.
 */
export interface AportesDataSource {
  getDocumento(): Promise<DocumentoAportes | null>;
  getAportes(): Promise<RespuestaAporte[]>;
  guardar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueAportes>;
  /** Agrega solo los aportes del export que todavía no estaban guardados. */
  actualizar(nombreOriginal: string, contenido: Buffer): Promise<ResultadoCargueAportes>;
  /** Borra los aportes cargados. Devuelve cuántos se eliminaron. */
  eliminar(): Promise<number>;
}

export interface ParticipacionDataSource {
  getDocumentos(): Promise<DocumentoParticipacion[]>;
  getRegistros(): Promise<RegistroParticipacion[]>;
  guardar(
    nombreOriginal: string,
    contenido: Buffer,
    modo: ModoCargueParticipacion
  ): Promise<ResultadoCargueParticipacion>;
  /** Borra una tanda, o todas si se pasa null. Devuelve cuántos registros se eliminaron. */
  eliminar(documentoId: number | null): Promise<number>;
}
