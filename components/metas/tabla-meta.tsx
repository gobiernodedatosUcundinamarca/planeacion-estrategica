"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { Search, BookOpen, Building2, MapPin, Users, GraduationCap, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatNumero, formatPorcentajeMetas } from "@/lib/formatters";
import type { TablaMeta, TablaMetaId } from "@/types/metas";

const UMBRAL_BUSCADOR = 12;

const ICONO_TABLA: Record<TablaMetaId, LucideIcon> = {
  gca: BookOpen,
  administrativosContrato: Building2,
  administrativosSede: MapPin,
  estudiantes: Users,
  graduados: GraduationCap,
};

const ETIQUETA_PARTICIPACION = {
  no: "No",
  si: "Sí",
} as const;

const DESCRIPCION_PARTICIPACION = {
  no: "No: no registra participación en el diagnóstico.",
  si: "Sí: completó el diagnóstico.",
} as const;

/**
 * Celda de las columnas No/Sí con tooltip explicativo. Se usa `render`
 * (en vez del `<button>` por defecto de TooltipTrigger) para no convertir
 * cada celda en un tab-stop — con tablas de hasta 80+ filas, cientos de
 * botones enfocables romperían la navegación por teclado.
 */
function CeldaParticipacion({
  tipo,
  valor,
  className,
}: {
  tipo: "no" | "si";
  valor: number;
  className?: string;
}) {
  return (
    <TableCell className={className}>
      <Tooltip>
        <TooltipTrigger render={<span />} className="cursor-help decoration-dotted underline-offset-2 hover:underline">
          {formatNumero(valor)}
        </TooltipTrigger>
        <TooltipContent>{DESCRIPCION_PARTICIPACION[tipo]}</TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

export function TablaMetaCard({ tabla }: { tabla: TablaMeta }) {
  const [busqueda, setBusqueda] = useState("");
  const conBuscador = tabla.filas.length > UMBRAL_BUSCADOR;
  const Icono = ICONO_TABLA[tabla.id];

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tabla.filas;
    return tabla.filas.filter((f) => f.etiqueta.toLowerCase().includes(q));
  }, [busqueda, tabla.filas]);

  // Total agregado de lo actualmente visible (respeta el filtro de búsqueda);
  // el porcentaje es un promedio ponderado (SI / Total), no el promedio de
  // los porcentajes de cada fila.
  const totales = useMemo(() => {
    const no = filtradas.reduce((acc, f) => acc + f.no, 0);
    const si = filtradas.reduce((acc, f) => acc + f.si, 0);
    const total = no + si;
    return { no, si, total, porcentaje: total > 0 ? (si / total) * 100 : 0 };
  }, [filtradas]);

  const [primeraCol, segundaCol] = tabla.ordenColumnas;

  return (
    <Card className="gap-3 overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex-row items-center gap-2.5 border-b border-border bg-secondary/60 px-3.5 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icono className="size-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-[13px]">{tabla.titulo}</CardTitle>
          {tabla.subtitulo ? <CardDescription className="text-[11px]">{tabla.subtitulo}</CardDescription> : null}
        </div>
      </CardHeader>
      <CardContent className="px-3.5 pb-3.5">
        {conBuscador ? (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={`Buscar en ${tabla.columnaEtiqueta.toLowerCase()}…`}
              className="h-8 pl-8 text-xs"
              aria-label={`Buscar en ${tabla.columnaEtiqueta}`}
            />
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-md border border-border",
            // El wrapper propio de <Table> ya trae overflow-x-auto; si además
            // envolvemos con overflow-y-auto en un div distinto, el navegador
            // ancla el `sticky` al contenedor interno (que nunca se desplaza)
            // y no al externo. Se aplica el scroll vertical directamente sobre
            // ese wrapper interno (vía [data-slot=table-container]) para que
            // sea un único contenedor de scroll y el sticky funcione.
            conBuscador && "[&_[data-slot=table-container]]:max-h-[360px] [&_[data-slot=table-container]]:overflow-y-auto"
          )}
        >
          <Table>
            <TableHeader className={cn("bg-primary", conBuscador && "sticky top-0 z-10")}>
              <TableRow className="border-none hover:bg-primary">
                <TableHead className="text-[11px] text-primary-foreground">{tabla.columnaEtiqueta}</TableHead>
                <TableHead className="text-right text-[11px] text-primary-foreground uppercase">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help bg-transparent p-0 font-inherit text-inherit uppercase decoration-dotted underline-offset-2 hover:underline">
                      {ETIQUETA_PARTICIPACION[primeraCol]}
                    </TooltipTrigger>
                    <TooltipContent>{DESCRIPCION_PARTICIPACION[primeraCol]}</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-right text-[11px] text-primary-foreground uppercase">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help bg-transparent p-0 font-inherit text-inherit uppercase decoration-dotted underline-offset-2 hover:underline">
                      {ETIQUETA_PARTICIPACION[segundaCol]}
                    </TooltipTrigger>
                    <TooltipContent>{DESCRIPCION_PARTICIPACION[segundaCol]}</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-right text-[11px] text-primary-foreground"><TextoEditorial id="3b58b5f5756812f7857f" original={"Total"}/></TableHead>
                <TableHead className="text-right text-[11px] text-primary-foreground"><TextoEditorial id="c1cd15d5a464b55dd82c" original={"Porcentaje"}/></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.map((f, i) => (
                <TableRow
                  key={`${f.etiqueta}-${i}`}
                  className={i % 2 === 1 ? "bg-muted/40 hover:bg-muted" : "hover:bg-muted/60"}
                >
                  <TableCell className="max-w-[280px] text-[12px] leading-snug whitespace-normal">
                    {f.etiqueta}
                  </TableCell>
                  <CeldaParticipacion
                    tipo={primeraCol}
                    valor={primeraCol === "no" ? f.no : f.si}
                    className="text-right text-[12px] tabular-nums"
                  />
                  <CeldaParticipacion
                    tipo={segundaCol}
                    valor={segundaCol === "no" ? f.no : f.si}
                    className="text-right text-[12px] tabular-nums"
                  />
                  <TableCell className="text-right text-[12px] font-semibold tabular-nums">
                    {formatNumero(f.total)}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-semibold tabular-nums">
                    {formatPorcentajeMetas(f.porcentaje)}
                  </TableCell>
                </TableRow>
              ))}
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-[12px] text-muted-foreground">
                    No hay resultados que coincidan con la búsqueda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
            {filtradas.length > 0 ? (
              <TableFooter className={cn("border-t-2 border-t-primary bg-secondary", conBuscador && "sticky bottom-0 z-10")}>
                <TableRow className="hover:bg-secondary">
                  <TableCell className="text-[12px] font-bold text-secondary-foreground">Total</TableCell>
                  <CeldaParticipacion
                    tipo={primeraCol}
                    valor={primeraCol === "no" ? totales.no : totales.si}
                    className="text-right text-[12px] font-bold tabular-nums text-secondary-foreground"
                  />
                  <CeldaParticipacion
                    tipo={segundaCol}
                    valor={segundaCol === "no" ? totales.no : totales.si}
                    className="text-right text-[12px] font-bold tabular-nums text-secondary-foreground"
                  />
                  <TableCell className="text-right text-[12px] font-bold tabular-nums text-secondary-foreground">
                    {formatNumero(totales.total)}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-bold tabular-nums text-foreground">
                    {formatPorcentajeMetas(totales.porcentaje)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
        {conBuscador ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {filtradas.length} de {tabla.filas.length} <TextoEditorial id="b8fea8092b6a4484d05b" original={"filas"}/></p>
        ) : null}
      </CardContent>
    </Card>
  );
}
