"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { ClasificacionComentarios } from "@/components/transformaciones/clasificacion-comentarios";
import { NubePalabras } from "@/components/charts/nube-palabras";
import { ListaComentarios, type Comentario } from "@/components/charts/lista-comentarios";
import { formatNumero } from "@/lib/formatters";
import { calcularFrecuenciaPalabras } from "@/lib/frecuencia-palabras";
import { clave, sonTemasUtiles } from "@/lib/reglas/formularios";
import type { TemaComentarios } from "@/types/formularios";

/**
 * Las respuestas abiertas de una pregunta: los temas en que se agrupan (si la
 * agrupación separa de verdad), las palabras que más se repiten y la lista
 * completa. Elegir un tema deja en la nube y en la lista solo sus respuestas.
 *
 * Los temas se calculan en el servidor sobre TODAS las respuestas; aquí solo se
 * recuentan sobre las del recorte, para que con un filtro activo las cifras de
 * cada tema sigan cuadrando con la lista.
 */
export function ComentariosPorTema({
  temas,
  comentarios,
  tituloLista,
  tituloNube,
  palabrasIgnoradas = [],
}: {
  temas: TemaComentarios[];
  comentarios: (Comentario & { tema: number | null })[];
  tituloLista: string;
  tituloNube: string;
  /**
   * Palabras que no van en la nube: las que repite el enunciado de la pregunta
   * ("experiencia", "mejorar"…) y saldrían grandes sin decir nada. Es la misma
   * lista con que se agrupan los temas.
   */
  palabrasIgnoradas?: readonly string[];
}) {
  const [tema, setTema] = useState<number | null>(null);

  const temasDelRecorte = useMemo(
    () =>
      temas
        .map((t) => ({ ...t, total: comentarios.filter((c) => c.tema === t.cluster).length }))
        .filter((t) => t.total > 0),
    [temas, comentarios]
  );
  const mostrarTemas = sonTemasUtiles(temas);
  const temaVigente = temasDelRecorte.some((t) => t.cluster === tema) ? tema : null;

  const visibles = useMemo(
    () => (temaVigente === null ? comentarios : comentarios.filter((c) => c.tema === temaVigente)),
    [comentarios, temaVigente]
  );
  const palabras = useMemo(() => {
    const ignoradas = new Set(palabrasIgnoradas.map(clave));
    return calcularFrecuenciaPalabras(
      visibles.map((c) => c.texto),
      // Con pocas respuestas, exigir que una palabra se repita deja la nube vacía.
      { maxPalabras: 60, frecuenciaMinima: visibles.length >= 15 ? 2 : 1 }
    )
      .filter((p) => !ignoradas.has(clave(p.palabra)))
      .slice(0, 45);
  }, [visibles, palabrasIgnoradas]);

  return (
    <div className="flex flex-col gap-5">
      {mostrarTemas ? (
        <ClasificacionComentarios
          clusters={temasDelRecorte}
          seleccionado={temaVigente}
          onSeleccionar={setTema}
          totalComentarios={comentarios.filter((c) => c.tema !== null).length}
          ayuda="Elige uno para ver solo sus respuestas."
        />
      ) : comentarios.length > 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {/* Se dice en vez de esconderlo en silencio: quien eligió ver temas
              debe saber por qué no aparecen. */}
          Estas respuestas no se separan en temas claros: la agrupación automática deja casi todas en
          un mismo grupo. Se resumen con las palabras que más se repiten y la lista completa.
        </p>
      ) : null}

      {palabras.length > 0 ? (
        <NubePalabras
          palabras={palabras}
          totalRespuestas={visibles.length}
          titulo={tituloNube}
          descripcion={`Palabras más frecuentes en las ${formatNumero(visibles.length)} respuestas con contenido del recorte.`}
        />
      ) : null}

      <ListaComentarios titulo={tituloLista} comentarios={visibles} />
    </div>
  );
}
