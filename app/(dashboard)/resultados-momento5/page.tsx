import "@/components/momento5/momento5.css";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { NotasMomento5 } from "@/components/momento5/notas-momento5";
import { PanelMomento5 } from "@/components/momento5/panel-momento5";
import { PortadaMomento5 } from "@/components/momento5/portada-momento5";
import { TITULO_MOMENTO5 } from "@/lib/reglas/momento5";
import { getVistaMomento5 } from "@/repositories/momento5Repository";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";

export const metadata: Metadata = { title: TITULO_MOMENTO5 };

/**
 * Resultados de las actividades del Momento 5 del CAI (17 y 18 de noviembre de
 * 2026), contados como el plan corregido. Lee en vivo `resultados.json`
 * (docs/decisions/0003): las cifras son las del análisis de los cinco
 * formularios, sin recalcular su depuración.
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
      />
      <PanelMomento5 datos={datos} abiertas={abiertas} />
      <NotasMomento5 meta={datos.meta} />
      {/* Al final, después de lo que se depuró: el Excel trae los formularios sin esos envíos. */}
      <div className="pb-16">
        <DescargaExcel ruta="/resultados-momento5" />
      </div>
    </article>
  );
}
