import "@/components/valoracion-territorio/integrada.css";
import {TextoEditorial} from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { ValoracionActualizada } from "@/components/valoracion-territorio/actualizada";
import { versionarDatos } from '@/lib/datos-versionados';
import { SeccionNoDisponible } from "@/components/layout/seccion-no-disponible";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { getVistaValoracionTerritorio } from "@/repositories/valoracionTerritorioRepository";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { SECCION_VALORACION_TERRITORIO } from "@/constants/secciones";
import {
  TITULO_VALORACION_TERRITORIO,
} from "@/lib/reglas/valoracion-territorio";
import type { VistaValoracionTerritorio } from "@/types/valoracion-territorio";

export const metadata: Metadata = {
  title: TITULO_VALORACION_TERRITORIO,
};

/** Sin prerenderizado: mismo motivo que la sección de las transformaciones (ver ahí). */
export const dynamic = "force-dynamic";

/**
 * Valoración de la experiencia en territorio. Vive en Postgres como las demás
 * secciones que se cargan desde /admin: el Excel de Forms se sube allí y aquí
 * solo se lee.
 */
export default async function ValoracionTerritorioPage() {
  if (!(await estaSeccionPublicada(SECCION_VALORACION_TERRITORIO))) {
    return <SeccionNoDisponible titulo={TITULO_VALORACION_TERRITORIO} />;
  }

  let vista: VistaValoracionTerritorio = {
    respuestas: [],
    temas: [],
    excluidas: { sinUnidadRegional: 0, sinRol: 0 },
  };
  let error: string | null = null;
  try {
    vista = await getVistaValoracionTerritorio();
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo consultar la base de datos.";
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground"><TextoEditorial id="91463689520fccffa864" original={"No se pudieron cargar las respuestas."}/></p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : (
        <div className="valoracion-integrada"><ValoracionActualizada inicial={versionarDatos({vista})}/></div>
      )}

      <DescargaExcel ruta="/valoracion-territorio" />
    </div>
  );
}
