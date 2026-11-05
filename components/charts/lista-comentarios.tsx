"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumero } from "@/lib/formatters";

export interface Comentario {
  id: number;
  texto: string;
  /** Contexto de quién lo escribió (rol, fecha, dependencia), en una línea. */
  detalle: string;
}

/** Cuántos se muestran antes de pedir "ver más". */
const PASO = 6;

/**
 * Las respuestas abiertas, de a pocas. Se muestran todas las del recorte (no
 * una selección): son la fuente de la nube de palabras y de los temas, y quien
 * lee debe poder comprobar de dónde salen.
 */
export function ListaComentarios({ titulo, comentarios }: { titulo: string; comentarios: Comentario[] }) {
  const [visibles, setVisibles] = useState(PASO);

  if (comentarios.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No hay respuestas con contenido en este recorte.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold text-foreground">
        {titulo} <span className="font-normal text-muted-foreground">({formatNumero(comentarios.length)})</span>
      </h3>
      <ul className="grid grid-cols-2 gap-2">
        {comentarios.slice(0, visibles).map((c) => (
          <li key={c.id} className="flex gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-primary/60" aria-hidden />
            <div className="min-w-0">
              <p className="text-foreground">{c.texto}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.detalle}</p>
            </div>
          </li>
        ))}
      </ul>
      {visibles < comentarios.length ? (
        <Button variant="outline" size="sm" className="self-center" onClick={() => setVisibles((v) => v + PASO * 2)}>
          Ver más ({formatNumero(comentarios.length - visibles)} restantes)
        </Button>
      ) : null}
    </section>
  );
}
