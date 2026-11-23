"use client";

import { useState } from "react";
import { ComentariosPorTema } from "@/components/charts/comentarios-por-tema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5 } from "@/types/momento5";
import { LineaFuente, Tarjeta } from "./piezas";

/**
 * Las preguntas abiertas de un formulario que no traen clasificación propia,
 * agrupadas por tema en el servidor. El filtro de equipo recorta las
 * respuestas; los temas se recuentan sobre el recorte (`ComentariosPorTema`).
 */
export function RespuestasAbiertas({ preguntas, equipo }: { preguntas: PreguntaAbiertaMomento5[]; equipo: FiltroEquipo }) {
  const [elegida, setElegida] = useState(preguntas[0]?.id ?? "");
  const actual = preguntas.find((p) => p.id === elegida) ?? preguntas[0];
  if (!actual) return null;

  const comentarios = actual.respuestas
    .filter((r) => equipo === null || r.equipo === equipo)
    .map((r) => ({ id: r.id, texto: r.texto, detalle: r.detalle, tema: r.tema }));

  return (
    <Tarjeta
      titulo="Respuestas abiertas agrupadas por tema"
      descripcion="Agrupación automática por vocabulario compartido (TF-IDF y K-Means; el número de temas se elige por silueta). Agrupa por palabras, no por significado."
    >
      {preguntas.length > 1 ? (
        <Tabs value={actual.id} onValueChange={(v) => setElegida(String(v))}>
          {/* Los enunciados van completos, como en el formulario: la lista se parte en líneas si no cabe. */}
          <TabsList variant="line" aria-label="Pregunta abierta" className="h-auto w-full flex-wrap justify-start gap-x-4 gap-y-2">
            {preguntas.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="h-auto flex-none px-0 py-1 text-left whitespace-normal">

                {p.pregunta}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <p className="text-[13px] font-semibold text-foreground">{actual.pregunta}</p>
      )}
      <ComentariosPorTema
        key={actual.id}
        temas={actual.temas}
        comentarios={comentarios}
        palabrasIgnoradas={actual.palabrasSinTema}
        tituloNube="Palabras más frecuentes"
        tituloLista="Respuestas"
      />
      <LineaFuente
        id="m5-abiertas-alcance"
        original="respuestas a la pregunta elegida, tal como se escribieron; se excluyen las vacías y las de relleno («No aplica», «N/A», «.»). Se agrupan solo las preguntas abiertas que el análisis no había clasificado. Los temas se calculan con todas las respuestas y se recuentan con el filtro de equipo."
      />
    </Tarjeta>
  );
}
