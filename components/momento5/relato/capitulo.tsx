"use client";

import type { ReactNode } from "react";
import { Contador } from "@/components/nota-metodologica/piezas";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { fechaLarga, type FiltroEquipo, type FormularioConValor } from "@/lib/reglas/momento5";
import { cn } from "@/lib/utils";

/** Una cifra dentro de una frase: cuenta hasta su valor al entrar y se desliza al cambiar el filtro. */
export function Cifra({ valor, className }: { valor: number; className?: string }) {
  // Redondeo en cada cuadro: el contador pasa por valores intermedios con decimales.
  return (
    <Contador
      valor={valor}
      formato={(n) => formatNumero(Math.round(n))}
      duracion={1.2}
      className={cn("m5-cifra font-semibold", className)}
    />
  );
}

/** Fracción 0–1 con el formato de porcentaje del portal, también animada. */
export function Porcentaje({ fraccion, className }: { fraccion: number; className?: string }) {
  return (
    <Contador
      valor={Number.isFinite(fraccion) ? fraccion * 100 : 0}
      formato={formatPorcentaje}
      duracion={1.2}
      className={cn("m5-cifra font-semibold", className)}
    />
  );
}

/**
 * Bajo el nombre del formulario: la fecha, si responde cada persona o cada
 * equipo y cuántas respuestas válidas entran. Los envíos originales solo se
 * mencionan sin filtro de equipo.
 */
function FichaFormulario({ formulario, equipo }: { formulario: FormularioConValor; equipo: FiltroEquipo }) {
  const grupal = formulario.tipo === "Grupal";
  return (
    <p className="m5-ficha">
      {fechaLarga(formulario.fecha)}.{" "}
      {grupal ? (
        <TextoEditorial id="m5-ficha-grupal" original="Un registro por equipo:" />
      ) : (
        <TextoEditorial id="m5-ficha-individual" original="Una respuesta por persona:" />
      )}{" "}
      <span className="m5-cifra">{formatNumero(formulario.value)}</span>{" "}
      {grupal ? <TextoEditorial id="m5-ficha-validos" original="válidos" /> : <TextoEditorial id="m5-ficha-validas" original="válidas" />}
      {equipo === null && formulario.respuestas_originales !== formulario.respuestas_validas ? (
        <>
          {" "}
          <TextoEditorial id="m5-de" original="de" /> <span className="m5-cifra">{formatNumero(formulario.respuestas_originales)}</span>{" "}
          <TextoEditorial id="m5-ficha-envios" original="envíos." />
        </>
      ) : equipo !== null ? (
        <>
          {" "}
          <TextoEditorial id="m5-ficha-en-equipo" original="en este equipo." />
        </>
      ) : (
        "."
      )}
    </p>
  );
}

/**
 * La clasificación del formulario, abierta después del relato: los gráficos,
 * tablas, filtros y agrupaciones por tema con que se lee cada respuesta.
 */
export function Clasificacion({ children }: { children: ReactNode }) {
  return (
    <div className="mt-16 flex flex-col gap-12 border-t border-[var(--m5-linea)] pt-10">
      <h3 className="m5-titular-3">
        <TextoEditorial id="m5-clasificacion" original="Clasificación de las respuestas" />
      </h3>
      {children}
    </div>
  );
}

/** Pregunta del formulario, tal como la vieron quienes respondieron; encabeza un paso del relato. */
export function Pregunta({ children }: { children: ReactNode }) {
  return <h3 className="m5-titular-3">{children}</h3>;
}

/**
 * Un formulario: su nombre tal cual, como título (para que quien lo respondió
 * lo reconozca), la ficha y el contenido, que decide su propia composición.
 */
export function Capitulo({
  id,
  formulario,
  equipo,
  children,
}: {
  id: string;
  formulario: FormularioConValor | undefined;
  equipo: FiltroEquipo;
  children: ReactNode;
}) {
  return (
    // scroll-mt deja la sección justo bajo la barra fija, dentro del margen con que el menú marca el formulario actual.
    <section id={id} aria-labelledby={`${id}-titulo`} className="m5-capitulo scroll-mt-52">
      <div className="m5-reticula">
        <div className="col-span-10">
          <h2 id={`${id}-titulo`} className="m5-titular-2">
            {formulario?.nombre ?? id}
          </h2>
          {formulario ? <FichaFormulario formulario={formulario} equipo={equipo} /> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
