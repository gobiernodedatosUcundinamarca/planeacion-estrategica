"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAlEntrar } from "@/components/nota-metodologica/piezas";
import { disponerNube } from "@/lib/reglas/momento5-actividad2";
import type { FraseNube } from "@/types/momento5-actividad2";

/** Tamaño de letra (unidades del dibujo) y peso de cada nivel de Mentimeter. */
const LETRA: Record<number, { tamano: number; peso: number }> = {
  3: { tamano: 60, peso: 700 },
  2: { tamano: 31, peso: 600 },
  1: { tamano: 20, peso: 500 },
};

/**
 * Más ancha que alta, como la de Mentimeter, pero sin estirarla tanto que la
 * letra quede diminuta. Con pocas frases la espiral debe abrirse más hacia los
 * lados: cada frase es unas diez veces más ancha que alta y, si no, se apilan
 * en una columna.
 */
const proporcionPara = (cantidad: number) => (cantidad <= 15 ? 4.5 : 2);

/**
 * Colores de la sección: el verde institucional para lo grande y, en lo
 * pequeño, tinta, verde y gris alternados para que la nube no quede plana.
 * Todos superan 4,5:1 sobre el fondo.
 */
const VERDE_OSCURO = "color-mix(in srgb, var(--primary) 72%, var(--foreground))";
const COLOR_GRANDE = ["var(--primary)", VERDE_OSCURO];
const COLOR_PEQUENO = ["var(--m5-tinta)", "var(--primary)", "var(--m5-suave)", VERDE_OSCURO];

const letraDe = (f: FraseNube, factor: number) => {
  const { tamano, peso } = LETRA[f.tamano] ?? LETRA[1];
  return { tamano: tamano * factor, peso };
};

/**
 * Ancho de cada frase medido en un SVG invisible que no se anima, con la misma
 * letra que la nube. Con un canvas la medida no coincidía con lo que dibuja el
 * SVG; medir sobre la nube visible tampoco sirve, porque mientras entran las
 * frases su escala cambia, la nube se reacomodaba sin parar y se encimaban.
 * Se mide al estar lista la fuente y cada vez que termina de cargar otra (los
 * pesos que nada había usado llegan después de `document.fonts.ready`); si
 * ningún ancho cambió, no se reacomoda.
 */
function useAnchos(cantidad: number) {
  const medidor = useRef<SVGSVGElement>(null);
  const [anchos, setAnchos] = useState<number[] | null>(null);
  const medir = useCallback(() => {
    const textos = medidor.current?.querySelectorAll<SVGTextElement>("text");
    if (!textos || textos.length !== cantidad) return;
    const nuevos = [...textos].map((t) => t.getBBox().width);
    setAnchos((previos) => (previos && previos.every((a, i) => Math.abs(a - nuevos[i]) < 0.5) ? previos : nuevos));
  }, [cantidad]);
  useEffect(() => {
    let vigente = true;
    const alCargar = () => {
      if (vigente) medir();
    };
    document.fonts.ready.then(alCargar);
    document.fonts.addEventListener("loadingdone", alCargar);
    return () => {
      vigente = false;
      document.fonts.removeEventListener("loadingdone", alCargar);
    };
  }, [medir]);
  return { medidor, anchos };
}

interface FraseDispuesta extends FraseNube {
  /** Turno de entrada en la animación: la más grande primero, de adentro hacia afuera. */
  turno: number;
  x: number;
  y: number;
  tamano: number;
  peso: number;
  ancho: number;
  color: string;
}

/**
 * Nube de frases de Mentimeter, redibujada con los colores de la sección: la
 * frase más grande al centro y las demás alrededor, horizontales para que se
 * lean (`disponerNube`). Todas las frases aparecen: la espiral busca sitio
 * hasta encontrarlo y el dibujo se escala al ancho disponible. El tamaño
 * reproduce el de la imagen de Mentimeter en tres niveles; no es un conteo.
 *
 * Las frases entran una tras otra, de la más grande a la más pequeña, al
 * llegar a la nube (`.m5-nube` en momento5.css); con «reducir movimiento»
 * aparecen quietas. Con CSS y no con framer-motion: con 72 textos SVG animados
 * por framer, WebKit dejaba algunos a medio camino (más chicos y translúcidos,
 * como encimados). Los lectores de pantalla reciben la lista de frases.
 */
