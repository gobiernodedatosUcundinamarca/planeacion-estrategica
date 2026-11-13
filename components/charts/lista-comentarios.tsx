"use client";

import {TextoEditorial, TextoDeCatalogo, EtiquetaEditorial, LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import { useId, useState } from "react";
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
export function ListaComentarios({ titulo, comentarios, delimitada = false }: { titulo: string; comentarios: Comentario[]; delimitada?: boolean }) {
  const [visibles, setVisibles] = useState(delimitada ? PASO * 3 : PASO);
  const tituloId = useId();

  if (comentarios.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <TextoEditorial id="b005d0c2ff27232f17f3" original={"No hay respuestas con contenido en este recorte."}/></p>
    );
  }

  return (
    <section className={delimitada ? 'cuadro-sugerencias' : 'flex flex-col gap-2'} aria-labelledby={tituloId}>
      <h3 id={tituloId} className="text-[13px] font-semibold text-foreground">
        <TextoDeCatalogo texto={titulo}/> <span className="font-normal text-muted-foreground">({formatNumero(comentarios.length)})</span>
      </h3>
      <div key={delimitada ? comentarios.map(c => c.id).join(',') : undefined}
        className={delimitada ? 'scroll-sugerencias' : undefined}
        role={delimitada ? 'region' : undefined} tabIndex={delimitada ? 0 : undefined}
        aria-labelledby={delimitada ? tituloId : undefined}>
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
      </div>
      {delimitada ? <div className="pie-sugerencias">
        <span aria-live="polite">{formatNumero(Math.min(visibles, comentarios.length))} / {formatNumero(comentarios.length)} <TextoEditorial id="0f8653c867c57bb85b7c" original="sugerencias cargadas"/></span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={visibles >= comentarios.length} onClick={() => setVisibles(v => v + PASO * 2)}>
            {visibles < comentarios.length ? <><EtiquetaEditorial texto="Ver más"/> ({formatNumero(comentarios.length - visibles)} <EtiquetaEditorial texto="restantes"/>)</> : <EtiquetaEditorial texto="Todas cargadas"/>}
          </Button>
          <LapizDeCatalogo texto={visibles < comentarios.length ? 'Ver más' : 'Todas cargadas'}/>
          {visibles < comentarios.length ? <LapizDeCatalogo texto="restantes"/> : null}
        </div>
      </div> : visibles < comentarios.length ? (
        <Button variant="outline" size="sm" className="self-center" onClick={() => setVisibles((v) => v + PASO * 2)}>
          Ver más ({formatNumero(comentarios.length - visibles)} restantes)
        </Button>
      ) : null}
    </section>
  );
}
