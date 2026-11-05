"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Valor del filtro cuando no se elige nada ("Todas"/"Todos"). */
export const TODAS_LAS_OPCIONES = "__todas__";

/**
 * Un filtro de una sola opción con su etiqueta encima, como los del resto de
 * secciones. El texto del selector cerrado se pinta a mano porque el
 * componente muestra el VALOR crudo: sin esto se leería "__todas__".
 */
export function FiltroOpciones({
  etiqueta,
  valor,
  opciones,
  siTodas,
  ancho,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  opciones: string[];
  /** Qué se lee cuando no hay nada elegido ("Todas", "Todos"). */
  siTodas: string;
  /** Clase de ancho del selector (`w-60`…). */
  ancho: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <Select value={valor} onValueChange={(v) => onCambiar(v ?? TODAS_LAS_OPCIONES)}>
        <SelectTrigger className={ancho}>
          <SelectValue placeholder={siTodas}>
            {(v: string | null) => (
              <span className="min-w-0 truncate">{!v || v === TODAS_LAS_OPCIONES ? siTodas : v}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS_LAS_OPCIONES}>{siTodas}</SelectItem>
          {opciones.map((opcion) => (
            <SelectItem key={opcion} value={opcion}>
              {opcion}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
