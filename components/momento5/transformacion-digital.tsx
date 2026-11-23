"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { coincideBusqueda } from "@/lib/buscar";
import { formatNumero } from "@/lib/formatters";
import type { DerivadosMomento5 } from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";
import { EstadoVacio, FiltroCategoria, Fuente, Tarjeta } from "./piezas";

/**
 * Los procesos propuestos, uno por fila, con búsqueda y filas que se abren.
 * La categoría y la dificultad las controla el capítulo: elegir una barra en
 * el relato filtra esta tabla, y viceversa.
 */
export function TablaProcesos({
  d,
  cat,
  setCat,
  dif,
  setDif,
}: {
  d: DerivadosMomento5;
  cat: string | null;
  setCat: (id: string | null) => void;
  dif: string | null;
  setDif: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const idTabla = useId();
  const n = d.percepcion.length;
  const nombreCat = Object.fromEntries(d.catProceso.map((c) => [c.id, c.label]));
  const nombreDif = Object.fromEntries(d.dificultades.map((c) => [c.id, c.label]));

  const filas = useMemo(
    () =>
      d.percepcion.filter((p) => {
        if (cat && p.cat !== cat) return false;
        if (dif && !p.difs.includes(dif)) return false;
        // Se busca en el texto unido, como en el dashboard de origen.
        return coincideBusqueda(q, [p.nombre, p.dependencia, p.proceso, p.consiste, p.dificultad, p.afectacion].join(" "));
      }),
    [d.percepcion, cat, dif, q]
  );

  const hayFiltro = Boolean(cat || dif || q);

  return (
    <div className="flex flex-col">
      <Tarjeta
        titulo="Procesos propuestos para transformación digital"
        descripcion="Respuestas individuales. Elige una fila para leer «¿En qué consiste actualmente?» y «¿Cómo afecta el trabajo a los usuarios?»."
        pie={
          <Fuente
            id="m5-fuente-dig-tabla"
            original="respuestas tal como se escribieron a «Participante:», «Dependencia / Unidad Académica», «Proceso propuesto:», «Dificultad percibida», «¿En qué consiste actualmente?» y «¿Cómo afecta el trabajo a los usuarios?». La columna Categoría muestra la codificación de las gráficas anteriores."
          />
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              <TextoEditorial id="m5-buscar" original="Buscar" />
            </span>
            <Input
              className="w-72"
              placeholder="Buscar proceso, dependencia o participante…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar procesos"
            />
          </label>
          <FiltroCategoria etiqueta="Categoría" items={d.catProceso} valor={cat} onCambiar={setCat} />
          <FiltroCategoria etiqueta="Dificultad" items={d.dificultades} valor={dif} onCambiar={setDif} />
          {hayFiltro ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCat(null);
                setDif(null);
                setQ("");
              }}
            >
              <X className="size-3.5" aria-hidden />
              <TextoEditorial id="m5-limpiar" original="Limpiar" />
            </Button>
          ) : null}
          <p className="ml-auto text-sm text-[var(--m5-suave)]" aria-live="polite">
            <span className="m5-cifra font-semibold text-foreground">{formatNumero(filas.length)}</span>{" "}
            <TextoEditorial id="m5-de" original="de" /> {formatNumero(n)} <TextoEditorial id="m5-procesos" original="procesos" />
          </p>
        </div>

        <div className="max-h-[560px] overflow-y-auto border-y border-[var(--m5-linea)]" tabIndex={0} aria-label="Procesos propuestos">
          {filas.length ? (
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-[22%] text-xs"><TextoEditorial id="m5-th-participante" original="Participante:" /></TableHead>
                  <TableHead className="w-[31%] text-xs"><TextoEditorial id="m5-th-proceso" original="Proceso propuesto:" /></TableHead>
                  <TableHead className="w-[29%] text-xs"><TextoEditorial id="m5-th-dificultad" original="Dificultad percibida" /></TableHead>
                  <TableHead className="w-[18%] text-xs"><TextoEditorial id="m5-th-categoria" original="Categoría" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((p) => {
                  const expandida = abierta === p.pid;
                  const idDetalle = `${idTabla}-${p.pid}`;
                  const alternar = () => setAbierta((a) => (a === p.pid ? null : p.pid));
                  return (
                    <Fragment key={p.pid}>
                      <TableRow className="cursor-pointer align-top" onClick={alternar}>
                        <TableCell className="whitespace-normal break-words text-xs">
                          <button
                            type="button"
                            className="flex items-start gap-1 text-left font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            aria-expanded={expandida}
                            aria-controls={idDetalle}
                            onClick={(e) => {
                              e.stopPropagation();
                              alternar();
                            }}
                          >
                            <ChevronDown
                              className={cn("mt-0.5 size-3.5 shrink-0 transition-transform", expandida && "rotate-180")}
                              aria-hidden
                            />
                            {p.nombre}
                          </button>
                          {p.dependencia ? <span className="mt-0.5 block pl-[18px] text-muted-foreground">{p.dependencia}</span> : null}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words text-xs">{p.proceso ?? "—"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-xs">{p.dificultad ?? "—"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-xs">
                          <span className="block">{nombreCat[p.cat] ?? (p.cat || "—")}</span>
                          <span className="block text-muted-foreground">{p.difs.map((x) => nombreDif[x] ?? x).join(" · ")}</span>
                        </TableCell>
                      </TableRow>
                      {expandida ? (
                        <TableRow id={idDetalle} className="bg-muted/40 hover:bg-muted/40">
                          <TableCell />
                          <TableCell className="whitespace-normal break-words align-top text-xs">
                            <b className="block text-foreground">
                              <TextoEditorial id="m5-en-que-consiste" original="¿En qué consiste actualmente?" />
                            </b>
                            {p.consiste ?? "—"}
                          </TableCell>
                          <TableCell colSpan={2} className="whitespace-normal break-words align-top text-xs">
                            <b className="block text-foreground">
                              <TextoEditorial id="m5-como-afecta" original="¿Cómo afecta el trabajo a los usuarios?" />
                            </b>
                            {p.afectacion ?? "—"}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-3">
              <EstadoVacio>Ningún proceso coincide con los filtros.</EstadoVacio>
            </div>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
