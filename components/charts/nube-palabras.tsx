"use client";
import {TextoDeCatalogo} from "@/components/editorial/texto-editorial";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useSyncExternalStore } from "react";
import { Wordcloud } from "@visx/wordcloud";
import { ParentSize } from "@visx/responsive";
import { scaleLog } from "@visx/scale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumero } from "@/lib/formatters";
import type { PalabraFrecuencia } from "@/lib/frecuencia-palabras";

const FUENTE_RESPALDO = "system-ui, sans-serif";

function sinSuscripcion() {
  return () => {};
}

function leerFuenteResuelta(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim() || FUENTE_RESPALDO;
}

function leerFuenteServidor(): string {
  return FUENTE_RESPALDO;
}

/**
 * El canvas interno que usa d3-cloud para medir el ancho de cada palabra (y
 * así evitar colisiones) no resuelve variables CSS como "var(--font-sans)"
 * — mide con una fuente distinta a la que el SVG final termina dibujando, y
 * las cajas de colisión quedan mal calculadas (palabras superpuestas). Se lee
 * el valor real ya generado por next/font (vía useSyncExternalStore, la
 * forma correcta de leer estado externo al render sin el anti-patrón
 * setState-en-efecto) antes de pasarlo al layout, así la medición y el
 * render final usan la misma fuente.
 */
function useFuenteResuelta(): string {
  return useSyncExternalStore(sinSuscripcion, leerFuenteResuelta, leerFuenteServidor);
}

interface DatoNube {
  text: string;
  value: number;
}

/** PRNG determinístico (mulberry32): misma semilla → misma disposición siempre, sin Math.random. */
function crearGeneradorAleatorio(semilla: number) {
  let a = semilla;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = crearGeneradorAleatorio(3110);

function rotar(): number {
  return (Math.round(random() * 4) - 2) * 8; // -16°, -8°, 0°, 8°, 16°
}

/** Verde institucional → verde de marca a medida que crece la frecuencia (t: 0-1). */
function colorPorPeso(t: number): string {
  if (t < 0.5) {
    return `color-mix(in oklab, var(--primary) ${Math.round((t / 0.5) * 100)}%, var(--muted-foreground))`;
  }
  return `color-mix(in oklab, var(--brand-accent) ${Math.round(((t - 0.5) / 0.5) * 100)}%, var(--primary))`;
}

/**
 * Nube de palabras (@visx/wordcloud, sobre d3-cloud) con la frecuencia de un
 * conjunto de respuestas abiertas. El layout se calcula en el cliente
 * (requiere medir texto en canvas); la semilla del generador aleatorio es fija
 * para que la disposición sea estable entre recargas.
 *
 * Vive en `components/charts/` y no dentro de un módulo porque la usan dos
 * secciones distintas: el título y la descripción llegan por props, ya que lo
 * único que cambia entre una y otra es qué textos se están resumiendo.
 */
export function NubePalabras({
  palabras,
  totalRespuestas,
  titulo = "Lo que más se dice: aprendizajes y mejoras",
  descripcion,
}: {
  palabras: PalabraFrecuencia[];
  totalRespuestas: number;
  titulo?: string;
  descripcion?: string;
}) {
  const fuente = useFuenteResuelta();

  if (palabras.length === 0) return null;

  const datos: DatoNube[] = palabras.map((p) => ({ text: p.palabra, value: p.frecuencia }));
  const valorPorTexto = new Map(datos.map((d) => [d.text, d.value]));
  const valores = datos.map((d) => d.value);
  const escalaTamano = scaleLog({
    domain: [Math.min(...valores), Math.max(...valores)],
    range: [14, 56],
  });

  return (
    <Card className="py-3">
      <CardHeader className="px-3.5 pb-1">
        <CardTitle className="text-[13px]"><TextoDeCatalogo texto={titulo}/></CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {descripcion ??
            `Palabras más frecuentes en las ${formatNumero(totalRespuestas)} respuestas abiertas de aprendizajes y mejoras de todas las actividades.`}{" "}
          <TextoEditorial id="9a15737899ab1d913022" original={"El tamaño y el color indican cuántas veces se repite cada palabra."}/></p>
      </CardHeader>
      <CardContent className="px-3.5">
        <div
          className="relative h-80 overflow-hidden rounded-lg"
          role="img"
          aria-label={`Nube de palabras: $<TextoDeCatalogo texto={titulo}/>`}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, color-mix(in oklab, var(--primary) 7%, transparent), transparent 72%)",
            }}
            aria-hidden
          />
          <ParentSize>
            {({ width, height }) =>
              width > 0 && height > 0 ? (
                <Wordcloud<DatoNube>
                  width={width}
                  height={height}
                  words={datos}
                  fontSize={(d) => escalaTamano(d.value)}
                  font={fuente}
                  fontWeight={(d) => (escalaTamano(d.value) > 34 ? 700 : escalaTamano(d.value) > 22 ? 600 : 500)}
                  padding={5}
                  spiral="archimedean"
                  rotate={rotar}
                  random={random}
                >
                  {(cloudWords) =>
                    cloudWords.map((w) => {
                      const tamano = w.size ?? 14;
                      const t = (tamano - 14) / (56 - 14);
                      const frecuencia = valorPorTexto.get(w.text ?? "") ?? 0;
                      return (
                        <text
                          key={w.text}
                          textAnchor="middle"
                          transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                          fontSize={w.size}
                          fontWeight={w.weight}
                          fontFamily={w.font}
                          fill={colorPorPeso(t)}
                        >
                          <title>{`${w.text} · ${formatNumero(frecuencia)} menciones`}</title>
                          {w.text}
                        </text>
                      );
                    })
                  }
                </Wordcloud>
              ) : null
            }
          </ParentSize>
        </div>
      </CardContent>
    </Card>
  );
}
