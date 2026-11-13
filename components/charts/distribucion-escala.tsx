import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { coloresEscala, type ConteoOpcion } from "@/lib/reglas/formularios";

export interface FilaDistribucion {
  etiqueta: string;
  /** Texto completo de la pregunta, si la etiqueta es una versión corta. */
  detalle?: string;
  niveles: (ConteoOpcion & { fueraDeEscala: boolean })[];
  /** La cifra que resume la fila (p. ej. "% de acuerdo"), a la derecha. */
  resumen: number;
}

/**
 * Varias preguntas con la misma escala, una barra apilada al 100 % por
 * pregunta: deja comparar de un vistazo dónde se concentra el acuerdo (o el
 * dominio) y dónde no. La leyenda va una sola vez arriba, porque todas las
 * filas comparten niveles y colores.
 */
export function DistribucionEscala({
  filas,
  etiquetaResumen,
}: {
  filas: FilaDistribucion[];
  /** Qué mide la cifra de la derecha ("De acuerdo", "Alta o muy alta"). */
  etiquetaResumen: string;
}) {
  const niveles = filas[0]?.niveles ?? [];
  const colores = coloresEscala(niveles);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {niveles.map((nivel, i) => (
          <li key={nivel.etiqueta} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colores[i] }} aria-hidden />
            {nivel.etiqueta}
          </li>
        ))}
        <li className="ml-auto font-medium text-foreground">{etiquetaResumen}</li>
      </ul>

      <ul className="flex flex-col gap-3">
        {filas.map((fila) => {
          const total = fila.niveles.reduce((suma, n) => suma + n.conteo, 0);
          return (
            <li key={fila.etiqueta} className="grid grid-cols-[minmax(0,16rem)_1fr_4.5rem] items-center gap-3">
              <span className="text-xs leading-snug text-foreground" title={fila.detalle ?? fila.etiqueta}>
                {fila.etiqueta}
                <span className="block text-[11px] text-muted-foreground">{formatNumero(total)} <TextoEditorial id="729a715a96ebba7dadb5" original={"respuestas"}/></span>
              </span>
              <span className="flex h-6 w-full overflow-hidden rounded-md bg-muted">
                {fila.niveles.map((nivel, i) =>
                  nivel.conteo > 0 ? (
                    <span
                      key={nivel.etiqueta}
                      className="flex h-full items-center justify-center text-[10px] font-semibold text-white"
                      style={{ width: `${nivel.porcentaje}%`, background: colores[i] }}
                      title={`${nivel.etiqueta}: ${formatNumero(nivel.conteo)} (${formatPorcentaje(nivel.porcentaje)})`}
                    >
                      {/* El número dentro solo si cabe: en un tramo angosto
                          taparía el borde y no se leería. */}
                      {nivel.porcentaje >= 8 ? formatPorcentaje(nivel.porcentaje) : null}
                    </span>
                  ) : null
                )}
              </span>
              <span className="text-right font-heading text-base font-semibold tabular-nums text-foreground">
                {formatPorcentaje(fila.resumen)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
