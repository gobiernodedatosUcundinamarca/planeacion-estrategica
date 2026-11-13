"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { OPCIONES_RESPALDO, type OpcionRespaldo } from "@/lib/reglas/momento4";

/**
 * Distribución de "¿Consideran que esta transformación responde a lo que la
 * UCundinamarca necesita?". Es una escala de grado (Sí › Parcialmente › No),
 * así que se pinta con la rampa ordinal del proyecto y se mantiene ese orden
 * fijo: reordenar por tamaño rompería la lectura de la escala.
 *
 * El anillo lleva su propia lista de opciones al lado en vez de una leyenda
 * suelta — así el nombre, el conteo y el porcentaje se leen juntos, sin tener
 * que emparejar colores de memoria.
 */
export function DistribucionRespaldo({ conteos }: { conteos: Record<OpcionRespaldo, number> }) {
  const datos = OPCIONES_RESPALDO.map((opcion) => ({
    id: opcion.id,
    etiqueta: opcion.etiqueta,
    color: opcion.color,
    valor: conteos[opcion.id] ?? 0,
  })).filter((d) => d.valor > 0);

  const total = datos.reduce((suma, d) => suma + d.valor, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        <TextoEditorial id="eb7d9df66df71a240c95" original={"No hay respuestas con los filtros aplicados."}/></p>
    );
  }

  return (
    <div className="flex flex-row items-center gap-4">
      <div className="relative h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="etiqueta"
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
                <Cell key={d.id} fill={d.color} />
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
                    <p className="font-medium text-popover-foreground">{d.etiqueta}</p>
                    <p className="mt-1 text-muted-foreground">
                      {formatNumero(d.valor)} <TextoEditorial id="9a976d24d71085db6ddc" original={"respuestas ·"}/>{" "}
                      {formatPorcentaje((d.valor / total) * 100)}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-xl font-bold tabular-nums text-foreground">
            {formatNumero(total)}
          </span>
          <span className="text-[10px] text-muted-foreground"><TextoEditorial id="efe9dcada51b4f1c46c6" original={"respuestas"}/></span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {datos.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: d.color }}
              aria-hidden
            />
            <span className="min-w-0 truncate font-medium text-foreground">{d.etiqueta}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {formatNumero(d.valor)}
            </span>
            <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-foreground">
              {formatPorcentaje((d.valor / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
