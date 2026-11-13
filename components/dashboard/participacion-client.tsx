"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { SedeBarList } from "@/components/charts/sede-bar-list";
import { FilterBar } from "@/components/layout/filter-bar";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { ETIQUETA_ROL_CORTA } from "@/constants/marca";
import type { Rol } from "@/types/encuesta";
import { useResumenFiltrado, type ResumenFiltrado } from "@/hooks/use-resumen-filtrado";

export interface ParticipacionEstatico {
  combinaciones: { combinacion: string; conteo: number }[];
  conteoFacultad: { facultad: string; conteo: number }[];
}

export function ParticipacionClient({
  inicial,
  estatico,
}: {
  inicial: ResumenFiltrado;
  estatico: ParticipacionEstatico;
}) {
  const { data, hayFiltros, isFetching } = useResumenFiltrado();
  const resumen = hayFiltros && data ? data : inicial;
  const { kpis, distribucionRol, distribucionSede } = resumen;
  const { combinaciones, conteoFacultad } = estatico;

  const rolDatos = Object.entries(distribucionRol)
    .map(([rol, conteo]) => ({
      etiqueta: ETIQUETA_ROL_CORTA[rol as Rol] ?? rol,
      conteo,
      porcentaje: Math.round((conteo / (kpis.totalAsignacionesRol || 1)) * 1000) / 10,
    }))
    .sort((a, b) => b.conteo - a.conteo);

  const totalFacultades = conteoFacultad.reduce((acc, f) => acc + f.conteo, 0) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            <TextoEditorial id="f4a27580bd79946caefb" original={"Quién participó — Diagnóstico: Tu Voz Fundamental"}/></h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <TextoEditorial id="6aa2cfa0f4d8dae4675d" original={"Composición de los"}/>{formatNumero(kpis.totalParticipantes)} <TextoEditorial id="faf0abdc35be63779da2" original={"participantes por rol, sede y facultad"}/>{isFetching ? (
              <Loader2 className="ml-1.5 inline size-3 animate-spin align-[-2px] text-primary" aria-label="Actualizando" />
            ) : null}
          </p>
        </div>
        <FilterBar />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="py-3">
          <CardHeader className="px-3.5 pb-1">
            <CardTitle className="text-[13px]"><TextoEditorial id="c37a2957791787e5768c" original={"Distribución por rol (completo)"}/></CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <RankedBarChart titulo="" datos={rolDatos} alturaFila={38} truncarEn={30} ocultarAccion />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardHeader className="px-3.5 pb-1">
            <CardTitle className="text-[13px]"><TextoEditorial id="6812968d8979788e7206" original={"Distribución por sede"}/></CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <SedeBarList distribucion={distribucionSede} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="py-3">
          <CardHeader className="px-3.5 pb-1">
            <CardTitle className="text-[13px]"><TextoEditorial id="c32baa26e5b9aa10fd16" original={"Combinaciones de multi-rol"}/></CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {formatNumero(kpis.personasConMultiRol)} <TextoEditorial id="e2d0ae6dbbcc40438be3" original={"personas ("}/>{formatPorcentaje(Math.round((kpis.personasConMultiRol / (kpis.totalParticipantes || 1)) * 1000) / 10)}
              <TextoEditorial id="3992a47a35d1f3c3aeb0" original={") tienen más de un rol simultáneo."}/></p>
          </CardHeader>
          <CardContent className="overflow-x-auto px-3.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><TextoEditorial id="f14ec6236da45016e323" original={"Combinación de roles"}/></TableHead>
                  <TableHead className="text-right"><TextoEditorial id="1e0e71af54427fbbd42c" original={"Personas"}/></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinaciones.map((c) => (
                  <TableRow key={c.combinacion}>
                    <TableCell className="text-[13px]">{c.combinacion}</TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">{formatNumero(c.conteo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardHeader className="px-3.5 pb-1">
            <CardTitle className="text-[13px]"><TextoEditorial id="8450f5037fd18cf716dc" original={"Participantes por facultad"}/></CardTitle>
            <p className="text-[11px] text-muted-foreground"><TextoEditorial id="50ef199b9290cf28be90" original={"Solo aplica a roles con vínculo académico."}/></p>
          </CardHeader>
          <CardContent className="px-3.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><TextoEditorial id="a350c980f28f5e1e0238" original={"Facultad"}/></TableHead>
                  <TableHead className="text-right"><TextoEditorial id="1e0e71af54427fbbd42c" original={"Personas"}/></TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conteoFacultad.map((f) => (
                  <TableRow key={f.facultad}>
                    <TableCell className="text-[13px]">{f.facultad}</TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">{formatNumero(f.conteo)}</TableCell>
                    <TableCell className="text-right text-[13px] tabular-nums">
                      {formatPorcentaje((f.conteo / totalFacultades) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
