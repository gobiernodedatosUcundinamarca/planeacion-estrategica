"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PreguntaId } from "@/types/encuesta";

export interface RespuestaOtro {
  personaId: number;
  preguntaId: PreguntaId;
  texto: string;
  categoriaId: string;
}

export interface CategoriaFiltro {
  id: string;
  nombre: string;
}

const ETIQUETA_PREGUNTA: Record<PreguntaId, string> = {
  P1: "P1",
  P2: "P2",
  P3: "P3 · decisiones a futuro",
  P4: "P4 · visión a 10 años",
};

const TODAS_LAS_CATEGORIAS = "__todas__";

export function OtroPanel({
  respuestas,
  categorias,
  categoriaSeleccionada,
  onCambiarCategoria,
}: {
  respuestas: RespuestaOtro[];
  categorias: CategoriaFiltro[];
  categoriaSeleccionada: string | null;
  onCambiarCategoria: (id: string | null) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return respuestas.filter((r) => {
      if (categoriaSeleccionada && r.categoriaId !== categoriaSeleccionada) return false;
      if (q && !r.texto.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [busqueda, respuestas, categoriaSeleccionada]);

  const nombreCategoriaActiva = categorias.find((c) => c.id === categoriaSeleccionada)?.nombre;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en las respuestas abiertas…"
            className="pl-9"
            aria-label="Buscar en respuestas de tipo Otro"
          />
        </div>
        <Select
          value={categoriaSeleccionada ?? TODAS_LAS_CATEGORIAS}
          onValueChange={(v) => onCambiarCategoria(v === TODAS_LAS_CATEGORIAS ? null : v)}
        >
          <SelectTrigger className="w-[260px]" aria-label="Filtrar por categoría temática">
            <SelectValue placeholder="Todas las categorías">
              {(v: string | null) => (
                <span className="min-w-0 truncate">
                  {v && v !== TODAS_LAS_CATEGORIAS
                    ? (categorias.find((c) => c.id === v)?.nombre ?? "Todas las categorías")
                    : "Todas las categorías"}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS_LAS_CATEGORIAS}>Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {filtradas.length} de {respuestas.length} <TextoEditorial id="ed8d73074efc7d433027" original={"respuestas de texto libre ("}/><TextoEditorial id="2bbe99a2f9098374edc3" original={"“Otro”"}/>)
        </p>
        {nombreCategoriaActiva ? (
          <Badge variant="secondary" className="gap-1 pr-1 text-[11px]">
            {nombreCategoriaActiva}
            <Button
              variant="ghost"
              size="icon"
              className="size-4 rounded-full hover:bg-primary/15"
              onClick={() => onCambiarCategoria(null)}
              aria-label="Quitar filtro de categoría"
            >
              <X className="size-3" />
            </Button>
          </Badge>
        ) : null}
      </div>

      <ScrollArea className="h-[420px] rounded-lg border border-border">
        <ul className="divide-y divide-border">
          {filtradas.map((r, i) => (
            <li key={`${r.personaId}-${i}`} className={cn("flex flex-col gap-1.5 px-4 py-3")}>
              <Badge variant="outline" className="w-fit text-[10px] font-medium">
                {ETIQUETA_PREGUNTA[r.preguntaId]}
              </Badge>
              <p className="text-sm leading-relaxed text-foreground">{r.texto}</p>
            </li>
          ))}
          {filtradas.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              <TextoEditorial id="be5a399aacd87a7fc559" original={"No hay respuestas que coincidan con la búsqueda."}/></li>
          ) : null}
        </ul>
      </ScrollArea>
    </div>
  );
}
