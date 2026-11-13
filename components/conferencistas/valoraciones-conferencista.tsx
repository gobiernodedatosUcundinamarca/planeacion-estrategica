"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { motion, type Variants } from "framer-motion";
import { MessageSquareQuote, Star, Users2 } from "lucide-react";
import type { ValoracionConferencista } from "@/types/valoraciones";
import { formatNumero } from "@/lib/formatters";

/**
 * Vista de valoraciones de un conferencista, leída en vivo de Valoraciones.xlsx
 * (ver excel-valoraciones-source.ts para el mapeo hoja/columna -> persona y
 * las notas sobre qué jornadas fueron conjuntas). Cuando la calificación o
 * los comentarios son compartidos con otro(s) conferencista(s) — dos
 * jornadas se evaluaron con una sola pregunta para dos personas — se
 * etiqueta explícitamente en vez de presentarlo como si fuera exclusivo de
 * esta persona.
 */
export function ValoracionesConferencista({
  valoracion,
  acento,
  variants,
}: {
  valoracion: ValoracionConferencista;
  acento: string;
  variants: Variants | undefined;
}) {
  const { totalRespuestas, promedio, distribucion, comentarios, calificacionCompartidaCon, comentariosCompartidosCon } =
    valoracion;
  const maxConteo = Math.max(...Object.values(distribucion), 1);

  if (totalRespuestas === 0) {
    return (
      <motion.p variants={variants} className="py-10 text-center text-sm text-muted-foreground">
        <TextoEditorial id="6a07a51d9a2473126b86" original={"Aún no hay valoraciones registradas para esta jornada."}/>
      </motion.p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <motion.div variants={variants} className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-4 text-center">
          <span className="flex items-center gap-1 text-2xl font-bold text-foreground">
            <Star className="size-5 fill-amber-500 text-amber-500" aria-hidden />
            {promedio.toFixed(1)}
          </span>
          <span className="text-[11px] text-muted-foreground"><TextoEditorial id="f1041cac75297504bcb4" original={"Calificación promedio"}/></span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-4 text-center">
          <span className="flex items-center gap-1 text-2xl font-bold text-foreground">
            <Users2 className="size-5" style={{ color: acento }} aria-hidden />
            {formatNumero(totalRespuestas)}
          </span>
          <span className="text-[11px] text-muted-foreground"><TextoEditorial id="6ca5bf3e36677b66ad2d" original={"Valoraciones recibidas"}/></span>
        </div>
      </motion.div>

      {calificacionCompartidaCon.length > 0 ? (
        <motion.p variants={variants} className="text-xs text-muted-foreground italic">
          <TextoEditorial id="d9e7ae0fcb941d09a923" original={"Calificación de una jornada conjunta con"}/> {formatearLista(calificacionCompartidaCon)}.
        </motion.p>
      ) : null}

      <motion.div variants={variants}>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <TextoEditorial id="03dc2dfb745907aa29ba" original={"Distribución de calificaciones"}/></h3>
        <div className="flex flex-col gap-1.5">
          {([5, 4, 3, 2, 1] as const).map((estrella) => {
            const conteo = distribucion[estrella];
            const porcentaje = totalRespuestas > 0 ? Math.round((conteo / totalRespuestas) * 100) : 0;
            return (
              <div key={estrella} className="flex items-center gap-2 text-xs">
                <span className="flex w-8 shrink-0 items-center justify-end gap-0.5 tabular-nums text-muted-foreground">
                  {estrella}
                  <Star className="size-3" aria-hidden />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((conteo / maxConteo) * 100, conteo > 0 ? 3 : 0)}%`,
                      backgroundColor: acento,
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-muted-foreground tabular-nums">
                  {formatNumero(conteo)} ({porcentaje}%)
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {comentarios.length > 0 ? (
        <motion.div variants={variants}>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <MessageSquareQuote className="size-3.5" style={{ color: acento }} aria-hidden />
            <TextoEditorial id="d0d6de834fc5cdd9a515" original={"Comentarios ("}/>{formatNumero(comentarios.length)})
          </h3>
          {comentariosCompartidosCon.length > 0 ? (
            <p className="mb-2 text-xs text-muted-foreground italic">
              <TextoEditorial id="ea878501dd4783c7490a" original={"Comentarios generales de una jornada conjunta con"}/>{formatearLista(comentariosCompartidosCon)}<TextoEditorial id="031d3f795fbd8e0db359" original={", no exclusivos de esta charla."}/></p>
          ) : null}
          <ul className="flex flex-col gap-2.5">
            {comentarios.map((c, i) => (
              <li key={`${c.autor}-${i}`} className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm leading-relaxed text-foreground">"{c.texto}"</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">— {c.autor}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </div>
  );
}

function formatearLista(nombres: string[]): string {
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}
