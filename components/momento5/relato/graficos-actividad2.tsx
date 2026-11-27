"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SUAVIZADO } from "@/components/nota-metodologica/piezas";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import { categoriaPeriodicidad, type CategoriaPeriodicidad, type TransformacionActividad2 } from "@/lib/reglas/momento5-actividad2";

/** Color de cada periodicidad: verdes para las regulares, gris para las demás. */
export const COLOR_PERIODICIDAD: Record<CategoriaPeriodicidad, string> = {
  Anual: "var(--primary)",
  Semestral: "color-mix(in srgb, var(--primary) 45%, var(--card))",
  Otra: "var(--m5-suave)",
  "Sin dato": "transparent",
};

/**
 * Las mesas de la Actividad 2, en columnas por transformación. Estado 0: solo
 * las mesas; 1: una casilla por indicador propuesto; 2: las casillas toman el
 * color de su periodicidad.
 */
export function MapaMesas({ transformaciones, estado }: { transformaciones: TransformacionActividad2[]; estado: 0 | 1 | 2 }) {
  const reducido = useReducedMotion();
  const total = transformaciones.reduce((s, t) => s + t.mesas.reduce((x, m) => x + m.indicadores.length, 0), 0);
  const mesas = transformaciones.reduce((s, t) => s + t.mesas.length, 0);
  return (
    <div
      role="img"
      aria-label={`${formatNumero(mesas)} mesas en ${formatNumero(transformaciones.length)} transformaciones, con ${formatNumero(total)} indicadores propuestos.`}
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, transformaciones.length)}, minmax(0, 1fr))` }}
    >
      {transformaciones.map((t) => (
        <div key={t.nombre} className="flex min-w-0 flex-col gap-3">
          {/* Alto de dos líneas para todas: «UC Emprendedora e Innovadora» se parte y desalineaba las tarjetas. */}
          <p className="flex min-h-[2.6rem] items-end border-b border-[var(--m5-filete)] pb-2 text-[13px] leading-tight font-semibold text-balance">
            {t.nombre}
          </p>
          {t.mesas.map((m) => (
            <div key={m.mesa} className="flex min-h-28 flex-col gap-2 rounded-md bg-[var(--m5-velo)] px-3 py-3">
              {/* Solo el número: el nombre que algunas mesas se pusieron no se muestra. */}
              <p className="text-sm leading-tight font-semibold">
                <TextoEditorial id="m5-a2-mesa" original="Mesa" /> <span className="m5-cifra">{m.mesa}</span>
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5" aria-hidden>
                {m.indicadores.map((ind, i) => (
                  <motion.span
                    key={ind.orden}
                    className="block size-4 rounded-[3px] border border-[var(--primary)]"
                    initial={false}
                    animate={{
                      opacity: estado > 0 ? 1 : 0,
                      scale: estado > 0 ? 1 : 0.4,
                      backgroundColor: estado === 2 ? COLOR_PERIODICIDAD[categoriaPeriodicidad(ind.periodicidad)] : "var(--primary)",
                    }}
                    transition={{ duration: reducido ? 0 : 0.5, delay: reducido ? 0 : i * 0.08, ease: SUAVIZADO }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Leyenda de la periodicidad, con el recuento de cada categoría. */
export function LeyendaPeriodicidad({ conteos }: { conteos: { id: CategoriaPeriodicidad; value: number }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {conteos.map((c) => (
        <li key={c.id} className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-[2px] border border-[var(--primary)]" style={{ background: COLOR_PERIODICIDAD[c.id] }} aria-hidden />
          {c.id} · <span className="m5-cifra">{formatNumero(c.value)}</span>
        </li>
      ))}
    </ul>
  );
}
