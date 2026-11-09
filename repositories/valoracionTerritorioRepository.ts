import "server-only";
import type { DocumentoFormulario, ResultadoCargueFormulario } from "@/types/formularios";
import type { VistaValoracionTerritorio } from "@/types/valoracion-territorio";
import { agruparPorTema } from "@/lib/reglas/agrupar-temas";
import { PALABRAS_SIN_TEMA_MEJORA, entraEnValoracion } from "@/lib/reglas/valoracion-territorio";
import { getValoracionTerritorioDataSource } from "./datasource";
import { getUnidadRegionalPorFecha } from "./participacionRepository";

/**
 * Única capa de acceso a la valoración de la experiencia en territorio (el
 * instrumento que se respondió al cierre de cada jornada).
 */
export function getDocumentoValoracionTerritorio(): Promise<DocumentoFormulario | null> {
  return getValoracionTerritorioDataSource().getDocumento();
}

/**
 * Las respuestas, cada una con la unidad regional de su jornada y el tema de
 * su sugerencia de mejora.
 */
export async function getVistaValoracionTerritorio(): Promise<VistaValoracionTerritorio> {
  const [respuestas, unidadDe] = await Promise.all([
    getValoracionTerritorioDataSource().getRespuestas(),
    // Si las jornadas no se pueden consultar, la sección se ve igual, solo que
    // sin unidad regional: no es motivo para dejarla en blanco.
    getUnidadRegionalPorFecha().catch(() => new Map<string, string>()),
  ]);
  const conUnidad = respuestas.map((r) => ({
    ...r,
    unidadRegional: r.fechaRespuesta ? (unidadDe.get(r.fechaRespuesta) ?? null) : null,
  }));
  const incluidas = conUnidad.filter(entraEnValoracion);
  // Los temas se calculan sobre las que entran, no sobre todas: si no, las
  // cifras de cada tema contarían sugerencias que la sección no muestra.
  const { temas, temaDe } = agruparPorTema(incluidas, (r) => r.mejora, PALABRAS_SIN_TEMA_MEJORA);
  return {
    respuestas: incluidas.map((r) => ({ ...r, tema: temaDe.get(r.id) ?? null })),
    temas,
    excluidas: {
      sinUnidadRegional: conUnidad.filter((r) => !r.unidadRegional).length,
      sinRol: conUnidad.filter((r) => r.unidadRegional && !r.tipoActor?.trim()).length,
    },
  };
}

/** Valida el archivo y lo deja como único contenido. */
export function guardarDocumentoValoracionTerritorio(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  return getValoracionTerritorioDataSource().guardar(nombreOriginal, contenido);
}

/** Agrega solo las respuestas nuevas del export, sin tocar las anteriores. */
export function actualizarDocumentoValoracionTerritorio(
  nombreOriginal: string,
  contenido: Buffer
): Promise<ResultadoCargueFormulario> {
  return getValoracionTerritorioDataSource().actualizar(nombreOriginal, contenido);
}

export function eliminarValoracionTerritorio(): Promise<number> {
  return getValoracionTerritorioDataSource().eliminar();
}
