import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { coloresEscala, type ConteoOpcion } from "@/lib/reglas/formularios";

/**
 * Una pregunta de escala (frecuencia, nivel, grado de claridad…) en barras con
 * su orden fijo, de la opción más alta a la más baja. No se usa el gráfico
 * ordenado por tamaño (`RankedBarChart`) porque en una escala reordenar rompe la
 * lectura: "Esporádicamente" no puede quedar arriba de "Todos los días" solo por
 * tener más respuestas. Va con la rampa ordinal del proyecto, como el respaldo
 * de las transformaciones.
 */
export function BarrasEscala({
  titulo,
  descripcion,
  niveles,
}: {
  titulo: string;
  descripcion?: string;
  niveles: (ConteoOpcion & { fueraDeEscala: boolean })[];
}) {
  const colores = coloresEscala(niveles);
  const total = niveles.reduce((suma, n) => suma + n.conteo, 0);
  const maximo = Math.max(1, ...niveles.map((n) => n.porcentaje));

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-[13px] font-semibold leading-tight text-foreground">{titulo}</h3>
        {descripcion ? <p className="mt-0.5 text-[11px] text-muted-foreground">{descripcion}</p> : null}
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground"><TextoEditorial id="4a999d88d110da178184" original={"Sin respuestas."}/></p>
      ) : (
        <ul className="flex flex-col gap-2">
          {niveles.map((nivel, i) => (
            <li key={nivel.etiqueta} className="grid grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-3 text-xs">
              <span
                className={nivel.fueraDeEscala ? "text-muted-foreground" : "text-foreground"}
                title={nivel.etiqueta}
              >
                {nivel.etiqueta}
              </span>
              <span className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${nivel.conteo > 0 ? Math.max((nivel.porcentaje / maximo) * 100, 2) : 0}%`,
                    background: colores[i],
                  }}
                />
              </span>
              <span className="w-24 text-right tabular-nums">
                <span className="font-semibold text-foreground">{formatPorcentaje(nivel.porcentaje)}</span>
                <span className="text-muted-foreground"> · {formatNumero(nivel.conteo)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
