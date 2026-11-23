"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Modo compacto: en el teléfono el sitio se dibuja como escritorio escalado
 * (clase `forzar-escritorio`) y ahí `sticky` no se sostiene; en pantallas bajas
 * el plano fijo no cabe; con «reducir movimiento» no se anima el paso a paso.
 * En esos casos cada paso lleva su propio gráfico, uno debajo del otro.
 */
export function useCompacto() {
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    const movimiento = matchMedia("(prefers-reduced-motion: reduce)");
    const revisar = () =>
      setCompacto(
        document.documentElement.classList.contains("forzar-escritorio") || window.innerHeight < 620 || movimiento.matches
      );
    revisar();
    window.addEventListener("resize", revisar);
    movimiento.addEventListener("change", revisar);
    return () => {
      window.removeEventListener("resize", revisar);
      movimiento.removeEventListener("change", revisar);
    };
  }, []);
  return compacto;
}

/**
 * El paso cuyo bloque cruza la mitad de la pantalla. Se mide con
 * `getBoundingClientRect` y no con IntersectionObserver por el mismo motivo
 * que `useAlEntrar` de la nota metodológica: en WebKit móvil, con el
 * escritorio escalado, el observador solo ve la franja superior.
 */
function usePaso(cantidad: number, activo: boolean) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (!activo) return;
    let pendiente = 0;
    const medir = () => {
      pendiente = 0;
      const linea = window.innerHeight * 0.5;
      let mejor = 0;
      let distancia = Infinity;
      refs.current.slice(0, cantidad).forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = r.top <= linea && r.bottom >= linea ? 0 : Math.min(Math.abs(r.top - linea), Math.abs(r.bottom - linea));
        if (d < distancia) {
          distancia = d;
          mejor = i;
        }
      });
      setPaso(mejor);
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
  }, [cantidad, activo]);

  return { refs, paso };
}

/**
 * Pasos de texto que avanzan con el scroll y un plano fijo que cambia de
 * estado con ellos. `grafico(i)` dibuja el estado del paso i.
 */
export function Escenario({
  pasos,
  grafico,
  compacto,
}: {
  pasos: ReactNode[];
  grafico: (paso: number) => ReactNode;
  compacto: boolean;
}) {
  const { refs, paso } = usePaso(pasos.length, !compacto);
  return (
    <div className="m5-escenario" data-compacto={compacto}>
      <div className="m5-pasos">
        {pasos.map((contenido, i) => (
          <div
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="m5-paso"
            data-activo={!compacto && paso === i}
          >
            <div className="flex flex-col gap-4">{contenido}</div>
            {compacto ? <div>{grafico(i)}</div> : null}
          </div>
        ))}
      </div>
      {!compacto ? <div className="m5-plano">{grafico(paso)}</div> : null}
    </div>
  );
}
