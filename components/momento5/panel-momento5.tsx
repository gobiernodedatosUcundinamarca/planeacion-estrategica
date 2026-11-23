"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { FiltroOpciones, TODAS_LAS_OPCIONES } from "@/components/layout/filtro-opciones";
import { Button } from "@/components/ui/button";
import { derivarMomento5, fechaLarga, ordenAplicacion, type FiltroEquipo } from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
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
 * Resultados del Momento 5: los formularios uno tras otro, en el orden en que
 * se aplicaron, cada uno con su relato y su clasificación. El menú lleva a
 * cada formulario y marca el que se está leyendo. Las animaciones respetan
 * «reducir movimiento» del sistema.
 */
export function PanelMomento5({ datos, abiertas }: { datos: ResultadosMomento5; abiertas: PreguntaAbiertaMomento5[] }) {
  const formularios = ordenAplicacion(datos.meta.formularios).filter((f) => SECCION_DE_FORMULARIO[f.id]);
  const [equipo, setEquipo] = useState<FiltroEquipo>(null);
  const d = useMemo(() => derivarMomento5(datos, equipo), [datos, equipo]);
  const reducido = useReducedMotion();
  const barra = useRef<HTMLDivElement>(null);
  const formulario = useFormularioActual(
    formularios.map((f) => f.id),
    barra
  );

  const jornadas = [...new Set(formularios.map((f) => f.fecha))].map((fecha) => ({
    fecha,
    formularios: formularios.filter((f) => f.fecha === fecha),
  }));

  const elegir = (id: string) => {
    document.getElementById(SECCION_DE_FORMULARIO[id])?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <h1 className="sr-only">
        <TextoEditorial id="m5-titulo" original="Resultados de las actividades del 17 y 18 de noviembre de 2026" />
      </h1>
      {/* Fondo opaco: con transparencia, el texto de debajo se lee a través de la barra. */}
      <div
        ref={barra}
        className="sticky top-16 z-40 -mx-2 flex items-end gap-10 border-b border-[var(--m5-linea)] bg-background px-2 pt-2 pb-3"
      >
        {/* El nombre de cada formulario tal como lo vieron quienes respondieron, para que lo reconozcan. */}
        <nav aria-label="Formularios" className="min-w-0 flex-1">
          <ul className="flex items-start gap-10">
            {jornadas.map((j) => (
              <li key={j.fecha} className="flex flex-col gap-1">
                <span className="text-xs text-[var(--m5-suave)]">{fechaLarga(j.fecha)}</span>
                <div className="flex flex-col items-start gap-0.5">
                  {j.formularios.map((f) => {
                    const activo = f.id === formulario;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-current={activo ? "location" : undefined}
                        onClick={() => elegir(f.id)}
                        className={cn(
                          "border-l-2 pl-2 text-left text-[13px] leading-snug font-semibold transition-colors",
                          activo
                            ? "border-[var(--m5-tinta)] text-[var(--m5-tinta)]"
                            : "border-transparent text-[var(--m5-suave)] hover:text-[var(--m5-tinta)]"
                        )}
                      >
                        {f.nombre}
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

      <RelatoMomento5 d={d} datos={datos} abiertas={abiertas} equipo={equipo} />
    </MotionConfig>
  );
}
