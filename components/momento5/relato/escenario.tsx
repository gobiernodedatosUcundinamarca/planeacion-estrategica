"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Alto mínimo del plano fijo. El plano mide el alto de la ventana menos lo que
 * queda encima (`--m5-sobre-plano`: barras fijas y aire) y 2rem de margen, y las
 * gráficas más altas (el mapa de componentes y los temas del MEDIT) miden hasta
 * ~600 px: con 512 px de plano `AjustarAlPlano` las cubre sin bajar de
 * `ESCALA_MINIMA`. Con menos se cortaban.
 */
const ALTO_MINIMO_PLANO = 512;
/** Lo que hay sobre el plano si el panel aún no midió su barra: 13.5rem + 2rem (con 760 px de ventana quedan 512). */
const SOBRE_PLANO_INICIAL = 248;
const ESCALA_MINIMA = 0.85;
/** Margen alrededor de la gráfica para que no se recorten contornos (debe coincidir con momento5.css). */
const HOLGURA = 6;

/**
 * Modo compacto: en el teléfono el sitio se dibuja como escritorio escalado
 * (clase `forzar-escritorio`) y ahí `sticky` no se sostiene; en pantallas bajas
 * el plano fijo no cabe; con «reducir movimiento» no se anima el paso a paso.
 * En esos casos cada paso lleva su propio gráfico, uno debajo del otro.
 *
 * `sobrePlano`: píxeles por encima del plano más su margen inferior, según la
 * barra medida por el panel (su alto cambia con el menú).
 */
export function useCompacto(sobrePlano: number | null = null) {
  const [compacto, setCompacto] = useState(false);
  const encima = sobrePlano ?? SOBRE_PLANO_INICIAL;
  useEffect(() => {
    const movimiento = matchMedia("(prefers-reduced-motion: reduce)");
    const revisar = () =>
      setCompacto(
        document.documentElement.classList.contains("forzar-escritorio") ||
          window.innerHeight - encima < ALTO_MINIMO_PLANO ||
          movimiento.matches
      );
    revisar();
    window.addEventListener("resize", revisar);
    movimiento.addEventListener("change", revisar);
    return () => {
      window.removeEventListener("resize", revisar);
      movimiento.removeEventListener("change", revisar);
    };
  }, [encima]);
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
 * Encoge la gráfica del plano fijo cuando no cabe, para que no se corte: mide
 * su alto natural y la escala hasta el alto del plano, sin bajar de
 * `ESCALA_MINIMA` (más pequeña ya no se lee; ahí el plano conserva su scroll).
 * El ancho no se compensa: si creciera con la escala, los textos se partirían en
 * menos líneas, el alto cambiaría, y con él la escala, en un bucle que hacía
 * parpadear la gráfica. Se centra en el plano. `transform` no altera el layout:
 * el marco toma el alto ya escalado para que el plano la centre bien.
 */
function AjustarAlPlano({ children }: { children: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null);
  const contenido = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState({ escala: 1, alto: 0 });

  useLayoutEffect(() => {
    const m = marco.current;
    const c = contenido.current;
    const plano = m?.parentElement;
    if (!m || !c || !plano) return;
    const medir = () => {
      // `natural` incluye la holgura de `.m5-plano-contenido`, y el marco la gana con su margen negativo.
      const natural = c.offsetHeight;
      const disponible = plano.clientHeight + 2 * HOLGURA;
      const escala = Math.max(ESCALA_MINIMA, Math.min(1, disponible / Math.max(natural, 1)));
      // Tolerancia: al cambiar el ancho interior cambia el alto, y sin ella podría oscilar.
      setMedida((previa) =>
        Math.abs(previa.escala - escala) < 0.01 && Math.abs(previa.alto - natural) < 2 ? previa : { escala, alto: natural }
      );
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(c);
    observador.observe(plano);
    return () => observador.disconnect();
  }, []);

  const { escala, alto } = medida;
  // El navegador sigue contando el alto sin escalar como desplazable: si la gráfica
  // ya cabe, se oculta ese sobrante para que no aparezca una barra hacia el vacío.
  const cabe = escala > ESCALA_MINIMA;
  return (
    <div
      ref={marco}
      className="m5-plano-marco"
      style={escala < 1 ? { height: alto * escala, overflow: cabe ? "hidden" : undefined } : undefined}
    >
      <div
        ref={contenido}
        className="m5-plano-contenido"
        style={escala < 1 ? { transform: `scale(${escala})`, transformOrigin: "top center" } : undefined}
      >
        {children}
      </div>
    </div>
  );
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
      {!compacto ? (
        <div className="m5-plano">
          <AjustarAlPlano>{grafico(paso)}</AjustarAlPlano>
        </div>
      ) : null}
    </div>
  );
}
