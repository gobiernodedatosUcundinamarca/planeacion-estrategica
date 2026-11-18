"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { cn } from "@/lib/utils";
import type { EstamentoMuestreo, NotaMetodologica, TotalEstamento } from "@/types/nota-metodologica";

/** Los mismos colores que el resto del sitio usa para cada rol; solo dentro de los datos. */
export const COLOR_ESTAMENTO: Record<EstamentoMuestreo, string> = {
  estudiantes: "var(--chart-1)",
  docentes: "var(--chart-3)",
  administrativos: "var(--chart-5)",
  graduados: "var(--chart-2)",
};

export const SUAVIZADO = [0.22, 1, 0.36, 1] as const;

const formatosDecimales = new Map<number, Intl.NumberFormat>();

export function decimal(valor: number, decimales = 2): string {
  let formato = formatosDecimales.get(decimales);
  if (!formato) {
    formato = new Intl.NumberFormat("es-CO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    formatosDecimales.set(decimales, formato);
  }
  return formato.format(valor);
}

export function entero(valor: number): string {
  return decimal(Math.round(valor), 0);
}

/** 0,293 → «29,3 %». */
export function porcentaje(fraccion: number, decimales = 1): string {
  return `${decimal(fraccion * 100, decimales)} %`;
}

/** «Estudiantes (Creadores de Oportunidades)» → nombre y detalle por separado. */
export function partirEtiqueta(etiqueta: string): { nombre: string; detalle: string | null } {
  const m = etiqueta.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { nombre: m[1], detalle: m[2] } : { nombre: etiqueta, detalle: null };
}

export function nombreEstamento(nota: NotaMetodologica, estamento: EstamentoMuestreo): string {
  const total = nota.totales.find((t) => t.estamento === estamento);
  return total ? partirEtiqueta(total.etiqueta).nombre : estamento;
}

export function sumarTotales(totales: TotalEstamento[]) {
  return totales.reduce(
    (s, t) => ({
      poblacion: s.poblacion + t.poblacion,
      muestraCalculada: s.muestraCalculada + t.muestraCalculada,
      convocados: s.convocados + t.convocados,
      asistentes: s.asistentes + t.asistentes,
    }),
    { poblacion: 0, muestraCalculada: 0, convocados: 0, asistentes: 0 }
  );
}

/**
 * Se vuelve true, una sola vez, cuando `cantidad` del elemento (o de la
 * pantalla, si el elemento es más alto que ella) queda a la vista.
 *
 * No usa IntersectionObserver (ni `whileInView`/`useInView` de framer-motion):
 * en los teléfonos el sitio se dibuja como escritorio con zoom, y WebKit móvil
 * le da al observador solo la franja superior de la pantalla, así que lo que
 * estaba a la vista más abajo nunca se animaba. `innerHeight` y
 * `getBoundingClientRect` sí miden en el mismo espacio en los tres modos (PC,
 * teléfono y marco escalado).
 */
export function useAlEntrar<T extends Element>(cantidad = 0.35) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || visible) return;
    let pendiente = 0;
    const revisar = () => {
      pendiente = 0;
      const r = elemento.getBoundingClientRect();
      const alto = window.innerHeight;
      const aLaVista = Math.min(r.bottom, alto) - Math.max(r.top, 0);
      if (r.height > 0 && aLaVista >= Math.min(r.height, alto) * cantidad) setVisible(true);
    };
    const programar = () => {
      if (!pendiente) pendiente = requestAnimationFrame(revisar);
    };
    programar();
    // En captura, para enterarse también del scroll de contenedores internos (no burbujea).
    window.addEventListener("scroll", programar, { capture: true, passive: true });
    window.addEventListener("resize", programar);
    return () => {
      if (pendiente) cancelAnimationFrame(pendiente);
      window.removeEventListener("scroll", programar, { capture: true });
      window.removeEventListener("resize", programar);
    };
  }, [visible, cantidad]);

  return [ref, visible] as const;
}

/**
 * Número que sube hasta su valor la primera vez que entra en pantalla, y que
 * después se desliza del valor anterior al nuevo cuando cambia (al elegir otro
 * estamento). Con «reducir movimiento» se muestra el valor final sin animar.
 */
