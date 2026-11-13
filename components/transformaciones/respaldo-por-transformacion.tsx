"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { OPCIONES_RESPALDO, type OpcionRespaldo } from "@/lib/reglas/momento4";

export interface FilaRespaldo {
  transformacion: string;
  etiqueta: string;
  total: number;
  conteos: Record<OpcionRespaldo, number>;
}

/**
 * Cómo se reparte el respaldo dentro de cada transformación. Barras apiladas y
 * no cinco anillos: el interés está en comparar transformaciones entre sí, y
 * apiladas comparten una misma línea base horizontal, que es lo que permite
 * esa comparación de un vistazo.
 *
 * Se apila el conteo y no el porcentaje a propósito: con volúmenes muy
 * distintos por transformación, un 100% apilado haría ver igual de "grande"
 * una transformación con 3 respuestas y otra con 300. El porcentaje sí aparece
 * en el tooltip, donde no engaña.
 */
export function RespaldoPorTransformacion({ filas }: { filas: FilaRespaldo[] }) {
  // Solo las opciones presentes: una serie que siempre vale 0 llenaría la
  // leyenda de ruido.
  const opciones = OPCIONES_RESPALDO.filter((opcion) =>
    filas.some((fila) => (fila.conteos[opcion.id] ?? 0) > 0)
  );

  // Una columna por opción, plana: recharts apila leyendo una clave por serie.
  type Dato = Record<OpcionRespaldo, number> & { etiqueta: string; total: number };
  const datos: Dato[] = filas.map((fila) => ({
    etiqueta: fila.etiqueta,
    total: fila.total,
    si: fila.conteos.si ?? 0,
    parcialmente: fila.conteos.parcialmente ?? 0,
    no: fila.conteos.no ?? 0,
    otra: fila.conteos.otra ?? 0,
  }));

  if (opciones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        <TextoEditorial id="248f1ee9324cc28494bb" original={"No hay respuestas con los filtros aplicados."}/></p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div style={{ height: Math.max(datos.length * 44, 140) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 2, right: 16, bottom: 2, left: 2 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="etiqueta"
              width={168}
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              wrapperStyle={{ zIndex: 20 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const fila = payload[0].payload as Dato;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-popover-foreground">{String(label)}</p>
                    <p className="mb-1.5 text-muted-foreground">
                      {formatNumero(fila.total)} <TextoEditorial id="e021b284144193fecf48" original={"respuestas"}/></p>
                    {opciones.map((opcion) => {
                      const valor = Number(fila[opcion.id] ?? 0);
                      if (valor === 0) return null;
                      return (
                        <p key={opcion.id} className="flex items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: opcion.color }}
                            aria-hidden
                          />
                          <span className="text-popover-foreground">{opcion.etiqueta}</span>
                          <span className="ml-auto pl-3 tabular-nums text-muted-foreground">
                            {formatNumero(valor)} · {formatPorcentaje((valor / fila.total) * 100)}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            {opciones.map((opcion, indice) => (
              <Bar
                key={opcion.id}
                dataKey={opcion.id}
                stackId="respaldo"
                fill={opcion.color}
                maxBarSize={22}
                isAnimationActive={false}
                // El borde del color de la tarjeta abre una separación de 2 px
                // entre segmentos, para que dos tonos vecinos de la misma rampa
                // no se lean como uno solo.
                stroke="var(--card)"
                strokeWidth={2}
                radius={indice === opciones.length - 1 ? [0, 4, 4, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {opciones.map((opcion) => (
          <li key={opcion.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: opcion.color }}
              aria-hidden
            />
            {opcion.etiqueta}
          </li>
        ))}
      </ul>
    </div>
  );
}
