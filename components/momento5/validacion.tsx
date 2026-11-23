"use client";

import { useId, useState, type ReactNode } from "react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import {
  BINS_AJUSTE,
  binAjuste,
  porcentajesComplementarios,
  type ComponenteValorado,
  type DerivadosMomento5,
} from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";
import {
  COLOR_AJUSTE,
  COLOR_VALIDA,
  EstadoVacio,
  Fuente,
  LeyendaValoracion,
  TEXTO_AJUSTE,
  TEXTO_VALIDA,
  TablaSimple,
  Tarjeta,
  estiloTramo,
  pct,
} from "./piezas";

const ETIQUETA_VALIDA = <TextoEditorial id="m5-leyenda-valida" original="Se valida" />;
const ETIQUETA_AJUSTE = <TextoEditorial id="m5-leyenda-ajuste" original="Requiere ajuste" />;

interface FilaValoracion {
  id: string;
  label: string;
  V: number;
  A: number;
  total: number;
}

/** Contenido de un tooltip: título y filas clave/valor, como en el resto de gráficos. */
function ContenidoTooltip({ titulo, filas, nota }: { titulo: string; filas: [ReactNode, string][]; nota?: string | null }) {
  return (
    <span className="flex max-w-64 flex-col gap-0.5">
      <span className="font-semibold">{titulo}</span>
      {filas.map(([k, v], i) => (
        <span key={i} className="flex justify-between gap-3">
          <span className="opacity-75">{k}</span>
          <span className="tabular-nums">{v}</span>
        </span>
      ))}
      {nota ? <span className="mt-1 opacity-75">{nota}</span> : null}
    </span>
  );
}

