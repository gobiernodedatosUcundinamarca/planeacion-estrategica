"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Layers, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import type { ClusterComentarios } from "@/types/momento4";

/**
 * Los temas en que se agrupan los comentarios, cada uno con cuántos reúne.
 *
 * Se pintan como botones y no como una lista: el conteo por sí solo invita a
 * preguntarse "¿cuáles son esos doce?", y la respuesta debe estar a un clic.
 * Al elegir uno se filtra TODA la sección, no solo la lista de aportes, para
 * poder ver también quién los escribió y desde qué sede.
 */
export function ClasificacionComentarios({
  clusters,
  seleccionado,
  onSeleccionar,
  totalComentarios,
  ayuda = "Elige uno para filtrar la sección.",
}: {
  clusters: ClusterComentarios[];
  seleccionado: number | null;
  onSeleccionar: (cluster: number | null) => void;
  totalComentarios: number;
  /** Qué pasa al elegir un tema; cambia según la sección que lo use. */
  ayuda?: string;
}) {
  if (clusters.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <TextoEditorial id="a7ae36c9ba6676e87a7b" original={"Todavía no hay comentarios suficientes para agrupar por tema. La clasificación se rehace sola cada vez que se cargan documentos nuevos."}/></p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Layers className="size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <TextoEditorial id="f6ec7c00909f85616c35" original={"Los"}/> {formatNumero(totalComentarios)} <TextoEditorial id="292906f3df9b7f20aeb4" original={"comentarios se agrupan solos en"}/>{" "}
          <strong className="font-medium text-foreground">{clusters.length} <TextoEditorial id="b85b36eab3831604a610" original={"temas"}/></strong> <TextoEditorial id="c837b8ab30885afc1ec6" original={"según las palabras que comparten."}/>{ayuda}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {clusters.map((grupo) => {
          const activo = seleccionado === grupo.cluster;
          const porcentaje = totalComentarios > 0 ? (grupo.total / totalComentarios) * 100 : 0;

          return (
            <button
              key={grupo.cluster}
              type="button"
              // Alterna: volver a pulsar el tema activo quita el filtro, que es
              // lo que se espera de algo que ya está seleccionado.
              onClick={() => onSeleccionar(activo ? null : grupo.cluster)}
              aria-pressed={activo}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border px-4 py-3.5 text-left transition-colors",
                activo
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-card hover:border-primary/40 hover:bg-accent"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-sm font-semibold text-foreground">
                  {grupo.nombre}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-heading text-xl font-bold tabular-nums",
                    activo ? "text-primary" : "text-foreground"
                  )}
                >
                  {formatNumero(grupo.total)}
                </span>
              </div>

              {/* Barra de proporción: dice de un vistazo si un tema domina la
                  conversación o si están repartidos. */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", activo ? "bg-primary" : "bg-primary/50")}
                  style={{ width: `${Math.max(porcentaje, 2)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                  {formatPorcentaje(porcentaje)}
                </span>
                {grupo.terminos.slice(0, 3).map((termino) => (
                  <span
                    key={termino}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <Tag className="size-2.5" aria-hidden />
                    {termino}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
