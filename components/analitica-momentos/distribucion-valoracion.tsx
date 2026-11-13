"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { esDistribucionLikert } from "@/lib/valoracion";
import type { PreguntaValoracion } from "@/types/analitica-momentos";

const PASOS_VALORACION = [
  "var(--valoracion-1)",
  "var(--valoracion-2)",
  "var(--valoracion-3)",
  "var(--valoracion-4)",
  "var(--valoracion-5)",
];

export const ESCALA_MAX = 5;

/**
 * Etiquetas de la escala de valoración 1→5. Todas las preguntas actuales son
 * del tipo "Nivel en que…", por lo que aplica una escala de grado. Si alguna
 * pregunta usara otra escala, basta con ajustar este mapa; el número siempre
 * se muestra junto a la etiqueta, así que la lectura sigue siendo correcta.
 */
export const ETIQUETAS_ESCALA: Record<number, string> = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy alto",
};

/** Etiqueta de nivel para un valor entero 1→5; null para promedios decimales (p. ej. 3,89). */
function etiquetaEscala(valorNumerico: number): string | null {
  return Number.isInteger(valorNumerico) ? (ETIQUETAS_ESCALA[valorNumerico] ?? null) : null;
}

/** Mapea un valor de valoración a un paso de la rampa ordinal (1→5), redondeando outliers decimales. */
function colorPorValor(valorNumerico: number): string {
  const paso = Math.min(Math.max(Math.round(valorNumerico), 1), 5);
  return PASOS_VALORACION[paso - 1];
}

export function DistribucionValoracion({ pregunta }: { pregunta: PreguntaValoracion }) {
  // Etiquetas de nivel ("Muy alto"…) solo si el gráfico es Likert (valores
  // enteros); si son promedios decimales se muestra únicamente el puntaje.
  const esLikert = esDistribucionLikert(pregunta.distribucion);
  const datos = pregunta.distribucion.map((op) => ({
    nombre: op.valor,
    valor: op.cantidad,
    porcentaje: op.porcentaje,
    color: colorPorValor(op.valorNumerico),
    etiqueta: esLikert ? etiquetaEscala(op.valorNumerico) : null,
  }));
  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <h3 className="text-[13px] font-semibold leading-snug text-foreground">{pregunta.pregunta}</h3>
      <div className="flex flex-row items-center gap-4">
        <div className="relative mx-auto h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datos}
                dataKey="valor"
                nameKey="nombre"
                innerRadius="62%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={datos.length > 1 ? 1.5 : 0}
                cornerRadius={3}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {datos.map((d) => (
                  <Cell key={d.nombre} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                wrapperStyle={{ zIndex: 50 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof datos)[number];
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium text-popover-foreground">
                        {d.etiqueta ? `${d.etiqueta} · ` : ""}
                        {d.nombre} de {ESCALA_MAX}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {formatNumero(d.valor)} <TextoEditorial id="82107f44e4caf9215606" original={"personas ·"}/>{formatPorcentaje(d.porcentaje)}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
            <span className="font-heading text-xl font-bold tabular-nums text-foreground">{formatNumero(total)}</span>
            <span className="text-[10px] text-muted-foreground"><TextoEditorial id="1f50c619b6a0b48adfe8" original={"respuestas"}/></span>
          </div>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-1.5 self-stretch">
          {datos.map((d) => (
            <li key={d.nombre} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
              <span className="min-w-0 font-medium text-foreground">
                {d.etiqueta ? (
                  <>
                    {d.etiqueta}{" "}
                    <span className="font-normal tabular-nums text-muted-foreground">
                      ({d.nombre}/{ESCALA_MAX})
                    </span>
                  </>
                ) : (
                  <span className="tabular-nums">
                    {d.nombre}/{ESCALA_MAX}
                  </span>
                )}
              </span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{formatNumero(d.valor)}</span>
              <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-foreground">
                {formatPorcentaje(d.porcentaje)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