export function Contador({
  valor,
  formato = entero,
  duracion = 1.4,
  className,
}: {
  valor: number;
  formato?: (n: number) => string;
  duracion?: number;
  className?: string;
}) {
  const [ref, visible] = useAlEntrar<HTMLSpanElement>(0.5);
  const reducido = useReducedMotion();
  const [mostrado, setMostrado] = useState(0);
  const previo = useRef(0);

  useEffect(() => {
    if (!visible || reducido) return;
    const control = animate(previo.current, valor, {
      duration: duracion,
      ease: SUAVIZADO,
      onUpdate: (v) => {
        previo.current = v;
        setMostrado(v);
      },
    });
    return () => control.stop();
  }, [visible, valor, reducido, duracion]);

  return (
    <span ref={ref} className={cn("nm-cifra", className)}>
      {formato(reducido ? valor : mostrado)}
    </span>
  );
}

/** Aparece desde abajo al entrar en pantalla. */
export function Aparecer({
  children,
  retraso = 0,
  className,
}: {
  children: ReactNode;
  retraso?: number;
  className?: string;
}) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.25);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.6, delay: retraso, ease: SUAVIZADO }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Barra horizontal sin adornos que crece hasta `fraccion` del ancho al entrar
 * en pantalla y que, si la fracción cambia después, se desliza a la nueva.
 */
export function BarraCreciente({
  fraccion,
  color,
  retraso = 0,
  className,
}: {
  fraccion: number;
  color: string;
  retraso?: number;
  className?: string;
}) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.5);
  const ancho = `${Math.max(0, Math.min(1, fraccion)) * 100}%`;
  return (
    <div ref={ref} className={cn("h-2 w-full bg-[var(--nm-velo)]", className)}>
      <motion.div
        className="h-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: visible ? ancho : 0 }}
        transition={{ duration: 1, delay: retraso, ease: SUAVIZADO }}
      />
    </div>
  );
}

/**
 * Un apartado de la nota: filete de apertura, número grande en la columna de
 * margen y, en la principal, la frase de enlace, el título, la pregunta que
 * orienta su lectura y una entradilla. El contenido decide su propia
 * composición debajo.
 */
export function Apartado({
  id,
  numero,
  titulo,
  pregunta,
  entrada,
  enlace,
  children,
}: {
  id: string;
  numero: number;
  titulo: ReactNode;
  pregunta?: ReactNode;
  entrada?: ReactNode;
  enlace?: ReactNode;
  children: ReactNode;
}) {
  return (
    // scroll-mt deja sitio al encabezado fijo del panel al saltar desde el índice.
    <section id={id} className="nm-apartado scroll-mt-24">
      <Aparecer className="nm-reticula">
        <div className="nm-margen">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-capitulo" original={"Apartado"} />
          </p>
          <p className="nm-numero mt-1">{String(numero).padStart(2, "0")}</p>
        </div>
        <header className="nm-principal">
          {enlace ? <p className="nm-enlace">{enlace}</p> : null}
          <h2 className="nm-titular">{titulo}</h2>
          {pregunta ? <p className="nm-pregunta">{pregunta}</p> : null}
          {entrada ? <p className="nm-entradilla">{entrada}</p> : null}
        </header>
      </Aparecer>
      <div className="mt-12">{children}</div>
    </section>
  );
}

/** Pestañas de texto (estamento, unidad…): la elegida va subrayada, sin cajas. */
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  orientacion = "horizontal",
  className,
}: {
  opciones: { id: T; texto: ReactNode; color?: string }[];
  valor: T;
  onCambio: (id: T) => void;
  etiqueta: string;
  orientacion?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} data-orientacion={orientacion} className={cn("nm-pestanas", className)}>
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.id === valor} onClick={() => onCambio(o.id)}>
          {o.color ? <span className="nm-muestra-color" style={{ backgroundColor: o.color }} aria-hidden /> : null}
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** El principio técnico que sostiene un apartado, a cuerpo de titular, con su rótulo en el margen. */
export function Cita({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <Aparecer className="nm-reticula">
      <p className="nm-margen nm-rotulo pt-6">{rotulo}</p>
      <p className="nm-principal nm-cita">{children}</p>
    </Aparecer>
  );
}
