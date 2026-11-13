import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { cn } from "@/lib/utils";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import type { AnalisisOtro } from "@/types/encuesta";

/**
 * Lectura analítica de las respuestas abiertas ("Otro"): distribución por
 * categoría temática (con descripción y una cita representativa por tema) y
 * conclusión del análisis cualitativo.
 *
 * El gráfico y la lista de categorías son clickeables: seleccionar una
 * categoría (clic en la barra o en el tema de la lista) filtra el panel de
 * "Respuestas abiertas" que se muestra debajo, vía el estado compartido
 * `categoriaSeleccionada`/`onSeleccionarCategoria` que administra el
 * componente padre.
 */
export function AnalisisOtroCards({
  analisis,
  categoriaSeleccionada,
  onSeleccionarCategoria,
}: {
  analisis: AnalisisOtro;
  categoriaSeleccionada: string | null;
  onSeleccionarCategoria: (id: string | null) => void;
}) {
  const conCitas = analisis.categorias.filter((c) => c.conteo > 0);
  const nombrePorId = new Map(analisis.categorias.map((c) => [c.id, c.nombre]));
  const idPorNombre = new Map(analisis.categorias.map((c) => [c.nombre, c.id]));
  const nombreSeleccionado = categoriaSeleccionada ? nombrePorId.get(categoriaSeleccionada) : null;

  function alternar(id: string) {
    onSeleccionarCategoria(categoriaSeleccionada === id ? null : id);
  }

  return (
    <>
      <Card className="py-3">
        <CardHeader className="px-3.5 pb-1">
          <CardTitle className="text-[13px]"><TextoEditorial id="6e9543a5ebcf97fc4d1a" original={"Categorización de las respuestas abiertas"}/></CardTitle>
          <p className="text-[11px] text-muted-foreground">
            <TextoEditorial id="0252d25b954eac2ba17b" original={"Los"}/> {formatNumero(analisis.total)} <TextoEditorial id="7e03044df58b9f948e5a" original={"aportes de texto libre, agrupados en"}/>{conCitas.length} <TextoEditorial id="facfa4130d3324686d9b" original={"temas. Clic en un tema para filtrar las respuestas de abajo."}/></p>
        </CardHeader>
        <CardContent className="px-3.5">
          <div className="grid grid-cols-2 gap-6">
            <RankedBarChart
              titulo=""
              datos={analisis.categorias.map((c) => ({
                etiqueta: c.nombre,
                conteo: c.conteo,
                porcentaje: c.porcentaje,
              }))}
              alturaFila={40}
              truncarEn={44}
              ocultarAccion
              etiquetaSeleccionada={nombreSeleccionado ?? null}
              onSeleccionarBarra={(etiqueta) => {
                const id = idPorNombre.get(etiqueta);
                if (id) alternar(id);
              }}
            />
            <ul className="flex flex-col gap-3">
              {conCitas.map((c) => {
                const activa = categoriaSeleccionada === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => alternar(c.id)}
                      aria-pressed={activa}
                      className={cn(
                        "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors",
                        activa ? "bg-secondary ring-1 ring-primary/40" : "hover:bg-muted/60"
                      )}
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {c.nombre}{" "}
                        <span className="font-normal tabular-nums text-muted-foreground">
                          · {formatNumero(c.conteo)} ({formatPorcentaje(c.porcentaje)})
                        </span>
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">{c.descripcion}</p>
                      {c.citas[0] ? (
                        <p className="text-[11px] italic leading-relaxed text-muted-foreground/80">
                          &ldquo;{c.citas[0]}&rdquo;
                        </p>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="py-3">
        <CardHeader className="px-3.5 pb-1">
          <CardTitle className="text-[13px]"><TextoEditorial id="c9425fe582987aee0c26" original={"Conclusión"}/></CardTitle>
          <p className="text-[11px] text-muted-foreground">
            <TextoEditorial id="61078df34507bd7580af" original={"Lectura general de los aportes abiertos y su implicación para el Plan Estratégico 2027–2037."}/></p>
        </CardHeader>
        <CardContent className="px-3.5">
          <p className="border-l-2 border-primary pl-3 text-sm leading-relaxed text-foreground">
            {analisis.conclusion}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
