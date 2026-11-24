"use client";

import { EtiquetaEditorial, useTextoEditorial } from "@/components/editorial/texto-editorial";
import { cn } from "@/lib/utils";

/**
 * «[sic]» al final de una respuesta citada: avisa que se transcribe tal como la
 * escribió quien respondió, con su ortografía y su redacción, y que los errores
 * no son de la transcripción. Corchetes en redonda y «sic» en cursiva, por ser
 * un latinismo (Ortografía de la RAE). El título explica la marca a quien no la
 * conoce.
 */
export function Sic({ className }: { className?: string }) {
  const explicacion = useTextoEditorial("sic-explicacion", "Así en el original: se transcribe sin corregir.");
  return (
    <span className={cn("whitespace-nowrap text-[0.85em] text-muted-foreground", className)} title={explicacion}>
      [<i>
        <EtiquetaEditorial texto="sic" />
      </i>]
    </span>
  );
}
