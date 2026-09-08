"use client";

import { useId, useState } from "react";
import type { BarShapeProps } from "recharts";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";

export interface RankedBarDatum {
  etiqueta: string;
  conteo: number;
  porcentaje: number;
}

interface RankedBarChartProps {
  datos: RankedBarDatum[];
  titulo: string;
  descripcion?: string;
  colores?: string[]; // opcional: paleta categórica. Por defecto, un solo verde institucional (estilo reporte).
  alturaFila?: number;
  truncarEn?: number;
  ocultarAccion?: boolean;
  // Si se pasa (0–1), el gráfico muestra solo las barras que cubren esa
  // fracción del total y esconde la cola tras un botón "Ver todo". La tabla
  // ("Ver tabla") siempre muestra el 100%.
  coberturaColapsada?: number;
  // Si se pasa, las barras se vuelven clickeables: click alterna la selección
  // (clickear la barra activa la deselecciona). etiquetaSeleccionada resalta
  // la barra activa y atenúa las demás.
  onSeleccionarBarra?: (etiqueta: string) => void;
  etiquetaSeleccionada?: string | null;
}

const ALTURA_LINEA = 12;
const MAX_LINEAS = 6;

// Envuelve el texto en varias líneas por palabra completa, en vez de cortarlo con "...".
function envolverEtiqueta(texto: string, maxCaracteres: number, maxLineas = MAX_LINEAS): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    const candidato = actual ? `${actual} ${palabra}` : palabra;
    if (candidato.length > maxCaracteres && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidato;
    }
  }
  if (actual) lineas.push(actual);

  if (lineas.length > maxLineas) {
    const resto = lineas.slice(maxLineas - 1).join(" ");
    const recortadas = lineas.slice(0, maxLineas - 1);
    recortadas.push(resto.length > maxCaracteres ? `${resto.slice(0, maxCaracteres - 1)}…` : resto);
    return recortadas;
  }
  return lineas;
}

function EtiquetaEjeMultilinea({
  x,
  y,
  payload,
  maxCaracteres,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxCaracteres: number;
}) {
  if (x === undefined || y === undefined || !payload) return null;
  const lineas = envolverEtiqueta(payload.value, maxCaracteres);
  const offsetInicial = 4 - ((lineas.length - 1) * ALTURA_LINEA) / 2;
  return (
    <text x={x} y={y} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
      {lineas.map((linea, i) => (
        <tspan key={`${i}-${linea}`} x={x} dy={i === 0 ? offsetInicial : ALTURA_LINEA}>
          {linea}
        </tspan>
      ))}
    </text>
  );
}

export function RankedBarChart({
  datos,
  titulo,
  descripcion,
  colores,
  alturaFila = 32,
  truncarEn = 26,
  ocultarAccion = false,
  coberturaColapsada,
  onSeleccionarBarra,
  etiquetaSeleccionada,
}: RankedBarChartProps) {
  const [vistaTabla, setVistaTabla] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const id = useId();
  const ordenados = [...datos].sort((a, b) => b.conteo - a.conteo);
  const esClickeable = Boolean(onSeleccionarBarra);

  // Cuántas barras hacen falta para cubrir la fracción pedida del total. La
  // barra activa por un filtro siempre se muestra, aunque quede en la cola.
  const totalConteo = ordenados.reduce((suma, d) => suma + d.conteo, 0);
  let cuantasVisibles = ordenados.length;
  if (
    coberturaColapsada != null &&
    coberturaColapsada > 0 &&
    coberturaColapsada < 1 &&
    totalConteo > 0
  ) {
    let acumulado = 0;
    cuantasVisibles = 0;
    for (const d of ordenados) {
      acumulado += d.conteo;
      cuantasVisibles += 1;
      if (acumulado / totalConteo >= coberturaColapsada) break;
    }
    const iSeleccionada = etiquetaSeleccionada
      ? ordenados.findIndex((d) => d.etiqueta === etiquetaSeleccionada)
      : -1;
    if (iSeleccionada >= cuantasVisibles) cuantasVisibles = iSeleccionada + 1;
  }
  const hayColapso = cuantasVisibles < ordenados.length;
  const visibles = hayColapso && !expandido ? ordenados.slice(0, cuantasVisibles) : ordenados;

  const maxLineas = Math.max(
    1,
    ...visibles.map((d) => envolverEtiqueta(d.etiqueta, truncarEn).length)
  );
  const filaAltura = Math.max(alturaFila, maxLineas * ALTURA_LINEA + 16);

  function barraRedondeada(props: BarShapeProps) {
    const { x, y, width, height, index } = props;
    const etiqueta = visibles[index ?? -1]?.etiqueta;
    const seleccionada = etiquetaSeleccionada === etiqueta;
    const atenuada = esClickeable && etiquetaSeleccionada != null && !seleccionada;
    const fill = colores ? colores[index % colores.length] : "var(--primary)";
    return (
      <rect
        x={x}
        y={y}
        width={Math.max(width, 1)}
        height={height}
        rx={3}
        ry={3}
        fill={fill}
        opacity={atenuada ? 0.35 : 1}
        style={esClickeable ? { cursor: "pointer" } : undefined}
        onClick={esClickeable && etiqueta ? () => onSeleccionarBarra!(etiqueta) : undefined}
      />
    );
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex h-full flex-col gap-2">
      {titulo || !ocultarAccion ? (
        <div className="flex items-start justify-between gap-2">
          {titulo ? (
            <h3 id={`${id}-titulo`} className="text-[13px] font-semibold leading-tight text-foreground">
              {titulo}
            </h3>
          ) : (
            <span />
          )}
          {!ocultarAccion ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setVistaTabla((v) => !v)}
              aria-pressed={vistaTabla}
              aria-label={vistaTabla ? "Ver gráfico" : "Ver tabla"}
              title={vistaTabla ? "Ver gráfico" : "Ver tabla"}
            >
              {vistaTabla ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
            </Button>
          ) : null}
        </div>
      ) : null}

      {vistaTabla ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opción</TableHead>
              <TableHead className="text-right">Respuestas</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((d) => (
              <TableRow key={d.etiqueta}>
                <TableCell className="max-w-md">{d.etiqueta}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumero(d.conteo)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPorcentaje(d.porcentaje)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col gap-1.5">
        <div style={{ height: Math.max(visibles.length * filaAltura, 90) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={visibles}
              layout="vertical"
              margin={{ top: 2, right: 40, bottom: 2, left: 2 }}
              barCategoryGap={6}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="etiqueta"
                width={truncarEn * 6}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={<EtiquetaEjeMultilinea maxCaracteres={truncarEn} />}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ zIndex: 20 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as RankedBarDatum;
                  return (
                    <div className="max-w-[200px] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium break-words text-popover-foreground">{d.etiqueta}</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatNumero(d.conteo)} respuestas · {formatPorcentaje(d.porcentaje)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="conteo" shape={barraRedondeada} maxBarSize={18} isAnimationActive={false}>
                <LabelList
                  dataKey="conteo"
                  position="right"
                  formatter={(v: unknown) => formatNumero(Number(v ?? 0))}
                  className="fill-foreground text-[11px] font-semibold tabular-nums"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {hayColapso ? (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="self-start text-[11px] font-medium text-primary hover:underline"
          >
            {expandido
              ? "Ver menos"
              : `Ver todo (${ordenados.length})`}
          </button>
        ) : null}
        </div>
      )}
    </section>
  );
}
