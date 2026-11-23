"use client";

import type { ReactNode } from "react";
import { destacadosMomento5, ordenAplicacion, type DerivadosMomento5, type FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import { CapituloAcuerdos } from "./capitulo-acuerdos";
import { CapituloDigital } from "./capitulo-digital";
import { CapituloMatriz } from "./capitulo-matriz";
import { CapituloMedit } from "./capitulo-medit";
import { CapituloValidacion } from "./capitulo-validacion";
import { useCompacto } from "./escenario";

/** Id de la sección de cada formulario: el menú lleva hasta ella y la marca mientras se lee. */
export const SECCION_DE_FORMULARIO: Record<string, string> = {
  validacion: "validacion",
  acuerdos: "acuerdos",
  percepcion: "transformacion-digital",
  consolidacion: "consolidacion-medit",
  matriz: "matriz-medit",
};

/**
 * Los formularios, uno tras otro en el orden en que se aplicaron: cada uno se
 * cuenta por separado, con sus propias respuestas, sus gráficas en el scroll
 * y su clasificación, y al terminar sigue el siguiente.
 */
export function RelatoMomento5({
  d,
  datos,
  abiertas,
  equipo,
}: {
  d: DerivadosMomento5;
  datos: ResultadosMomento5;
  abiertas: PreguntaAbiertaMomento5[];
  equipo: FiltroEquipo;
}) {
  const compacto = useCompacto();
  const destacados = destacadosMomento5(d);

  const capitulos: Record<string, ReactNode> = {
    validacion: <CapituloValidacion d={d} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} />,
    acuerdos: <CapituloAcuerdos d={d} datos={datos} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} />,
    percepcion: <CapituloDigital d={d} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} />,
    consolidacion: <CapituloMedit d={d} destacados={destacados} equipo={equipo} compacto={compacto} />,
    matriz: <CapituloMatriz d={d} datos={datos} equipo={equipo} abiertas={abiertas} />,
  };

  return (
    <div className="flex flex-col">
      {ordenAplicacion(datos.meta.formularios).map((f) => (capitulos[f.id] ? <div key={f.id}>{capitulos[f.id]}</div> : null))}
    </div>
  );
}
