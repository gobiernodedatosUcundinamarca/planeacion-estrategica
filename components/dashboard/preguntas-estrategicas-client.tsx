"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { OtroPanel, type RespuestaOtro } from "@/components/charts/otro-panel";
import { AnalisisOtroCards } from "@/components/dashboard/analisis-otro";
import { FilterBar } from "@/components/layout/filter-bar";
import { PREGUNTAS } from "@/constants/preguntas";
import { useResumenFiltrado, type ResumenFiltrado } from "@/hooks/use-resumen-filtrado";
import type { AnalisisOtro, PreguntaId } from "@/types/encuesta";

/**
 * Render de un subconjunto de las preguntas de selección múltiple (una tarjeta
 * por pregunta) más el panel de respuestas abiertas ("Otro") acotado a esas
 * mismas preguntas. Se reutiliza en "Visión estratégica" (P3, P4) y en
 * "Fundamentos de planeación" (P1, P2); la única diferencia entre ambas
 * páginas es el título, la descripción y qué preguntas muestran.
 *
 * `categoriaSeleccionada` vive acá (no en cada componente por separado) para
 * conectar el gráfico "Categorización de las respuestas abiertas" con el
 * panel "Respuestas abiertas" de abajo: clickear una categoría en el gráfico
 * o en la lista filtra las respuestas que se listan más abajo, y el
 * desplegable del panel de respuestas permite el mismo filtro en sentido
 * inverso.
 */
export function PreguntasEstrategicasClient({
  titulo,
  descripcion,
  preguntasIds,
  inicial,
  respuestasOtro,
  analisisOtro,
}: {
  titulo: string;
  descripcion: string;
  preguntasIds: PreguntaId[];
  inicial: ResumenFiltrado;
  respuestasOtro: RespuestaOtro[];
  analisisOtro?: AnalisisOtro;
}) {
  const { data, hayFiltros, isFetching } = useResumenFiltrado();
  const resumen = hayFiltros && data ? data : inicial;
  const { rankingPreguntas } = resumen;
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);

  const preguntas = PREGUNTAS.filter((pregunta) => preguntasIds.includes(pregunta.id));
  const otroFiltradas = respuestasOtro.filter((r) => preguntasIds.includes(r.preguntaId));
  const categoriasDisponibles = useMemo(
    () => (analisisOtro ? analisisOtro.categorias.filter((c) => c.conteo > 0).map((c) => ({ id: c.id, nombre: c.nombre })) : []),
    [analisisOtro]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">{titulo}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {descripcion}
            {isFetching ? (
              <Loader2 className="ml-1.5 inline size-3 animate-spin align-[-2px] text-primary" aria-label="Actualizando" />
            ) : null}
          </p>
        </div>
        <FilterBar />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {preguntas.map((pregunta) => (
          <Card key={pregunta.id} className="py-3">
            <CardHeader className="px-3.5 pb-1">
              <CardTitle className="text-[13px] leading-snug font-semibold">
                {pregunta.id} · {pregunta.texto}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5">
              <RankedBarChart
                titulo=""
                datos={rankingPreguntas[pregunta.id].map((d) => ({
                  etiqueta: d.opcion,
                  conteo: d.conteo,
                  porcentaje: d.porcentaje,
                }))}
                alturaFila={34}
                truncarEn={44}
                ocultarAccion
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {analisisOtro && otroFiltradas.length > 0 ? (
        <AnalisisOtroCards
          analisis={analisisOtro}
          categoriaSeleccionada={categoriaSeleccionada}
          onSeleccionarCategoria={setCategoriaSeleccionada}
        />
      ) : null}

      {otroFiltradas.length > 0 ? (
        <Card className="py-3">
          <CardHeader className="px-3.5 pb-1">
            <CardTitle className="text-[13px]"><TextoEditorial id="071d051a37ce2882d33f" original={"Respuestas abiertas (&ldquo;Otro&rdquo;)"}/></CardTitle>
            <p className="text-[11px] text-muted-foreground">
              <TextoEditorial id="84411575f0daff135e5e" original={"Texto libre genuino fuera de las opciones cerradas —"}/>{otroFiltradas.length} <TextoEditorial id="bed15ef130f06b6a0c6d" original={"respuestas en total."}/></p>
          </CardHeader>
          <CardContent className="px-3.5">
            <OtroPanel
              respuestas={otroFiltradas}
              categorias={categoriasDisponibles}
              categoriaSeleccionada={categoriaSeleccionada}
              onCambiarCategoria={setCategoriaSeleccionada}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
