"use client";

import { useMemo, type ReactNode } from "react";
import { conformacionEquipos, destacadosMomento5, type DerivadosMomento5, type FiltroEquipo } from "@/lib/reglas/momento5";
import { derivarActividad2, gruposPorActividad } from "@/lib/reglas/momento5-actividad2";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import type { Actividad2Momento5, InstrumentoActividad2Id } from "@/types/momento5-actividad2";
import type { KahootMomento5 } from "@/types/momento5-kahoot";
import { CapituloAcuerdos } from "./capitulo-acuerdos";
import { CapituloDigital } from "./capitulo-digital";
import { CapituloKahoot } from "./capitulo-kahoot";
import { CapituloMatriz } from "./capitulo-matriz";
import { CapituloMedit } from "./capitulo-medit";
import { CapituloNube } from "./capitulo-nube";
import { CapituloReto1 } from "./capitulo-reto1";
import { CapituloReto2 } from "./capitulo-reto2";
import { CapituloValidacion } from "./capitulo-validacion";
import { useCompacto } from "./escenario";

/**
 * Id de la sección de cada formulario o instrumento: el menú lleva hasta ella
 * y la marca mientras se lee. Los instrumentos de la Actividad 2 usan su id.
 */
export const SECCION_DE_FORMULARIO: Record<string, string> = {
  validacion: "validacion",
  acuerdos: "acuerdos",
  "pregunta-inicial": "pregunta-inicial",
  reto1: "reto1",
  reto2: "reto2",
  aprendizajes: "aprendizajes",
  kahoot: "kahoot",
  percepcion: "transformacion-digital",
  consolidacion: "consolidacion-medit",
  matriz: "matriz-medit",
};

/**
 * Los formularios e instrumentos, uno tras otro en el orden en que se
 * aplicaron (Actividad 1, 2 y 3): cada uno se cuenta por separado, con sus
 * propias respuestas, sus gráficas en el scroll y su clasificación, y al
 * terminar sigue el siguiente. Sin el libro de la Actividad 2 (`a2` null), se
 * cuentan solo los formularios.
 */
export function RelatoMomento5({
  d,
  datos,
  abiertas,
  equipo,
  a2,
  kahoot,
  sobrePlano,
}: {
  d: DerivadosMomento5;
  datos: ResultadosMomento5;
  abiertas: PreguntaAbiertaMomento5[];
  equipo: FiltroEquipo;
  a2: Actividad2Momento5 | null;
  /** Reporte del Kahoot de la Actividad 3; null si no hay. */
  kahoot: KahootMomento5 | null;
  /** Píxeles sobre el plano fijo, medidos por el panel (null mientras no mide). */
  sobrePlano: number | null;
}) {
  const compacto = useCompacto(sobrePlano);
  const destacados = destacadosMomento5(d);
  // La conformación no depende del filtro: el filtro solo resalta un equipo.
  const equipos = useMemo(() => conformacionEquipos(datos), [datos]);
  const d2 = useMemo(() => (a2 ? derivarActividad2(a2, equipo) : null), [a2, equipo]);
  const instrumento = (id: InstrumentoActividad2Id) => a2?.instrumentos.find((i) => i.id === id);

  const capitulos: Record<string, ReactNode> = {
    validacion: (
      <CapituloValidacion d={d} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} equipos={equipos} />
    ),
    acuerdos: <CapituloAcuerdos d={d} datos={datos} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} />,
    percepcion: <CapituloDigital d={d} destacados={destacados} equipo={equipo} compacto={compacto} abiertas={abiertas} />,
    consolidacion: <CapituloMedit d={d} destacados={destacados} equipo={equipo} compacto={compacto} />,
    matriz: <CapituloMatriz d={d} datos={datos} equipo={equipo} abiertas={abiertas} />,
  };
  if (kahoot) capitulos.kahoot = <CapituloKahoot kahoot={kahoot} equipo={equipo} compacto={compacto} />;
  if (a2 && d2) {
    for (const id of ["pregunta-inicial", "aprendizajes"] as const) {
      const inst = instrumento(id);
      if (inst) capitulos[id] = <CapituloNube instrumento={inst} nube={a2.nubes.find((n) => n.instrumento === id)} equipo={equipo} />;
    }
    const reto1 = instrumento("reto1");
    if (reto1) capitulos.reto1 = <CapituloReto1 instrumento={reto1} a2={a2} d={d2} equipo={equipo} compacto={compacto} />;
    const reto2 = instrumento("reto2");
    if (reto2) capitulos.reto2 = <CapituloReto2 instrumento={reto2} a2={a2} d={d2} equipo={equipo} />;
  }

  return (
    <div className="flex flex-col">
      {gruposPorActividad(datos.meta.formularios, a2?.instrumentos ?? [], kahoot !== null)
        .flatMap((g) => g.secciones)
        .map((s) => (capitulos[s.id] ? <div key={s.id}>{capitulos[s.id]}</div> : null))}
    </div>
  );
}
