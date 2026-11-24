"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { ConformacionEquipo, FiltroEquipo } from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";
import { LineaFuente } from "../piezas";
import { Cifra, Pregunta } from "./capitulo";

/**
 * Quiénes formaron cada equipo. Abre la validación porque ahí se preguntó
 * «Equipo asignado:» y de ese equipo salieron las dos transformaciones que
 * cada persona valoró. Retícula tipográfica de cuatro columnas, sin cajas;
 * con filtro de equipo, el elegido queda en tinta plena y los demás se
 * atenúan sin moverse, para no saltar de lugar al filtrar.
 */
export function EquiposAsignados({ equipos, equipo }: { equipos: ConformacionEquipo[]; equipo: FiltroEquipo }) {
  if (!equipos.length) return null;
  const personas = equipos.reduce((s, e) => s + e.integrantes.length, 0);
  return (
    <div className="mt-12 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Pregunta>
          <TextoEditorial id="m5-equipos-pregunta" original="Equipo asignado:" />
        </Pregunta>
        <p className="m5-entradilla">
          <Cifra valor={personas} /> <TextoEditorial id="m5-equipos-a" original="participantes trabajaron en" /> <Cifra valor={equipos.length} />{" "}
          <TextoEditorial id="m5-equipos-b" original="equipos; cada participante valoró las dos transformaciones asignadas a su equipo." />
        </p>
      </div>
      <ol className="grid grid-cols-4 gap-x-[var(--m5-medianil)] gap-y-10" aria-label="Integrantes de cada equipo">
        {equipos.map((e) => {
          const elegido = equipo === e.equipo;
          return (
            <li
              key={e.equipo}
              aria-current={elegido ? "true" : undefined}
              className={cn(
                "flex flex-col gap-2 border-t pt-3 transition-opacity duration-300",
                elegido ? "border-[var(--m5-correccion)]" : "border-[var(--m5-filete)]",
                equipo !== null && !elegido && "opacity-35"
              )}
            >
              <p className="text-[15px] leading-tight font-semibold">
                <TextoEditorial id="m5-equipo" original="Equipo" /> <span className="m5-cifra">{e.equipo}</span>
              </p>
              <p className="m5-nota -mt-1">{e.transformaciones.join(" y ")}</p>
              <ul className="flex flex-col gap-1 text-[13px] leading-snug">
                {e.integrantes.map((p) => (
                  // El cargo queda a mano sin alargar la lista.
                  <li key={p.pid} title={p.cargo ?? undefined}>
                    {p.nombre}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <LineaFuente
        id="m5-fuente-equipos"
        original="respuesta de cada participante a «Equipo asignado:» en el Formulario Individual de Validación Estratégica; quien solo aparece en un registro grupal toma el equipo de ese registro. Las transformaciones son las dos que el equipo tenía asignadas."
      />
    </div>
  );
}
