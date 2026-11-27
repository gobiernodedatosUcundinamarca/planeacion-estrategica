"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MousePointerClick, X } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { FiltroOpciones, TODAS_LAS_OPCIONES } from "@/components/layout/filtro-opciones";
import { Button } from "@/components/ui/button";
import { derivarMomento5, type FiltroEquipo } from "@/lib/reglas/momento5";
import { gruposPorActividad } from "@/lib/reglas/momento5-actividad2";
import { cn } from "@/lib/utils";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import type { Actividad2Momento5 } from "@/types/momento5-actividad2";
import type { KahootMomento5 } from "@/types/momento5-kahoot";
import { RelatoMomento5, SECCION_DE_FORMULARIO } from "./relato/relato-momento5";

const etiquetaEquipo = (n: number) => `Equipo ${n}`;

/**
 * El formulario que se está leyendo: el último cuya sección ya llegó debajo de
 * la barra. Se mide con `getBoundingClientRect` (no IntersectionObserver), por
 * el mismo motivo que los pasos del relato: en WebKit móvil, con el escritorio
 * escalado, el observador solo ve la franja superior.
 */
function useFormularioActual(ids: string[], barra: React.RefObject<HTMLDivElement | null>) {
  const [actual, setActual] = useState(ids[0] ?? "");
  const clave = ids.join("|");
  useEffect(() => {
    let pendiente = 0;
    const medir = () => {
      pendiente = 0;
      // En el teléfono la barra no queda fija (marco escalado) y su borde sale de la pantalla:
      // se toma el mayor entre ese borde y 0, más un tercio largo de la pantalla.
      const limite = Math.max(barra.current?.getBoundingClientRect().bottom ?? 0, 0) + window.innerHeight * 0.3;
      let elegido = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(SECCION_DE_FORMULARIO[id]);
        if (el && el.getBoundingClientRect().top <= limite) elegido = id;
      }
      setActual(elegido);
    };
    const pedir = () => {
      if (!pendiente) pendiente = requestAnimationFrame(medir);
    };
    pedir();
    window.addEventListener("scroll", pedir, { capture: true, passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      if (pendiente) cancelAnimationFrame(pendiente);
      window.removeEventListener("scroll", pedir, { capture: true });
      window.removeEventListener("resize", pedir);
    };
    // `clave` resume `ids`: el arreglo se recrea en cada render con el mismo contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, barra]);
  return actual;
}

/**
 * Fija `--m5-sobre-plano` (momento5.css) con el alto real de la barra: el
 * plano fijo del relato y el destino de cada enlace del menú quedan justo
 * debajo de ella. Con tres actividades y nombres largos la barra mide más que
 * el valor fijo de antes y tapaba la parte de arriba de las gráficas. Se mide
 * `offsetHeight` (sin la escala del escritorio), en las mismas unidades del CSS.
 *
 * Devuelve, en píxeles, lo que queda encima del plano más su margen inferior
 * (2rem), para que el relato decida si el plano fijo cabe (`useCompacto`).
 */
function useSobrePlano(barra: React.RefObject<HTMLDivElement | null>): number | null {
  const [encima, setEncima] = useState<number | null>(null);
  useEffect(() => {
    const el = barra.current;
    const seccion = el?.closest<HTMLElement>(".m5");
    if (!el || !seccion) return;
    const fijar = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // 4rem de la barra del portal (top-16) + la barra de la sección + 1.5rem de aire.
      seccion.style.setProperty("--m5-sobre-plano", `calc(5.5rem + ${el.offsetHeight}px)`);
      setEncima(Math.round(7.5 * rem + el.offsetHeight));
    };
    fijar();
    const observador = new ResizeObserver(fijar);
    observador.observe(el);
    return () => observador.disconnect();
  }, [barra]);
  return encima;
}

/**
 * Resultados del Momento 5: los formularios uno tras otro, en el orden en que
 * se aplicaron, cada uno con su relato y su clasificación. El menú lleva a
 * cada formulario y marca el que se está leyendo. Las animaciones respetan
 * «reducir movimiento» del sistema.
 */
export function PanelMomento5({
  datos,
  abiertas,
  a2,
  kahoot,
}: {
  datos: ResultadosMomento5;
  abiertas: PreguntaAbiertaMomento5[];
  a2: Actividad2Momento5 | null;
  kahoot: KahootMomento5 | null;
}) {
  // Actividad 1, 2 y 3, en el orden de la jornada; solo lo que tiene sección.
  const jornadas = gruposPorActividad(datos.meta.formularios, a2?.instrumentos ?? [], kahoot !== null)
    .map((g) => ({ ...g, secciones: g.secciones.filter((s) => SECCION_DE_FORMULARIO[s.id]) }))
    .filter((g) => g.secciones.length > 0);
  const [equipo, setEquipo] = useState<FiltroEquipo>(null);
  const d = useMemo(() => derivarMomento5(datos, equipo), [datos, equipo]);
  const reducido = useReducedMotion();
  const barra = useRef<HTMLDivElement>(null);
  const formulario = useFormularioActual(
    jornadas.flatMap((j) => j.secciones.map((s) => s.id)),
    barra
  );
  const sobrePlano = useSobrePlano(barra);

  const elegir = (id: string) => {
    document.getElementById(SECCION_DE_FORMULARIO[id])?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* El título (h1) va en la portada, antes de este panel. */}
      {/* Fondo opaco: con transparencia, el texto de debajo se lee a través de la barra. */}
      <div
        ref={barra}
        className="sticky top-16 z-40 -mx-2 flex items-end gap-10 border-b border-[var(--m5-linea)] bg-background px-2 pt-2 pb-3"
      >
        {/* El nombre de cada formulario tal como lo vieron quienes respondieron, para que lo reconozcan.
            Antes el activo solo llevaba un filete gris de 2 px y no se notaba que el menú llevara a
            ninguna parte: ahora lo dice una instrucción, cada nombre reacciona al puntero y el activo
            va sobre un fondo verde que se desliza de un formulario a otro al recorrer la página. */}
        <nav aria-label="Formularios" className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--m5-tinta)]">
            <MousePointerClick className="size-3.5 shrink-0 text-primary" aria-hidden />
            <TextoEditorial
              id="m5-menu-ayuda"
              original="Haz clic en un formulario para ir a su sección; el que estás leyendo queda resaltado en verde."
            />
          </p>
          <ul className="flex items-start gap-6">
            {jornadas.map((j) => (
              // Los nombres largos se parten en dos líneas en vez de empujar al filtro. La Actividad 2 tiene
              // cuatro nombres y los más largos: su columna es más ancha para que la barra no crezca de más.
              <li key={j.actividad} className={cn("flex min-w-0 flex-col gap-1", j.actividad === 2 ? "flex-[1.35]" : "flex-1")}>
                <span className="pl-2 text-xs text-[var(--m5-suave)]">
                  <TextoEditorial id="m5-menu-actividad" original="Actividad" /> {j.actividad}
                </span>
                <div className="flex flex-col items-start">
                  {j.secciones.map((f) => {
                    const activo = f.id === formulario;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-current={activo ? "location" : undefined}
                        onClick={() => elegir(f.id)}
                        className={cn(
                          "group relative isolate flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-left text-[13px] leading-tight font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                          activo
                            ? "text-primary-foreground"
                            : "text-[var(--m5-suave)] hover:bg-[var(--m5-velo)] hover:text-[var(--m5-tinta)]"
                        )}
                      >
                        {/* Un solo fondo para todo el menú (layoutId): se desliza al formulario activo. */}
                        {activo ? (
                          <motion.span
                            layoutId="m5-formulario-activo"
                            className="absolute inset-0 -z-10 rounded-md bg-primary"
                            transition={{ type: "spring", stiffness: 420, damping: 36 }}
                            aria-hidden
                          />
                        ) : null}
                        {f.nombre}
                        <ArrowRight
                          className={cn(
                            "size-3.5 shrink-0 transition-[opacity,translate] motion-reduce:transition-none",
                            activo ? "hidden" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                          )}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex shrink-0 items-end gap-2">
          <FiltroOpciones
            etiqueta="Equipo"
            valor={equipo === null ? TODAS_LAS_OPCIONES : etiquetaEquipo(equipo)}
            opciones={datos.equipos.map((e) => etiquetaEquipo(e.equipo))}
            siTodas="Todos"
            ancho="w-36"
            onCambiar={(valor) => setEquipo(datos.equipos.find((e) => etiquetaEquipo(e.equipo) === valor)?.equipo ?? null)}
          />
          {equipo !== null ? (
            <Button variant="ghost" size="sm" onClick={() => setEquipo(null)}>
              <X className="size-3.5" aria-hidden />
              <TextoEditorial id="m5-limpiar" original="Limpiar" />
            </Button>
          ) : null}
        </div>
      </div>

      <RelatoMomento5 d={d} datos={datos} abiertas={abiertas} equipo={equipo} a2={a2} kahoot={kahoot} sobrePlano={sobrePlano} />
    </MotionConfig>
  );
}
