"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useState } from "react";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { AvatarConferencista } from "@/components/conferencistas/avatar-conferencista";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ConferenciaConValoracion } from "@/types/conferencistas";

/**
 * Lista de acceso rápido, en el mismo orden cronológico del carrusel: cada
 * fila es un atajo directo a su card, sin buscador (con 12 conferencistas
 * todas caben listadas). Colapsada por defecto para no competir en espacio
 * con el carrusel — el usuario la despliega solo si la necesita.
 */
export function NavegacionRapidaConferencistas({
  conferencias,
  onSeleccionar,
}: {
  conferencias: ConferenciaConValoracion[];
  onSeleccionar: (id: number) => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <Collapsible open={abierta} onOpenChange={setAbierta}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-sm font-semibold text-foreground">
          <TextoEditorial id="218e4d76c6f4ac700159" original={"Jornadas de Diálogo Estratégico"}/><span className="font-normal text-muted-foreground">({conferencias.length})</span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", abierta && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ol className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {conferencias.map((c, indice) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(c.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary/5"
              >
                <span className="w-6 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                  {indice + 1}
                </span>
                <AvatarConferencista conferencia={c} tamaño={32} sinFloral />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium text-primary">{c.jornada}</span>
                  <span className="block truncate text-sm font-medium text-foreground">{c.nombre}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {c.fecha}
                </span>
                <span className="inline-flex w-32 shrink-0 items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {c.ubicacion}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
