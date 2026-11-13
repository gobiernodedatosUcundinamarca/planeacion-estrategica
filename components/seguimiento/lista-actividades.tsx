"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumero } from "@/lib/formatters";
import { numeroActividad } from "@/lib/participantes";
import { MiniPastel } from "@/components/seguimiento/mini-pastel";
import type { Actividad } from "@/types/cai";

interface ListaActividadesProps {
  actividades: Actividad[];
  totalParticipantes: number;
  onVolver: () => void;
  onSeleccionar: (actividad: Actividad) => void;
}

export function ListaActividades({
  actividades,
  totalParticipantes,
  onVolver,
  onSeleccionar,
}: ListaActividadesProps) {
  // Agrupa preservando el orden original de las columnas del Excel
  const grupos = new Map<string, Actividad[]>();
  for (const actividad of actividades) {
    const grupo = grupos.get(actividad.etiquetaMomento) ?? [];
    grupo.push(actividad);
    grupos.set(actividad.etiquetaMomento, grupo);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onVolver}>
          <ArrowLeft className="size-4" aria-hidden />
          Volver al resumen
        </Button>
        <p className="text-sm text-muted-foreground">
          {formatNumero(actividades.length)} <TextoEditorial id="2b697af65f4e48e7c6f2" original={"actividades · haz click en una actividad para ver quién la finalizó y quién no"}/></p>
      </div>

      {[...grupos.entries()].map(([momento, items]) => (
        <section key={momento} aria-label={momento}>
          <h2 className="font-heading text-lg font-semibold text-foreground">{momento}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((actividad) => (
              <Card key={actividad.id} className="overflow-hidden border-border/70 py-0">
                <button
                  type="button"
                  onClick={() => onSeleccionar(actividad)}
                  aria-label={`Ver participantes de ${actividad.nombre}`}
                  className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left outline-none transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50"
                >
                  <Badge variant="secondary" className="inline-flex shrink-0">
                    {actividad.etiquetaMomento}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {(() => {
                        const numero = numeroActividad(actividad.id);
                        if (!numero) return actividad.nombre;
                        if (numero === actividad.nombre) return numero;
                        return `${numero} · ${actividad.nombre}`;
                      })()}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" aria-hidden />
                      <span className="tabular-nums">
                        {formatNumero(actividad.finalizados)}/{formatNumero(totalParticipantes)} finalizaron
                        {actividad.noFinalizados > 0
                          ? ` · ${formatNumero(actividad.noFinalizados)} pendiente${actividad.noFinalizados === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                  </span>
                  <MiniPastel porcentaje={actividad.porcentajeFinalizacion} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
