"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight, MousePointerClick } from "lucide-react";
import { formatPorcentaje } from "@/lib/formatters";

interface DonutAvanceProps {
  avanceGeneral: number;
  totalFinalizados: number;
  totalNoFinalizados: number;
  onVerDetalle: () => void;
}

const COLOR_FINALIZADO = "var(--estado-finalizado)";
const COLOR_PENDIENTE = "var(--estado-pendiente)";

export function DonutAvance({
  avanceGeneral,
  totalFinalizados,
  totalNoFinalizados,
  onVerDetalle,
}: DonutAvanceProps) {
  const datos = [
    { nombre: "Finalizado", valor: totalFinalizados, color: COLOR_FINALIZADO },
    { nombre: "No finalizado", valor: totalNoFinalizados, color: COLOR_PENDIENTE },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onVerDetalle}
        aria-label={`Avance general ${formatPorcentaje(avanceGeneral)}. Ver detalle por actividad`}
        className="group relative mx-auto block h-72 w-72 cursor-pointer rounded-full outline-none transition-transform hover:scale-[1.02] focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_*]:cursor-pointer!"
      >
        {/* Etiqueta flotante: llama la atención hacia el clic y se retira apenas
            el usuario pasa el mouse (ya no hace falta el aviso). */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 right-4 z-10 inline-flex animate-bounce items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-primary-foreground shadow-md transition-opacity duration-200 group-hover:opacity-0"
        >
          <MousePointerClick className="size-3" aria-hidden />
          Clic para ver detalle
        </span>
        {/* initialDimension evita el aviso "width(-1)/height(-1)" de recharts:
            en el primer render (SSR y antes de que el ResizeObserver mida) el
            contenedor no tiene tamaño. Coincide con h-72/w-72 = 288px, así que
            el gráfico se dibuja ya del tamaño final, sin salto. */}
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 288, height: 288 }}>
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="nombre"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={1}
              cornerRadius={4}
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
              content={({ active, payload }) => {
                const total = totalFinalizados + totalNoFinalizados;
                return active && payload?.length && total > 0 ? (
                  <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <span className="font-medium">{payload[0].name}</span>:{" "}
                    <span className="tabular-nums">
                      {formatPorcentaje((Number(payload[0].value) / total) * 100)}
                    </span>
                  </div>
                ) : null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Cifra central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-5xl font-bold tabular-nums text-foreground">
            {formatPorcentaje(avanceGeneral)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">avance general</span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
            Ver detalle por actividad
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </button>

      {/* Leyenda con etiquetas directas (requisito de contraste de la paleta) */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: COLOR_FINALIZADO }} aria-hidden />
          <span className="text-muted-foreground"><TextoEditorial id="3bac99a0ccd02a77f583" original={"Finalizado"}/></span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: COLOR_PENDIENTE }} aria-hidden />
          <span className="text-muted-foreground"><TextoEditorial id="a248220c0aef6d7df5c2" original={"No finalizado"}/></span>
        </span>
      </div>
    </div>
  );
}
