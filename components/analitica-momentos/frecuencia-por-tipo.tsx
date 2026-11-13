import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { formatNumero } from "@/lib/formatters";
import { RESUMEN_APRENDIZAJES, RESUMEN_MEJORAS } from "@/constants/resumen-momentos";
import type { PalabraFrecuencia } from "@/lib/frecuencia-palabras";

function datosGrafico(palabras: PalabraFrecuencia[]) {
  const total = palabras.reduce((suma, p) => suma + p.frecuencia, 0);
  return palabras.map((p) => ({
    etiqueta: p.palabra,
    conteo: p.frecuencia,
    porcentaje: total > 0 ? (p.frecuencia / total) * 100 : 0,
  }));
}

/**
 * Frecuencia de palabras separada por tipo de pregunta abierta: qué se dice
 * al hablar de aprendizajes frente a qué se dice al hablar de mejoras, en
 * dos gráficos de barras independientes (mismas 5 actividades tipo
 * "encuesta" que alimentan la nube de palabras general).
 */
export function FrecuenciaPorTipo({
  palabrasMejoras,
  totalRespuestasMejoras,
  palabrasAprendizaje,
  totalRespuestasAprendizaje,
}: {
  palabrasMejoras: PalabraFrecuencia[];
  totalRespuestasMejoras: number;
  palabrasAprendizaje: PalabraFrecuencia[];
  totalRespuestasAprendizaje: number;
}) {
  if (palabrasMejoras.length === 0 && palabrasAprendizaje.length === 0) return null;

  return (
    <Card className="py-3">
      <CardHeader className="px-3.5 pb-1">
        <CardTitle className="text-[13px]"><TextoEditorial id="00fa77eeec147501d4ce" original={"Frecuencia de palabras por tipo de pregunta"}/></CardTitle>
      </CardHeader>
      <CardContent className="px-3.5">
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{RESUMEN_APRENDIZAJES}</p>
            <RankedBarChart
              titulo={`Aprendizajes · ${formatNumero(totalRespuestasAprendizaje)} respuestas`}
              datos={datosGrafico(palabrasAprendizaje)}
              alturaFila={26}
              truncarEn={20}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{RESUMEN_MEJORAS}</p>
            <RankedBarChart
              titulo={`Mejoras · ${formatNumero(totalRespuestasMejoras)} respuestas`}
              datos={datosGrafico(palabrasMejoras)}
              alturaFila={26}
              truncarEn={20}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
