"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import type { FiltroEquipo } from "@/lib/reglas/momento5";
import type { DerivadosActividad2 } from "@/lib/reglas/momento5-actividad2";
import type { Actividad2Momento5, InstrumentoActividad2, RegistroReto2 } from "@/types/momento5-actividad2";
import { LineaFuente, Literal } from "../piezas";
import { Capitulo } from "./capitulo";

/**
 * Ficha de reconstrucción y validación cruzada (Reto 2): cada registro como se
 * diligenció, elemento por elemento, con los rótulos de la ficha. No se
 * compara con el Reto 1. Si la ficha dice quién la registró, va bajo el título.
 */
export function CapituloReto2({
  instrumento,
  a2,
  d,
  equipo,
}: {
  instrumento: InstrumentoActividad2;
  a2: Actividad2Momento5;
  d: DerivadosActividad2;
  equipo: FiltroEquipo;
}) {
  const enunciado = a2.enunciados.find((e) => e.instrumento === "reto2")?.enunciado;
  const n = d.reto2.length;
  return (
    <Capitulo
      id={instrumento.id}
      titulo={instrumento.nombre}
      equipo={equipo}
      ficha={
        <>
          {instrumento.instrumento} · <TextoEditorial id="m5-a2-actividad" original="Actividad 2." />{" "}
          <TextoEditorial id="m5-a2-r2-ficha" original="Registros recibidos:" /> <span className="m5-cifra">{formatNumero(n)}</span>.
        </>
      }
    >
      {enunciado ? (
        <p className="m5-entradilla mt-10 whitespace-pre-line">{enunciado}</p>
      ) : null}
      {n ? (
        <div className="mt-12 flex flex-col gap-16">
          {d.reto2.map((r) => (
            <Registro key={r.registro} registro={r} />
          ))}
        </div>
      ) : (
        <p className="m5-entradilla mt-10 text-[var(--m5-suave)]">
          <TextoEditorial id="m5-a2-r2-sin-registro" original="Este equipo no tiene registros del Reto 2." />
        </p>
      )}
      {n ? (
        <LineaFuente
          className="mt-8"
          id="m5-a2-fuente-reto2"
          original="los dos archivos de la carpeta del Reto 2, transcritos sin corregir."
        />
      ) : null}
    </Capitulo>
  );
}

function Registro({ registro }: { registro: RegistroReto2 }) {
  const cierre = registro.elementos.find((e) => e.elemento.startsWith("Mensaje de cierre"));
  const elementos = registro.elementos.filter((e) => e !== cierre);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h3 className="m5-titular-3">
          {registro.encabezado ?? (
            <>
              <TextoEditorial id="m5-a2-mesa" original="Mesa" /> {registro.mesaQueRegistra}
              {registro.transformacion ? ` · ${registro.transformacion}` : ""}
            </>
          )}
        </h3>
        {registro.registradoPor ? (
          <p className="m5-nota">
            <TextoEditorial id="m5-a2-r2-registrado" original="Registrado por" /> {registro.registradoPor} (
            <TextoEditorial id="m5-a2-mesa" original="Mesa" /> {registro.mesaQueRegistra}).
          </p>
        ) : null}
      </header>
      <table className="m5-tabla">
        <thead>
          <tr>
            <th className="w-[24%]">
              <TextoEditorial id="m5-a2-r2-elemento" original="Elemento" />
            </th>
            <th>
              <TextoEditorial id="m5-a2-r2-diligenciamiento" original="Diligenciamiento" />
            </th>
          </tr>
        </thead>
        <tbody>
          {elementos.map((e) => (
            <tr key={e.elemento}>
              <td className="font-semibold">{e.elemento}</td>
              <td className="m5-texto whitespace-pre-line">{e.texto ? <Literal texto={e.texto} /> : <span className="text-[var(--m5-suave)]">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cierre?.texto ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{cierre.elemento}</p>
          <blockquote className="m5-cita">
            <Literal texto={cierre.texto} />
          </blockquote>
        </div>
      ) : null}
    </article>
  );
}
