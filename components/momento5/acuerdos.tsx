"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumero } from "@/lib/formatters";
import { pasoAjustes, validaDemasComponentes, type DerivadosMomento5 } from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";
import { EstadoVacio, Fuente, Medidor, TablaSimple, Tarjeta, estiloTramo } from "./piezas";

type Filtro = { t: string; tipo: string | null } | null;

/** Ajustes en los que hubo consenso dentro de cada equipo (registro grupal del relator). */
export function AcuerdosEquipo({ d }: { d: DerivadosMomento5 }) {
  const [filtro, setFiltro] = useState<Filtro>(null);
  const nombreT = Object.fromEntries(d.porT.map((t) => [t.t, t.nombre]));
  const max = Math.max(1, ...d.matrizAjustes.flatMap((r) => r.porTipo));

  const acuerdos = d.acuerdos
    .map((a) => ({
      ...a,
      visibles: a.ajustes.filter((x) => !filtro || (x.t === filtro.t && (!filtro.tipo || x.tipo === filtro.tipo))),
    }))
    .filter((a) => !filtro || a.visibles.length > 0);

  const alternar = (t: string, tipo: string | null) =>
    setFiltro((f) => (f && f.t === t && f.tipo === tipo ? null : { t, tipo }));

  const nEquipos = d.acuerdos.length;

  return (
    <Tarjeta
      titulo="Ajustes acordados por los equipos"
      descripcion="Un registro por equipo, diligenciado por su relator(a). Las columnas son las opciones de «Componente:». Elige una celda para filtrar los ajustes."
      pie={
        <Fuente
          id="m5-fuente-acu-matriz"
          original="cada ajuste registrado en Acuerdos Estratégicos del Equipo, contado según su «Transformación estratégica:» (filas) y su «Componente:» (columnas). Los dos indicadores cuentan los equipos que respondieron «SI» a «El equipo valida, sin ajustes adicionales, los demás componentes…» y los que describieron puntos en «El equipo no alcanzó acuerdo sobre uno o más componentes…». Cuando la transformación o el componente se escribieron de otra forma, se normalizaron y se indica con una nota."
        />
      }
      tabla={
        <TablaSimple
          encabezados={["Equipo n.º", "Transformación estratégica", "Identificación del componente", "Componente", "Ajuste propuesto por el equipo", "Justificación del ajuste"]}
          filas={d.ajustes.map((a) => [`${a.equipo}`, nombreT[a.t] ?? a.t, a.c, a.tipo, a.ajuste, a.justificacion ?? ""])}
          alto="max-h-[560px]"
        />
      }
    >
      <div className="grid grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-4">
          <Table aria-label="Ajustes por transformación y tipo de componente">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs"><TextoEditorial id="m5-th-transformacion" original="Transformación" /></TableHead>
                {/* Las opciones de «Componente:» completas, como en el formulario. */}
                {d.tipos.map((t) => (
                  <TableHead key={t} className="text-center text-xs leading-tight whitespace-normal">{t}</TableHead>
                ))}
                <TableHead className="text-center text-xs"><TextoEditorial id="m5-th-total" original="Total" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.matrizAjustes.map((r) => (
                <TableRow key={r.t} className="hover:bg-transparent">
                  <TableCell className="whitespace-normal text-xs font-medium">{r.nombre}</TableCell>
                  {r.porTipo.map((n, i) => {
                    const paso = pasoAjustes(n, max);
                    const tipo = d.tipos[i];
                    const activa = filtro?.t === r.t && filtro?.tipo === tipo;
                    const tramo = paso === null ? null : estiloTramo(paso);
                    return (
                      <TableCell key={tipo} className="p-1">
                        <Tooltip>
                          <TooltipTrigger
                            type="button"
                            disabled={n === 0}
                            onClick={() => alternar(r.t, tipo)}
                            aria-pressed={activa}
                            aria-label={`${r.nombre}, ${tipo}: ${n} ajustes`}
                            className={cn(
                              "flex h-9 w-full items-center justify-center text-sm font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default",
                              tramo ? tramo.className : "bg-muted text-muted-foreground",
                              n > 0 && "cursor-pointer",
                              activa && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                            )}
                            style={tramo?.style}
                          >
                            {n || "–"}
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="flex flex-col gap-0.5">
                              <span className="font-semibold">
                                {r.nombre} · {tipo}
                              </span>
                              <span>
                                <TextoEditorial id="m5-tt-ajustes-acordados" original="Ajustes acordados" />: {formatNumero(n)}
                              </span>
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                  <TableCell className="p-1">
                    <button
                      type="button"
                      disabled={r.total === 0}
                      onClick={() => alternar(r.t, null)}
                      aria-pressed={filtro?.t === r.t && filtro?.tipo === null}
                      aria-label={`${r.nombre}: ${r.total} ajustes en total`}
                      className={cn(
                        "flex h-9 w-full items-center justify-center border border-[var(--m5-linea)] text-sm font-bold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:text-muted-foreground",
                        r.total > 0 && "cursor-pointer hover:bg-muted",
                        filtro?.t === r.t && filtro?.tipo === null && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                      )}
                    >
                      {formatNumero(r.total)}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatNumero(d.ajustes.length)} <TextoEditorial id="m5-ajustes-acordados-por" original="ajustes acordados por" />{" "}
              {formatNumero(nEquipos)} {nEquipos === 1 ? "equipo" : "equipos"}.
            </span>
            {filtro ? (
              <Button variant="ghost" size="sm" onClick={() => setFiltro(null)}>
                <X className="size-3.5" aria-hidden />
                <TextoEditorial id="m5-quitar-filtro" original="Quitar filtro" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <Medidor
              etiqueta={<TextoEditorial id="m5-validan-demas" original="El equipo valida, sin ajustes adicionales, los demás componentes de las dos transformaciones asignadas." />}
              valor={d.acuerdos.filter(validaDemasComponentes).length}
              total={nEquipos}
            />
            <Medidor
              etiqueta={<TextoEditorial id="m5-sin-consenso" original="El equipo no alcanzó acuerdo sobre uno o más componentes" />}
              valor={d.acuerdos.filter((a) => a.desacuerdos).length}
              total={nEquipos}
            />
          </div>
        </div>

        <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto pr-1" tabIndex={0} aria-label="Ajustes acordados por equipo">
          {acuerdos.map((a) => (
            <article key={a.equipo} className="flex flex-col gap-2 border-b border-border/70 pb-4 last:border-b-0">
              <h4 className="text-sm font-semibold text-foreground">
                <TextoEditorial id="m5-equipo" original="Equipo" /> {a.equipo}
              </h4>
              <p className="m5-nota -mt-1">
                {a.transformaciones.map((t) => nombreT[t] ?? t).join(" y ")}.
                {a.relator ? (
                  <>
                    {" "}
                    <TextoEditorial id="m5-relator" original="Relator(a):" /> {a.relator}.
                  </>
                ) : null}
              </p>
              {a.visibles.map((x) => (
                <div key={x.n} className="flex flex-col gap-1 border-t border-[var(--m5-linea)] pt-2.5 text-sm">
                  <p className="font-semibold">
                    {nombreT[x.t] ?? (x.t || "—")}: {(x.tipo || "componente").toLowerCase()} {x.c}
                  </p>
                  <p className="text-foreground">{x.ajuste || "—"}</p>
                  {x.justificacion ? (
                    <p className="text-[var(--m5-suave)]">
                      <TextoEditorial id="m5-justificacion" original="Justificación del ajuste:" /> {x.justificacion}
                    </p>
                  ) : null}
                  {x.nota ? (
                    <p className="m5-nota">
                      <TextoEditorial id="m5-nota-normalizacion" original="Nota de normalización:" /> {x.nota}
                    </p>
                  ) : null}
                </div>
              ))}
              {!filtro && a.desacuerdos ? (
                <p className="border-t border-[var(--m5-linea)] pt-2.5 text-sm">
                  <strong className="m5-correccion">
                    <TextoEditorial id="m5-puntos-sin-consenso" original="El equipo no alcanzó acuerdo sobre uno o más componentes (identificar brevemente):" />
                  </strong>{" "}
                  {a.desacuerdos}
                </p>
              ) : null}
            </article>
          ))}
          {!acuerdos.length ? <EstadoVacio>Sin ajustes para este filtro.</EstadoVacio> : null}
        </div>
      </div>
    </Tarjeta>
  );
}
