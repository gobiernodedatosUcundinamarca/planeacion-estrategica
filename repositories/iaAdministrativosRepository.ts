import "server-only";
import type { DocumentoFormulario, ResultadoCargueFormulario } from "@/types/formularios";
import type { VistaIaAdministrativos } from "@/types/ia-administrativos";
import { agruparPorTema } from "@/lib/reglas/agrupar-temas";
import { PALABRAS_SIN_TEMA_TAREA } from "@/lib/reglas/ia-administrativos";
import { getIaAdministrativosDataSource } from "./datasource";
import { getUnidadRegionalPorFecha } from "./participacionRepository";

/**
 * Única capa de acceso a la encuesta diagnóstica sobre uso de IA en procesos
 * administrativos.
 */
export function getDocumentoIaAdministrativos(): Promise<DocumentoFormulario | null> {
  return getIaAdministrativosDataSource().getDocumento();
}

/**
 * Las respuestas, cada una con la unidad regional de su jornada y el tema de
 * la tarea repetitiva que describió.
 */
export async function getVistaIaAdministrativos(): Promise<VistaIaAdministrativos> {
  const [respuestas, unidadDe] = await Promise.all([
    getIaAdministrativosDataSource().getRespuestas(),
    // Si las jornadas no se pueden consultar, la sección se ve igual, solo que
    // sin unidad regional: no es motivo para dejarla en blanco.
    getUnidadRegionalPorFecha().catch(() => new Map<string, string>()),
  ]);
  const { temas, temaDe } = agruparPorTema(respuestas, (r) => r.tareaRepetitiva, PALABRAS_SIN_TEMA_TAREA);
  return {
    respuestas: respuestas.map((r) => ({
      ...r,
      unidadRegional: r.fechaRespuesta ? (unidadDe.get(r.fechaRespuesta) ?? null) : null,
      tema: temaDe.get(r.id) ?? null,
    })),
    temas,
  };
}

/** Valida el archivo y lo deja como único contenido. */
export function guardarDocumentoIaAdministrativos(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  return getIaAdministrativosDataSource().guardar(nombreOriginal, contenido);
}

/** Agrega solo las respuestas nuevas del export, sin tocar las anteriores. */
export function actualizarDocumentoIaAdministrativos(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  return getIaAdministrativosDataSource().actualizar(nombreOriginal, contenido);
}

export function eliminarIaAdministrativos(): Promise<number> {
  return getIaAdministrativosDataSource().eliminar();
}