export function NubeFrases({ frases, etiqueta }: { frases: FraseNube[]; etiqueta: string }) {
  // Medido con getBoundingClientRect y no con whileInView: IntersectionObserver falla en WebKit móvil escalado.
  const [ref, visible] = useAlEntrar<HTMLElement>(0.2);
  // Pocas frases (el registro de aprendizajes tiene 10): letra un poco mayor, para que la nube no quede diminuta.
  const factor = frases.length <= 15 ? 1.3 : 1;
  const { medidor, anchos } = useAnchos(frases.length);

  const nube = useMemo(() => {
    if (!anchos || anchos.length !== frases.length) return null;
    const letras = frases.map((f) => letraDe(f, factor));
    const PROPORCION = proporcionPara(frases.length);
    // Margen de cada caja: un espacio entre frases y un respiro arriba y abajo.
    const posiciones = disponerNube(
      letras.map((l, i) => ({ ancho: anchos[i] + l.tamano * 0.8, alto: l.tamano * 1.32 })),
      PROPORCION
    );
    let pequenas = 0;
    let grandes = 0;
    // Turno de entrada: de la más grande a la más pequeña, y de adentro hacia afuera.
    const distancia = (i: number) => Math.hypot(posiciones[i].x, posiciones[i].y * PROPORCION);
    const porTurno = frases.map((_, i) => i).sort((a, b) => letras[b].tamano - letras[a].tamano || distancia(a) - distancia(b));
    const turno = new Map(porTurno.map((i, k) => [i, k]));
    // Mismo orden que `frases` en el DOM: si cambiara al reacomodar, las animaciones se reiniciarían.
    const dispuestas: FraseDispuesta[] = frases.map((f, i) => ({
      ...f,
      ...letras[i],
      ...posiciones[i],
      turno: turno.get(i) ?? i,
      ancho: anchos[i],
      color: f.tamano === 1 ? COLOR_PEQUENO[pequenas++ % COLOR_PEQUENO.length] : COLOR_GRANDE[grandes++ % COLOR_GRANDE.length],
    }));
    const margen = 12;
    const izquierda = Math.min(...dispuestas.map((d) => d.x - d.ancho / 2)) - margen;
    const derecha = Math.max(...dispuestas.map((d) => d.x + d.ancho / 2)) + margen;
    const arriba = Math.min(...dispuestas.map((d) => d.y - d.tamano * 0.6)) - margen;
    const abajo = Math.max(...dispuestas.map((d) => d.y + d.tamano * 0.6)) + margen;
    return { dispuestas, caja: { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba } };
  }, [frases, anchos, factor]);

  return (
    <figure ref={ref} className="relative w-full">
      {/* Para lectores de pantalla: la lista, sin depender del dibujo. */}
      <ul className="sr-only" aria-label={etiqueta}>
        {frases.map((f, i) => (
          <li key={`${f.frase}-${i}`}>{f.frase}</li>
        ))}
      </ul>
      {/* Medidor invisible y quieto: las mismas frases, con la misma letra, para conocer su ancho real. */}
      <svg ref={medidor} className="invisible absolute top-0 left-0 h-0 w-0 overflow-hidden" aria-hidden>
        {frases.map((f, i) => {
          const l = letraDe(f, factor);
          return (
            <text key={`${f.frase}-${i}`} fontSize={l.tamano} fontWeight={l.peso}>
              {f.frase}
            </text>
          );
        })}
      </svg>
      {nube ? (
        <svg
          viewBox={`${nube.caja.x} ${nube.caja.y} ${nube.caja.ancho} ${nube.caja.alto}`}
          className="m5-nube mx-auto block h-auto w-full"
          data-visible={visible}
          // Nunca más grande que su tamaño natural.
          style={{ maxWidth: nube.caja.ancho }}
          aria-hidden
        >
          {nube.dispuestas.map((f, i) => (
            <text
              key={`${f.frase}-${i}`}
              x={f.x}
              y={f.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={f.tamano}
              fontWeight={f.peso}
              fill={f.color}
              style={{ "--paso": Math.min(f.turno, 64) } as CSSProperties}
            >
              {f.frase}
            </text>
          ))}
        </svg>
      ) : (
        // Mientras carga la fuente: el alto aproximado de la nube, para que la página no salte.
        <div className="min-h-[20rem]" aria-hidden />
      )}
    </figure>
  );
}
