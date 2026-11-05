import { AFIRMACIONES_VALORACION, COLUMNA_MEJORA, COLUMNA_TIPO_ACTOR } from "@/lib/reglas/valoracion-territorio";
import { PREGUNTAS_IA, type CampoIa } from "@/lib/reglas/ia-administrativos";
import type { CampoAfirmacion } from "@/lib/reglas/valoracion-territorio";
import type { ColumnaFormulario } from "./formulario-formato";

/**
 * Dónde se guarda cada formulario y qué columna de la base recibe cada
 * pregunta. Lo usan el almacén (para leer y escribir) y los scripts de
 * migración (para crear las tablas con exactamente estas columnas), así que
 * agregar una pregunta es agregarla aquí y volver a migrar.
 *
 * Sin "server-only", igual que los almacenes: los scripts de migración
 * importan este archivo desde Node.
 */

export interface DefinicionFormulario<C extends string> {
  /** Cómo se nombra en los mensajes de la carga ("la valoración de la experiencia"). */
  nombre: string;
  /** Tabla de una sola fila con el archivo vigente. */
  tablaDocumento: string;
  tablaRespuestas: string;
  columnas: readonly (ColumnaFormulario<C> & { columnaBd: string })[];
}

/** "competenciaNoApropiado" → "competencia_no_apropiado". */
function aColumnaBd(campo: string): string {
  return campo.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
}

export type CampoValoracionTerritorio = CampoAfirmacion | "tipoActor" | "mejora";

export const DEFINICION_VALORACION_TERRITORIO: DefinicionFormulario<CampoValoracionTerritorio> = {
  nombre: "la valoración de la experiencia en territorio",
  tablaDocumento: "valoracion_territorio_documento",
  tablaRespuestas: "valoracion_territorio_respuestas",
  columnas: [
    { campo: "tipoActor", inicio: COLUMNA_TIPO_ACTOR },
    ...AFIRMACIONES_VALORACION.map((a) => ({ campo: a.campo, inicio: a.inicio })),
    { campo: "mejora", inicio: COLUMNA_MEJORA },
  ].map((c) => ({ ...c, columnaBd: aColumnaBd(c.campo) })) as DefinicionFormulario<CampoValoracionTerritorio>["columnas"],
};

export const DEFINICION_IA_ADMINISTRATIVOS: DefinicionFormulario<CampoIa> = {
  nombre: "la encuesta de IA a administrativos",
  tablaDocumento: "ia_administrativos_documento",
  tablaRespuestas: "ia_administrativos_respuestas",
  columnas: (Object.keys(PREGUNTAS_IA) as CampoIa[]).map((campo) => ({
    campo,
    inicio: PREGUNTAS_IA[campo].inicio,
    columnaBd: aColumnaBd(campo),
  })),
};
