"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { coincideBusqueda } from "@/lib/buscar";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { derivarParticipantes, numeroActividad, UMBRAL_REINCIDENCIA } from "@/lib/participantes";
import { MiniPastel } from "@/components/seguimiento/mini-pastel";
import type { CaiData } from "@/types/cai";

export function MatrizParticipantes({ datos }: { datos: CaiData }) {
  const resumen = useMemo(() => derivarParticipantes(datos), [datos]);
  const [busqueda, setBusqueda] = useState("");

  // Arrastre con el mouse para desplazar la matriz horizontalmente
  const contenedorRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef<{ x: number; scroll: number } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const iniciarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !contenedorRef.current) return;
    arrastreRef.current = { x: e.clientX, scroll: contenedorRef.current.scrollLeft };
    contenedorRef.current.setPointerCapture(e.pointerId);
  };

  const moverArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastreRef.current || !contenedorRef.current) return;
    const delta = e.clientX - arrastreRef.current.x;
    if (Math.abs(delta) > 3) setArrastrando(true);
    contenedorRef.current.scrollLeft = arrastreRef.current.scroll - delta;
  };

  const terminarArrastre = () => {
    arrastreRef.current = null;
    setArrastrando(false);
  };

  const filtrados = useMemo(
    () => resumen.participantes.filter((p) => coincideBusqueda(busqueda, p.nombre, p.correo)),
    [resumen.participantes, busqueda]
  );

  // Grupos de columnas por momento, preservando el orden de las actividades
  const grupos = useMemo(() => {
    const lista: { etiqueta: string; cantidad: number }[] = [];
    for (const actividad of datos.actividades) {
      const ultimo = lista[lista.length - 1];
      if (ultimo && ultimo.etiqueta === actividad.etiquetaMomento) ultimo.cantidad += 1;
      else lista.push({ etiqueta: actividad.etiquetaMomento, cantidad: 1 });
    }
    return lista;
  }, [datos.actividades]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base"><TextoEditorial id="8f959dd56dd431ba3d57" original={"Detalle por participante"}/></CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              <TextoEditorial id="4ca46e4848c8bc6ab44e" original={"✓ actividad finalizada · ✗ no finalizada · reincidente ="}/>{UMBRAL_REINCIDENCIA} <TextoEditorial id="bf9c6ddb130f7690508e" original={"o más actividades sin finalizar"}/></p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium"
              style={{
                borderColor: "color-mix(in srgb, var(--estado-pendiente) 40%, transparent)",
                background: "color-mix(in srgb, var(--estado-pendiente) 10%, transparent)",
              }}
            >
              <TextoEditorial id="845f9c45ec07cfd43b47" original={"Reincidentes:"}/>{" "}
              <span className="tabular-nums">
                {formatNumero(resumen.reincidentes)} ({formatPorcentaje(resumen.porcentajeReincidentes)})
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-secondary px-3 py-1 font-medium text-secondary-foreground">
              <TextoEditorial id="a44258e62028bf71dec6" original={"No reincidentes:"}/>{" "}
              <span className="tabular-nums">
                {formatNumero(resumen.noReincidentes)} ({formatPorcentaje(resumen.porcentajeNoReincidentes)})
              </span>
            </span>
          </div>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar participante…"
            aria-label="Buscar participante"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={contenedorRef}
          onPointerDown={iniciarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre}
          onPointerCancel={terminarArrastre}
          className={`overflow-x-auto rounded-lg border border-border ${
            arrastrando ? "cursor-grabbing select-none" : "cursor-grab"
          }`}
        >
          <table className="w-full min-w-[1500px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
                <th
                  scope="col"
                  rowSpan={2}
                  className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold"
                >
                  <TextoEditorial id="ef4ae3e0cb75975b0068" original={"Participante"}/></th>
                {grupos.map((g) => (
                  <th
                    key={g.etiqueta}
                    scope="colgroup"
                    colSpan={g.cantidad}
                    className="border-l border-border px-2 py-1.5 text-center font-semibold"
                  >
                    {g.etiqueta}
                  </th>
                ))}
                <th scope="col" rowSpan={2} className="border-l border-border px-3 py-2 text-right font-semibold">
                  <TextoEditorial id="2e0a3f38f58ae2b75b73" original={"% finalización"}/></th>
              </tr>
              <tr className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
                {datos.actividades.map((a) => {
                  const numero = numeroActividad(a.id);
                  const repetido = numero !== null && numero === a.nombre;
                  return (
                    <th
                      key={a.id}
                      scope="col"
                      title={a.tituloCompleto}
                      className="min-w-24 max-w-32 border-l border-border px-1.5 py-2 text-center align-bottom text-[11px] leading-snug font-medium whitespace-normal"
                    >
                      {numero ? (
                        <span className="block font-semibold text-foreground/80">{numero}</span>
                      ) : null}
                      {repetido ? null : a.nombre}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={datos.actividades.length + 2}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Sin coincidencias para “{busqueda}”
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.correo}
                    className="border-b border-border/60 last:border-b-0 hover:bg-secondary/40"
                    style={
                      p.reincidente
                        ? { background: "color-mix(in srgb, var(--estado-pendiente) 7%, transparent)" }
                        : undefined
                    }
                  >
                    <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {p.nombre}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{p.correo}</span>
                        </span>
                        {p.reincidente ? (
                          <Badge
                            className="shrink-0 border-transparent text-white"
                            style={{ background: "var(--estado-pendiente)" }}
                          >
                            Reincidente
                          </Badge>
                        ) : null}
                      </span>
                    </th>
                    {p.estados.map((estado, i) => {
                      const finalizado = estado === "Finalizado";
                      return (
                        <td
                          key={datos.actividades[i].id}
                          className="border-l border-border/60 px-1.5 py-2 text-center"
                        >
                          {finalizado ? (
                            <Check
                              className="mx-auto size-4"
                              style={{ color: "var(--estado-finalizado)" }}
                              aria-label={`${datos.actividades[i].nombre}: finalizada`}
                            />
                          ) : (
                            <X
                              className="mx-auto size-4"
                              style={{ color: "var(--estado-pendiente)" }}
                              strokeWidth={2.5}
                              aria-label={`${datos.actividades[i].nombre}: no finalizada`}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="border-l border-border/60 px-3 py-1.5">
                      <span className="flex items-center justify-end">
                        <MiniPastel porcentaje={p.porcentajeFinalizacion} tamano={30} />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
