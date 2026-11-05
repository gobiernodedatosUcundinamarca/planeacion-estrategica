import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PanelIaAdministrativos } from "@/components/ia-administrativos/panel-ia-administrativos";
import { SeccionNoDisponible } from "@/components/layout/seccion-no-disponible";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { getVistaIaAdministrativos } from "@/repositories/iaAdministrativosRepository";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { SECCION_IA_ADMINISTRATIVOS } from "@/constants/secciones";
import { SUBTITULO_IA_ADMINISTRATIVOS, TITULO_IA_ADMINISTRATIVOS } from "@/lib/reglas/ia-administrativos";
import type { VistaIaAdministrativos } from "@/types/ia-administrativos";

export const metadata: Metadata = {
  title: TITULO_IA_ADMINISTRATIVOS,
};

/** Sin prerenderizado: mismo motivo que la sección de las transformaciones (ver ahí). */
export const dynamic = "force-dynamic";

/**
 * Uso de IA en procesos administrativos. Vive en Postgres como las demás
 * secciones que se cargan desde /admin: el Excel de Forms se sube allí y aquí
 * solo se lee.
 */
export default async function IaAdministrativosPage() {
  if (!(await estaSeccionPublicada(SECCION_IA_ADMINISTRATIVOS))) {
    return <SeccionNoDisponible titulo={TITULO_IA_ADMINISTRATIVOS} />;
  }

  let vista: VistaIaAdministrativos = { respuestas: [], temas: [] };
  let error: string | null = null;
  try {
    vista = await getVistaIaAdministrativos();
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo consultar la base de datos.";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">{TITULO_IA_ADMINISTRATIVOS}</h1>
        <p className="text-sm text-muted-foreground">{SUBTITULO_IA_ADMINISTRATIVOS}</p>
      </header>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground">No se pudieron cargar las respuestas.</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : vista.respuestas.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Todavía no hay respuestas cargadas. Se publican subiendo el Excel de Forms desde la vista de
          administración.
        </p>
      ) : (
        <PanelIaAdministrativos respuestas={vista.respuestas} temas={vista.temas} />
      )}

      <DescargaExcel ruta="/ia-administrativos" />
    </div>
  );
}
