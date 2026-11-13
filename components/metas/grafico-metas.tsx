"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumero, formatPorcentajeMetas } from "@/lib/formatters";
import type { TablaMeta } from "@/types/metas";

interface DatoGrupo {
  id: string;
  titulo: string;
  si: number;
  no: number;
  total: number;
  porcentaje: number;
}

const ALTURA_LINEA = 12;
const MAX_LINEAS = 3;
const MAX_CARACTERES_ETIQUETA = 22;

function envolverEtiqueta(texto: string, maxCaracteres: number): string[] {
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
  return lineas.slice(0, MAX_LINEAS);
}

function EtiquetaGrupo({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (x === undefined || y === undefined || !payload) return null;
  const lineas = envolverEtiqueta(payload.value, MAX_CARACTERES_ETIQUETA);
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

interface EtiquetaTotalProps {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  index?: number;
}

function crearEtiquetaTotal(datos: DatoGrupo[]) {
  return function EtiquetaTotal({ x, y, width, height, index }: EtiquetaTotalProps) {
    if (x == null || y == null || width == null || height == null || index == null) return null;
    const d = datos[index];
    if (!d) return null;
    const px = Number(x);
    const py = Number(y);
    const pw = Number(width);
    const ph = Number(height);
    return (
      <text x={px + pw + 8} y={py + ph / 2} dy={4} fontSize={11}>
        <tspan fontWeight={600} fill="var(--foreground)">
          {formatNumero(d.total)}
        </tspan>
        <tspan fill="var(--muted-foreground)"> · {formatPorcentajeMetas(d.porcentaje)}</tspan>
      </text>
    );
  };
}

/**
 * Un solo gráfico de barras apiladas con los 5 grupos de metas: el largo
 * total de cada barra es el universo del grupo y el segmento verde es cuántas
 * personas completaron el diagnóstico (Sí), el naranja las que no registran
 * participación (No) — así se lee el total y la participación de cada grupo
 * en una sola vista comparativa.
 */
export function GraficoMetas({ tablas }: { tablas: TablaMeta[] }) {
  const datos: DatoGrupo[] = tablas
    .map((t) => {
      const no = t.filas.reduce((acc, f) => acc + f.no, 0);
      const si = t.filas.reduce((acc, f) => acc + f.si, 0);
      const total = no + si;
      return { id: t.id, titulo: t.titulo, si, no, total, porcentaje: total > 0 ? (si / total) * 100 : 0 };
    })
    .sort((a, b) => b.total - a.total);

  const EtiquetaTotal = crearEtiquetaTotal(datos);

  return (
    <Card className="py-3">
      <CardHeader className="px-3.5 pb-1">
        <CardTitle className="text-[13px]"><TextoEditorial id="737b24c92bba858b371a" original={"Participación por grupo"}/></CardTitle>
        <CardDescription className="text-[11px]">
          <TextoEditorial id="b6084dd0d073bb198d69" original={"Total de personas de cada grupo y cuántas completaron el diagnóstico."}/></CardDescription>
      </CardHeader>
      <CardContent className="px-3.5">
        <div style={{ height: datos.length * 56 + 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datos}
              layout="vertical"
              margin={{ top: 4, right: 88, bottom: 4, left: 4 }}
              barCategoryGap={18}
            >
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="titulo"
                width={150}
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={<EtiquetaGrupo />}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ zIndex: 20 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DatoGrupo;
                  return (
                    <div className="max-w-55 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium wrap-break-word text-popover-foreground">{d.titulo}</p>
                      <p className="mt-1 text-muted-foreground">
                        <TextoEditorial id="d93e38fe92665beaea21" original={"Total:"}/><span className="font-semibold text-popover-foreground">{formatNumero(d.total)}</span>
                      </p>
                      <p style={{ color: "var(--estado-finalizado)" }}>
                        Sí: {formatNumero(d.si)} ({formatPorcentajeMetas(d.porcentaje)})
                      </p>
                      <p style={{ color: "var(--estado-pendiente)" }}>No: {formatNumero(d.no)}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="si"
                stackId="total"
                fill="var(--estado-finalizado)"
                radius={[4, 0, 0, 4]}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={22}
                isAnimationActive={false}
              />
              <Bar
                dataKey="no"
                stackId="total"
                fill="var(--estado-pendiente)"
                radius={[0, 4, 4, 0]}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={22}
                isAnimationActive={false}
              >
                <LabelList content={EtiquetaTotal} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: "var(--estado-finalizado)" }} aria-hidden />
            <TextoEditorial id="4e48fbe54aadb8ed9168" original={"Sí — completó el diagnóstico"}/></span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: "var(--estado-pendiente)" }} aria-hidden />
            <TextoEditorial id="e65c994b7934b2d1871e" original={"No — sin participación"}/></span>
        </div>
      </CardContent>
    </Card>
  );
}
