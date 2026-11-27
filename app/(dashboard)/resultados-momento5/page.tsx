import "@/components/momento5/momento5.css";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { NotasMomento5 } from "@/components/momento5/notas-momento5";
import { PanelMomento5 } from "@/components/momento5/panel-momento5";
import { PortadaMomento5 } from "@/components/momento5/portada-momento5";
import { TITULO_MOMENTO5 } from "@/lib/reglas/momento5";
import { getActividad2Momento5, getKahootMomento5, getVistaMomento5 } from "@/repositories/momento5Repository";
import type { KahootMomento5 } from "@/types/momento5-kahoot";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import type { Actividad2Momento5 } from "@/types/momento5-actividad2";

export const metadata: Metadata = { title: TITULO_MOMENTO5 };

/**
 * Resultados de las actividades del Momento 5 del CAI (17 y 18 de noviembre de
 * 2026), contados como el plan corregido. Lee en vivo `resultados.json`
 * (docs/decisions/0003): las cifras son las del análisis de los cinco
 * formularios, sin recalcular su depuración. La Actividad 2 (fichas por mesa y
 * Mentimeter) sale de `actividad2.xlsx` (docs/decisions/0005).
 */
export default function ResultadosMomento5Page() {
  let datos: ResultadosMomento5 | null = null;
  let abiertas: PreguntaAbiertaMomento5[] = [];
  let error: string | null = null;
  try {
    ({ datos, abiertas } = getVistaMomento5());
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo leer el archivo de resultados.";
  }
  // El Kahoot de la Actividad 3 sale de su propio reporte; sin él (o si falla) se sigue sin ese capítulo.
  let kahoot: KahootMomento5 | null = null;
  try {
    kahoot = getKahootMomento5();
  } catch {
    kahoot = null;
  }
  // La Actividad 2 sale de otro archivo: si falla, la página sigue con los formularios y lo avisa.
  let a2: Actividad2Momento5 | null = null;
  let errorA2: string | null = null;
  try {
    a2 = getActividad2Momento5();
  } catch (fallo) {
    errorA2 = fallo instanceof Error ? fallo.message : "No se pudo leer el archivo de la Actividad 2.";
  }

  if (error || !datos || datos.participantes.length === 0) {
    return (
      <div className="m5 flex flex-col gap-6">
        <h1 className="m5-titular-2">
          <TextoEditorial id="m5-titulo" original="Resultados de las actividades del 17 y 18 de noviembre de 2026" />
        </h1>
        {error || !datos ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-medium text-foreground">
                <TextoEditorial id="m5-error" original="No se pudieron cargar los resultados del Momento 5." />
              </p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <p className="m5-entradilla text-[var(--m5-suave)]">
            <TextoEditorial id="m5-sin-datos" original="Todavía no hay resultados para mostrar." />
          </p>
        )}
      </div>
    );
  }

  return (
    // Ancho completo, como las demás secciones: con un tope de 72rem la página quedaba pegada a la
    // izquierda y dejaba un vacío a la derecha. Los textos largos ya limitan su propio ancho (ch).
    <article className="m5">
      <PortadaMomento5
        formularios={datos.meta.formularios}
        participantes={datos.participantes.length}
        equipos={datos.equipos.length}
        actividad2={a2 ? { mesas: a2.mesas.length, indicadores: a2.indicadores.length } : null}
      />
      {errorA2 ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground">
              <TextoEditorial id="m5-a2-error" original="No se pudo cargar la Actividad 2; se muestran los formularios de las actividades 1 y 3." />
            </p>
            <p className="text-muted-foreground">{errorA2}</p>
          </div>
        </div>
      ) : null}
      <PanelMomento5 datos={datos} abiertas={abiertas} a2={a2} kahoot={kahoot} />
      <NotasMomento5 meta={datos.meta} archivosActividad2={a2?.archivos ?? []} />
      {/* Al final, después de lo que se depuró: el Excel trae los formularios sin esos envíos. */}
      <div className="pb-16">
        <DescargaExcel ruta="/resultados-momento5" />
      </div>
    </article>
  );
}