/** Barra al 100 % por fila: «Se valida» frente a «Requiere ajuste». */
export function BarrasValoracion({ filas, leyenda = true }: { filas: FilaValoracion[]; leyenda?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {leyenda ? <LeyendaValoracion /> : null}
      <ul className="flex flex-col gap-3">
        {filas.map((r) => {
          const { valida, ajuste } = porcentajesComplementarios(r.A, r.total);
          const resumen = `${r.label}: se valida ${formatPorcentaje(valida)}, requiere ajuste ${formatPorcentaje(ajuste)} de ${formatNumero(r.total)} valoraciones`;
          return (
            <li key={r.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {r.total ? (
                    <>
                      {formatNumero(r.total)} <TextoEditorial id="m5-valoraciones" original="valoraciones" />
                    </>
                  ) : (
                    <TextoEditorial id="m5-no-asignada" original="No asignada" />
                  )}
                </span>
              </div>
              {r.total ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<div role="img" tabIndex={0} aria-label={resumen} />}
                    className="flex h-7 w-full overflow-hidden text-[11px] font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {r.V > 0 ? (
                      <span className={cn("flex items-center justify-center", TEXTO_VALIDA)} style={{ ...COLOR_VALIDA, flex: r.V }}>
                        {r.V / r.total >= 0.12 ? formatPorcentaje(valida) : ""}
                      </span>
                    ) : null}
                    {r.A > 0 ? (
                      <span className={cn("flex items-center justify-center", TEXTO_AJUSTE)} style={{ ...COLOR_AJUSTE, flex: r.A }}>
                        {r.A / r.total >= 0.12 ? formatPorcentaje(ajuste) : ""}
                      </span>
                    ) : null}
                  </TooltipTrigger>
                  <TooltipContent>
                    <ContenidoTooltip
                      titulo={r.label}
                      filas={[
                        [ETIQUETA_VALIDA, `${formatNumero(r.V)} · ${formatPorcentaje(valida)}`],
                        [ETIQUETA_AJUSTE, `${formatNumero(r.A)} · ${formatPorcentaje(ajuste)}`],
                        [<TextoEditorial key="v" id="m5-tt-valoraciones" original="Valoraciones" />, formatNumero(r.total)],
                      ]}
                    />
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex h-7 items-center justify-center bg-muted text-[11px] text-muted-foreground">
                  <TextoEditorial id="m5-equipo-no-valoro" original="El equipo no valoró esta transformación" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const claveDe = (c: ComponenteValorado) => `${c.t}:${c.code}`;

/** Mapa de calor: % de participantes que pidió ajustar cada objetivo, ámbito o resultado. */
export function MapaComponentes({ d }: { d: DerivadosMomento5 }) {
  const [sel, setSel] = useState<string | null>(null);
  const idDetalle = useId();
  const nombreT = Object.fromEntries(d.porT.map((t) => [t.t, t.nombre]));
  const visibles = Object.values(d.porComp)
    .flat()
    .filter((c) => c.total > 0);
  const masAjustado = visibles.reduce<ComponenteValorado | null>((m, c) => (!m || c.pct > m.pct ? c : m), null);
  // Si el filtro de equipo deja fuera la celda elegida, vuelve al componente con más ajustes.
  const actual = (sel ? visibles.find((c) => claveDe(c) === sel) : undefined) ?? masAjustado;
  const claveActual = actual ? claveDe(actual) : null;

  return (
    <Tarjeta
      className="col-span-7"
      titulo="«Requiere ajuste» por componente"
      descripcion="Cada celda es un objetivo estratégico (OE), un ámbito (Á) o un resultado estratégico (R). El color y la cifra indican el porcentaje de participantes que marcó «Requiere ajuste». Elige una celda para leer sus propuestas."
      pie={
        <Fuente
          id="m5-fuente-val-mapa"
          original="valoración de cada componente en el Formulario Individual de Validación Estratégica. Porcentaje = respuestas «Requiere ajuste» ÷ personas que valoraron ese componente. Las propuestas son las respuestas a «Ajuste propuesto al … (si corresponde):» y «Justificación del ajuste al … (si corresponde):» de ese componente."
        />
      }
      tabla={
        <TablaSimple
          encabezados={["Transformación", "Componente", "Se valida", "Requiere ajuste", "% ajuste"]}
          numericas={[2, 3, 4]}
          filas={visibles.map((c) => [nombreT[c.t] ?? c.t, c.titulo, c.V, c.A, pct(c.pct)])}
        />
      }
    >
      {visibles.length === 0 ? (
        <EstadoVacio>Sin valoraciones para este filtro.</EstadoVacio>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {d.porT.map((r) => {
              const comps = d.porComp[r.t] ?? [];
              const n = comps[0]?.total ?? 0;
              return (
                <div key={r.t} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">{r.nombre}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {n ? (
                        <>
                          {formatNumero(n)} <TextoEditorial id="m5-participantes-min" original="participantes" />
                        </>
                      ) : (
                        <TextoEditorial id="m5-no-asignada" original="No asignada" />
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={r.nombre}>
                    {comps.map((c) => {
                      const clave = claveDe(c);
                      if (!c.total) {
                        return (
                          <span
                            key={clave}
                            className="flex size-12 flex-col items-center justify-center bg-muted text-[11px] text-muted-foreground"
                            aria-label={`${c.code}: sin valoraciones`}
                            role="img"
                          >
                            <span className="font-semibold">{c.code}</span>
                            <span aria-hidden>—</span>
                          </span>
                        );
                      }
                      const tramo = estiloTramo(binAjuste(c.pct));
                      const elegida = clave === claveActual;
                      return (
                        <Tooltip key={clave}>
                          <TooltipTrigger
                            type="button"
                            onClick={() => setSel(clave)}
                            aria-pressed={elegida}
                            aria-controls={idDetalle}
                            aria-label={`${c.titulo}: ${pct(c.pct)} requiere ajuste (${c.A} de ${c.total})`}
                            className={cn(
                              "flex size-12 cursor-pointer flex-col items-center justify-center text-[11px] leading-tight tabular-nums outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50",
                              tramo.className,
                              elegida && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                            )}
                            style={tramo.style}
                          >
                            <span className="font-semibold">{c.code}</span>
                            <span>{Math.round(c.pct * 100)}%</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <ContenidoTooltip
                              titulo={c.titulo}
                              filas={[
                                [ETIQUETA_AJUSTE, `${formatNumero(c.A)} · ${pct(c.pct)}`],
                                [ETIQUETA_VALIDA, formatNumero(c.V)],
                              ]}
                              nota={c.texto ? (c.texto.length > 180 ? `${c.texto.slice(0, 180)}…` : c.texto) : null}
                            />
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
            <span>
              <TextoEditorial id="m5-escala-ajuste" original="% que requiere ajuste" />
            </span>
            {BINS_AJUSTE.map((b, i) => (
              <span key={b} className="flex items-center gap-1">
                <span className="size-3 border border-border/70" style={estiloTramo(i).style} />
                {b}
              </span>
            ))}
          </div>

          {actual ? (
            <div id={idDetalle} aria-live="polite" className="flex flex-col gap-2 border border-border/70 bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">
                {nombreT[actual.t] ?? actual.t}: {actual.titulo}
              </p>
              {actual.texto ? (
                <p className="text-xs text-muted-foreground">
                  {actual.texto}
                  {actual.truncado ? (
                    <>
                      {" "}
                      <TextoEditorial id="m5-texto-recortado" original="(texto recortado a 200 caracteres en la exportación de Forms)" />
                    </>
                  ) : null}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-4 text-xs text-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5" style={COLOR_AJUSTE} aria-hidden />
                  <TextoEditorial id="m5-leyenda-ajuste" original="Requiere ajuste" /> · <b>{formatNumero(actual.A)}</b> ({pct(actual.pct)})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5" style={COLOR_VALIDA} aria-hidden />
                  <TextoEditorial id="m5-leyenda-valida" original="Se valida" /> · <b>{formatNumero(actual.V)}</b>
                </span>
              </div>
              {actual.propuestas.length ? (
                <ul
                  className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1"
                  tabIndex={0}
                  aria-label="Propuestas de ajuste"
                >
                  {actual.propuestas.map((p, i) => (
                    <li key={i} className="rounded-md border border-border/70 bg-card p-2.5 text-xs">
                      <p className="font-semibold text-foreground">
                        {p.nombre}
                        {p.equipo ? ` · Equipo ${p.equipo}` : ""}
                      </p>
                      <p className="mt-1 text-foreground">
                        {p.ajuste ?? <TextoEditorial id="m5-ajuste-sin-redactar" original="Marcó «Requiere ajuste» sin redactar el ajuste propuesto." />}
                      </p>
                      {p.justificacion ? (
                        <p className="mt-1 text-muted-foreground">
                          <TextoEditorial id="m5-justificacion" original="Justificación del ajuste:" /> {p.justificacion}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  <TextoEditorial id="m5-sin-propuestas" original="Ningún participante marcó «Requiere ajuste» en este componente." />
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </Tarjeta>
  );
}
