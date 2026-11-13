import "server-only";
import { ExcelConvocatoriaDataSource } from './excel-convocatoria-source';
export const getConvocatoriaDataSource = crearSingleton(() => new ExcelConvocatoriaDataSource());
import { ExcelEncuestaDataSource } from "./excel-data-source";
import { ExcelMetasDataSource } from "./excel-metas-source";
import { ExcelConferencistasDataSource } from "./excel-conferencistas-source";
import { ExcelValoracionesDataSource } from "./excel-valoraciones-source";
import { ExcelCaiDataSource } from "./excel-cai-source";
import { ExcelAccesosCaiDataSource } from "./excel-accesos-source";
import { ExcelAnaliticaMomentosDataSource } from "./excel-analitica-momentos-source";
import { PostgresMomento4DataSource } from "./postgres-momento4-source";
import { PostgresParticipacionDataSource } from "./postgres-participacion-source";
import { PostgresAportesDataSource } from "./postgres-aportes-source";
import { PostgresSeccionesDataSource } from "./postgres-secciones-source";
import { PostgresMetricasDataSource } from "./postgres-metricas-source";
import { PostgresFormularioDataSource } from "./postgres-formulario-source";
import {
  DEFINICION_IA_ADMINISTRATIVOS,
  DEFINICION_VALORACION_TERRITORIO,
} from "./formularios-definicion";
import { PostgresDescargasDataSource } from "./postgres-descargas-source";
import type {
  DescargasDataSource,
  IaAdministrativosDataSource,
  ValoracionTerritorioDataSource,
} from "./types";
import { crearSingleton } from "./infrastructure/singleton";

export type {
  EncuestaDataSource,
  MetasDataSource,
  ConferencistasDataSource,
  ValoracionesDataSource,
  CaiDataSource,
  AccesosCaiDataSource,
  AnaliticaMomentosDataSource,
  Momento4DataSource,
  ParticipacionDataSource,
  AportesDataSource,
  SeccionesDataSource,
  MetricasDataSource,
  ValoracionTerritorioDataSource,
  IaAdministrativosDataSource,
} from "./types";

/**
 * Único punto de construcción de los orígenes de datos: cada repositorio pide
 * el suyo aquí y solo conoce la interfaz que implementa, nunca la clase.
 *
 * Migrar un módulo a otra fuente (SQL, API REST, etc.) es escribir una clase
 * que cumpla el contrato correspondiente de `types.ts` y cambiar la línea de
 * abajo — ningún repositorio, página ni componente necesita enterarse.
 *
 * Son singletons porque la caché en memoria vive en la instancia: construir uno
 * nuevo en cada consulta tiraría la caché y reparsearía el Excel.
 */
export const getEncuestaDataSource = crearSingleton(() => new ExcelEncuestaDataSource());

export const getMetasDataSource = crearSingleton(() => new ExcelMetasDataSource());

export const getConferencistasDataSource = crearSingleton(() => new ExcelConferencistasDataSource());

export const getValoracionesDataSource = crearSingleton(() => new ExcelValoracionesDataSource());

export const getCaiDataSource = crearSingleton(() => new ExcelCaiDataSource());

// El padrón de Accesos sale del Excel de Seguimiento, no de una copia propia.
export const getAccesosCaiDataSource = crearSingleton(
  () => new ExcelAccesosCaiDataSource(getCaiDataSource())
);

export const getAnaliticaMomentosDataSource = crearSingleton(
  () => new ExcelAnaliticaMomentosDataSource()
);

// Único módulo que no sale de un Excel en vivo: sus respuestas viven en
// Postgres para poder actualizarse desde el sitio publicado, donde el disco es
// de solo lectura. El .xlsx sigue siendo el formato de entrada del cargue.
export const getMomento4DataSource = crearSingleton(() => new PostgresMomento4DataSource());

export const getParticipacionDataSource = crearSingleton(
  () => new PostgresParticipacionDataSource()
);

export const getAportesDataSource = crearSingleton(() => new PostgresAportesDataSource());

// Los dos formularios que se cargan como un solo documento comparten el
// almacén; cada uno solo dice dónde se guarda y cómo se ve su respuesta.
export const getValoracionTerritorioDataSource = crearSingleton(
  (): ValoracionTerritorioDataSource =>
    new PostgresFormularioDataSource(DEFINICION_VALORACION_TERRITORIO, ({ id, fechaRespuesta, valores }) => ({
      id,
      fechaRespuesta,
      ...valores,
    }))
);

export const getIaAdministrativosDataSource = crearSingleton(
  (): IaAdministrativosDataSource =>
    new PostgresFormularioDataSource(DEFINICION_IA_ADMINISTRATIVOS, ({ id, fechaRespuesta, valores }) => ({
      id,
      fechaRespuesta,
      ...valores,
    }))
);

export const getDescargasDataSource = crearSingleton(
  (): DescargasDataSource => new PostgresDescargasDataSource()
);

export const getSeccionesDataSource = crearSingleton(() => new PostgresSeccionesDataSource());

export const getMetricasDataSource = crearSingleton(() => new PostgresMetricasDataSource());
