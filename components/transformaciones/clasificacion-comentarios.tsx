"use client";

import {EtiquetaEditorial, LapizDeCatalogo, TextoDeCatalogo, TextoEditorial} from "@/components/editorial/texto-editorial";
import { ArrowRight, Layers, MousePointerClick, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import type { ClusterComentarios } from "@/types/momento4";

/**
 * Los temas en que se agrupan los comentarios, cada uno con cuántos reúne.
 *
 * Se pintan como botones y no como una lista: el conteo por sí solo invita a
 * preguntarse "¿cuáles son esos doce?", y la respuesta debe estar a un clic.
 * Como las tarjetas no parecían clicables, la instrucción va escrita encima y
 * cada botón cambia al pasar el puntero (borde, fondo, sombra y la acción).
 * Al elegir uno se filtra TODA la sección, no solo la lista de aportes, para
 * poder ver también quién los escribió y desde qué sede.
 */
export function ClasificacionComentarios({
  clusters,
  seleccionado,
  onSeleccionar,
  totalComentarios,
  ayuda = "Haz clic en un tema para filtrar la sección; otro clic lo quita.",
  accion = "Ver sus comentarios",
}: {
  clusters: ClusterComentarios[];
  seleccionado: number | null;
  onSeleccionar: (cluster: number | null) => void;
  totalComentarios: number;
  /** Qué pasa al elegir un tema; cambia según la sección que lo use. */
  ayuda?: string;
  /** Rótulo de la acción dentro de cada botón. */
  accion?: string;
}) {
  if (clusters.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <TextoEditorial id="a7ae36c9ba6676e87a7b" original={"Todavía no hay comentarios suficientes para agrupar por tema. La clasificación se rehace sola cada vez que se cargan documentos nuevos."}/></p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <p className="flex flex-wrap items-center gap-2">
          <Layers className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <TextoEditorial id="f6ec7c00909f85616c35" original={"Los"}/> {formatNumero(totalComentarios)} <TextoEditorial id="292906f3df9b7f20aeb4" original={"comentarios se agrupan solos en"}/>{" "}
            <strong className="font-medium text-foreground">{clusters.length} <TextoEditorial id="b85b36eab3831604a610" original={"temas"}/></strong> <TextoEditorial id="c837b8ab30885afc1ec6" original={"según las palabras que comparten."}/>
          </span>
        </p>
        <p className="flex items-center gap-2 font-medium text-foreground">
          <MousePointerClick className="size-4 shrink-0 text-primary" aria-hidden />
          <TextoDeCatalogo texto={ayuda} />
          <LapizDeCatalogo texto={accion} />
          <LapizDeCatalogo texto="Quitar este filtro" />
        </p>
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
                "group flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3.5 text-left shadow-xs outline-none transition-[border-color,background-color,box-shadow,translate] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                activo
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-md motion-reduce:hover:translate-y-0"
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

              {/* La acción escrita: el botón dice qué hace, y al pasar el puntero se subraya. */}
              <span
                className={cn(
                  "mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2",
                  !activo && "group-hover:underline"
                )}
              >
                {/* EtiquetaEditorial no dibuja lápiz: un botón de edición dentro de este botón sería HTML inválido.
                    Los lápices de estos rótulos van junto a la instrucción, fuera de los botones. */}
                {activo ? (
                  <>
                    <X className="size-3" aria-hidden />
                    <EtiquetaEditorial texto="Quitar este filtro" />
                  </>
                ) : (
                  <>
                    <EtiquetaEditorial texto={accion} />
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
