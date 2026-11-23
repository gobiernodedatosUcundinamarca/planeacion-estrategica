"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import type { DerivadosMomento5, FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import { MatrizColaborativa } from "../medit";
import { RespuestasAbiertas } from "../respuestas-abiertas";
import { Capitulo, Clasificacion } from "./capitulo";

/** El primer punto de una lista y cuántos más tiene. */
function Primero({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[var(--m5-suave)]">—</span>;
  return (
    <>
      <span className="line-clamp-4">{items[0]}</span>
      {items.length > 1 ? (
        <span className="m5-nota mt-1 block">
          <TextoEditorial id="m5-matriz-y" original="y" /> {formatNumero(items.length - 1)}{" "}
          <TextoEditorial id="m5-matriz-mas" original="más" />
        </span>
      ) : null}
    </>
  );
}

/**
 * Pasaje tranquilo después de dos capítulos densos: una tabla tipográfica con
 * el primer punto de cada matriz, sin animación. Las listas completas están en
 * el anexo.
 */
export function CapituloMatriz({
  d,
  datos,
  equipo,
  abiertas,
}: {
  d: DerivadosMomento5;
  datos: ResultadosMomento5;
  equipo: FiltroEquipo;
  abiertas: PreguntaAbiertaMomento5[];
}) {
  return (
    <Capitulo id="matriz-medit" formulario={d.formularios.find((f) => f.id === "matriz")} equipo={equipo}>

      <p className="m5-entradilla mt-10">
        <TextoEditorial
          id="m5-matriz-entrada"
          original="Cada equipo respondió las tres preguntas de la matriz. Aquí va el primer punto de cada respuesta; la matriz completa de cada equipo está más abajo."
        />
      </p>
      {d.matriz.length ? (
        <table className="m5-tabla mt-10">
          <thead>
            <tr>
              <th className="w-[10%]">
                <TextoEditorial id="m5-equipo" original="Equipo" />
              </th>
              <th className="w-[30%]">
                <TextoEditorial id="m5-matriz-aspectos" original="¿Qué aspectos del MEDIT debemos consolidar?" />
              </th>
              <th className="w-[30%]">
                <TextoEditorial id="m5-matriz-cambios" original="¿Qué cambios esperamos lograr?" />
              </th>
              <th className="w-[30%]">
                <TextoEditorial id="m5-matriz-indicadores" original="¿Cómo sabremos que los hemos logrado?" />
              </th>
            </tr>
          </thead>
          <tbody>
            {d.matriz.map((m) => (
              <tr key={m.equipo}>
                <td className="m5-cifra font-semibold">{m.equipo}</td>
                <td>
                  <Primero items={m.aspectos} />
                </td>
                <td>
                  <Primero items={m.cambios} />
                </td>
                <td>
                  <Primero items={m.indicadores} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="m5-entradilla mt-10 text-[var(--m5-suave)]">
          <TextoEditorial id="m5-sin-matriz" original="Este equipo no registró matriz." />
        </p>
      )}
      <Clasificacion>
        <MatrizColaborativa d={d} datos={datos} />
        <RespuestasAbiertas preguntas={abiertas.filter((p) => p.formulario === "matriz")} equipo={equipo} />
      </Clasificacion>
    </Capitulo>
  );
}
