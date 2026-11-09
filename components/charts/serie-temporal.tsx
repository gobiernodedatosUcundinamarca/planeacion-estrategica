"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumero } from "@/lib/formatters";

export interface PuntoSerie {
  /** Clave ISO ("aaaa-mm-dd"), para poder ordenar cronológicamente. */
  fecha: string;
  /** Texto ya formateado para el eje y el tooltip. */
  etiqueta: string;
  valor: number;
  /**
   * Contexto del punto para el tooltip (dónde fue la jornada, de qué unidades
   * venían…). Cada bloque es un título y sus líneas, ya formateadas: el
   * gráfico no sabe de qué sección viene, solo las pinta.
   */
  detalles?: { titulo: string; lineas: string[] }[];
}

const formatoFechaLarga = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" });

/**
 * Serie de área en el tiempo, para ver una tendencia día a día. Reutilizable:
 * hoy la usa Participación para el seguimiento de asistencia entre tandas, y
 * es el mismo patrón visual que `tablero-uso.tsx` usa para las visitas.
 */
export function SerieTemporal({
  datos,
  nombreValor = "registros",
}: {
  datos: PuntoSerie[];
  nombreValor?: string;
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="degradado-serie-temporal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          {/* 48 px y no menos: el eje recorta la etiqueta por la izquierda si
              no cabe, y con marcas de tres cifras ("100", "200") se veía solo
              el último carácter — una columna de ceros donde había centenas. */}
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PuntoSerie;
              return (
                <div className="max-w-xs rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-popover-foreground">
                    {formatoFechaLarga.format(new Date(`${d.fecha}T12:00:00`))}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {formatNumero(d.valor)} {nombreValor}
                  </p>
                  {d.detalles?.map((bloque) => (
                    <div key={bloque.titulo} className="mt-2 border-t border-border pt-1.5">
                      <p className="font-medium text-popover-foreground">{bloque.titulo}</p>
                      {bloque.lineas.map((linea) => (
                        <p key={linea} className="text-muted-foreground">
                          {linea}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {/* `linear` y no `monotone`: la curva suave sobrepasa los datos para
              redondear los giros, y con jornadas de 67, 411 y 28 asistentes
              dibujaba un máximo de ~430 que nunca ocurrió. El punto marca los
              días que sí se midieron, porque entre una jornada y la siguiente
              pueden pasar semanas sin ninguna. */}
          <Area
            type="linear"
            dataKey="valor"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#degradado-serie-temporal)"
            isAnimationActive={false}
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
