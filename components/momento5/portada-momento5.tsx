"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { EtiquetaEditorial, LapizDeCatalogo, TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import { ordenAplicacion } from "@/lib/reglas/momento5";
import type { FormularioMomento5 } from "@/types/momento5";
import { SECCION_DE_FORMULARIO } from "./relato/relato-momento5";

const BOTON = "Empezar por el primer formulario";

/** Orden de entrada de cada pieza del texto (`.m5-entra` en momento5.css). */
const paso = (n: number) => ({ "--paso": n }) as CSSProperties;

/**
 * Portada del Momento 5: a la izquierda qué se presenta y con cuántas
 * personas; a la derecha, la foto del grupo que participó. Las cifras salen
 * de los datos.
 *
 * Animación sobria, una sola vez al cargar (`.m5-entra` y `.m5-asienta`): el
 * texto sube 12 px mientras aparece, pieza por pieza, y la foto se asienta
 * desde un acercamiento leve. Con «reducir movimiento» todo aparece quieto.
 */
export function PortadaMomento5({
  formularios,
  participantes,
  equipos,
  actividad2,
}: {
  formularios: FormularioMomento5[];
  participantes: number;
  equipos: number;
  /** Cifras de la Actividad 2; null si su archivo no se pudo leer. */
  actividad2: { mesas: number; indicadores: number } | null;
}) {
  const reducido = useReducedMotion();
  const orden = ordenAplicacion(formularios);
  const individuales = orden.filter((f) => f.tipo === "Individual").length;
  const primera = orden.map((f) => SECCION_DE_FORMULARIO[f.id]).find(Boolean);

  return (
    // La foto manda: la columna ancha y casi con su proporción, y el texto compacto, para no cortar
    // a nadie del grupo. Con un recuadro casi cuadrado se perdía un quinto de la foto por la izquierda.
    <header className="mb-10 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden rounded-2xl border border-[var(--m5-linea)]">
      <div className="flex flex-col justify-center gap-4 px-8 py-8">
        <p className="m5-entra text-xs font-medium text-[var(--m5-suave)]" style={paso(0)}>
          <TextoEditorial id="m5-portada-etiqueta" original="Planeación Estratégica 2027-2037 · CAI" />
        </p>
        <div className="m5-entra flex flex-col gap-2" style={paso(1)}>
          <h1 className="m5-titular-1">
            <TextoEditorial id="m5-portada-titulo" original="Momento 5" />
          </h1>
          <p className="text-lg leading-snug text-pretty">
            <TextoEditorial id="m5-titulo" original="Resultados de las actividades del 17 y 18 de noviembre de 2026" />
          </p>
        </div>
        <p className="m5-entra text-sm leading-relaxed text-pretty text-[var(--m5-suave)]" style={paso(2)}>
          <span className="m5-cifra font-semibold text-foreground">{formatNumero(participantes)}</span>{" "}
          <TextoEditorial id="m5-portada-a" original="participantes, en" />{" "}
          <span className="m5-cifra font-semibold text-foreground">{formatNumero(equipos)}</span>{" "}
          <TextoEditorial id="m5-portada-b" original="equipos, respondieron" />{" "}
          <span className="m5-cifra font-semibold text-foreground">{formatNumero(orden.length)}</span>{" "}
          <TextoEditorial id="m5-portada-c" original="formularios:" /> {formatNumero(individuales)}{" "}
          <TextoEditorial id="m5-portada-d" original="individuales y" /> {formatNumero(orden.length - individuales)}{" "}
          <TextoEditorial id="m5-portada-e" original="por equipo." />
          {actividad2 ? (
            <>
              {" "}
              <TextoEditorial id="m5-portada-a2-a" original="En la Actividad 2 los equipos trabajaron como mesas:" />{" "}
              <span className="m5-cifra font-semibold text-foreground">{formatNumero(actividad2.mesas)}</span>{" "}
              <TextoEditorial id="m5-portada-a2-b" original="fichas con" />{" "}
              <span className="m5-cifra font-semibold text-foreground">{formatNumero(actividad2.indicadores)}</span>{" "}
              <TextoEditorial id="m5-portada-a2-c" original="indicadores propuestos." />
            </>
          ) : null}
        </p>
        {primera ? (
          <div className="m5-entra flex items-center gap-2" style={paso(3)}>
            {/* Enlace con desplazamiento suave; sin JavaScript sigue llevando a la sección. El rótulo va
                sin lápiz (EtiquetaEditorial) para no meter un botón dentro del enlace; su lápiz va al lado. */}
            <a
              href={`#${primera}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(primera)?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
              }}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--m5-tinta)] px-4 py-1.5 text-sm font-semibold text-[var(--m5-tinta)] transition-colors hover:bg-[var(--m5-tinta)] hover:text-[var(--background)] focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <EtiquetaEditorial texto={BOTON} />
              <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none" aria-hidden />
            </a>
            <LapizDeCatalogo texto={BOTON} />
          </div>
        ) : null}
      </div>
      {/* 1,9:1 frente al 2,1:1 de la foto: se recorta apenas un 9 %, casi todo de la pantalla de la
          izquierda (de ahí el 75 % horizontal). La proporción fija el alto de la fila; si el texto
          fuera más alto, h-full estira la foto para que no quede una franja vacía debajo. */}
      <figure className="relative aspect-[1.9] h-full overflow-hidden">
        <div className="m5-asienta absolute inset-0">
          {/* Sin optimizar a propósito: el optimizador de Next la recomprimía al 75 % y a 750 px,
              y se veía blanda. El archivo ya es WebP de máxima calidad (100) y ancho original. */}
          <Image
            src="/assets/momento5/grupo-cai-momento5.webp"
            alt="Participantes de las actividades del Momento 5 del CAI de Planeación Estratégica 2027-2037, frente a la pantalla de la campaña «Cultivando la UCundinamarca que somos y soñamos»."
            fill
            unoptimized
            priority
            className="object-cover object-[75%_45%]"
          />
        </div>
      </figure>
    </header>
  );
}
