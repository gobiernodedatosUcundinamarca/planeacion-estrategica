"use client";

import { useState } from "react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";
import type { FiltroEquipo } from "@/lib/reglas/momento5";
import type { CategoriaPeriodicidad, DerivadosActividad2 } from "@/lib/reglas/momento5-actividad2";
import type { Actividad2Momento5, InstrumentoActividad2 } from "@/types/momento5-actividad2";
import { FiltroCategoria, LineaFuente, Literal, Tarjeta } from "../piezas";
import { Capitulo, Cifra, Clasificacion, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";
import { LeyendaPeriodicidad, MapaMesas } from "./graficos-actividad2";

/** «3, 6 y 8». */
function enumerar(numeros: number[]): string {
  const t = numeros.map((n) => formatNumero(n));
  return t.length > 1 ? `${t.slice(0, -1).join(", ")} y ${t[t.length - 1]}` : (t[0] ?? "");
}

/** Texto de varias líneas tal como lo escribió la mesa (viñetas y saltos incluidos). */
function Celda({ texto, sic = false }: { texto: string | null; sic?: boolean }) {
  if (!texto) return <span className="text-[var(--m5-suave)]">—</span>;
  return <span className="whitespace-pre-line">{sic ? <Literal texto={texto} /> : texto}</span>;
}

/**
 * Ficha de evidencias del futuro por mesa (Reto 1): cada mesa respondió la
 * pregunta base para una transformación y propuso indicadores. Se muestra lo
 * que escribió cada una, con las preguntas y los encabezados de la ficha tal
 * como venían, sin comparar mesas ni corregir textos.
 */
export function CapituloReto1({
  instrumento,
  a2,
  d,
  equipo,
  compacto,
}: {
  instrumento: InstrumentoActividad2;
  a2: Actividad2Momento5;
  d: DerivadosActividad2;
  equipo: FiltroEquipo;
  compacto: boolean;
}) {
  const [transformacion, setTransformacion] = useState<string | null>(null);
  const h = a2.encabezadosIndicadores;
  const preguntas = a2.mesas[0]?.respuestas.map((r) => r.pregunta) ?? [];
  const preguntaBase = a2.enunciados.find((e) => e.instrumento === "reto1")?.enunciado;
  const nMesas = d.mesas.length;
  const nIndicadores = d.indicadores.length;
  const conteo = (c: CategoriaPeriodicidad) => d.periodicidad.find((p) => p.id === c)?.value ?? 0;
  const indicadoresTabla = d.indicadores.filter(
    (i) => transformacion === null || d.mesas.find((m) => m.mesa === i.mesa)?.transformacion === transformacion
  );

  const pasos = nMesas
    ? [
        <div key="0" className="flex flex-col gap-4">
          {preguntaBase ? <Pregunta>{preguntaBase}</Pregunta> : null}
          <p className="m5-entradilla">
            {equipo === null ? (
              <>
                <Cifra valor={nMesas} /> <TextoEditorial id="m5-a2-r1-paso1-a" original="mesas, dos por transformación, diligenciaron la ficha." />
              </>
            ) : (
              <>
                <TextoEditorial id="m5-a2-r1-paso1-equipo" original="La mesa de este equipo trabajó" /> {d.mesas[0].transformacion}.
              </>
            )}
          </p>
          <p className="m5-nota">
            <TextoEditorial
              id="m5-a2-r1-paso1-nota"
              original="Cada mesa es el equipo del mismo número en las demás actividades: los integrantes que anotan las fichas de las mesas 1, 3 y 8 son los de esos equipos."
            />
          </p>
        </div>,
        <div key="1" className="flex flex-col gap-4">
          <Pregunta>
            <TextoEditorial id="m5-a2-r1-indicadores-propuestos" original="Indicadores propuestos" />
          </Pregunta>
          <p className="m5-entradilla">
            <Cifra valor={nIndicadores} /> {nIndicadores === 1 ? "indicador" : "indicadores"}
            {nMesas > 1 && d.mesasConMas.length ? (
              <>
                ; {d.mesasConMas.length === 1 ? "la mesa" : "las mesas"} {enumerar(d.mesasConMas)}{" "}
                <TextoEditorial id="m5-a2-r1-paso2-a" original="propusieron" /> <Cifra valor={d.maximo} />
                {d.mesasConMas.length > 1 ? " cada una" : ""}.
              </>
            ) : (
              "."
            )}
          </p>
          <p className="m5-nota">
            <TextoEditorial id="m5-a2-r1-paso2-nota" original="Cada casilla del gráfico es un indicador de la mesa." />
          </p>
        </div>,
        <div key="2" className="flex flex-col gap-4">
          <Pregunta>{h.periodicidad}</Pregunta>
          <p className="m5-entradilla">
            <Cifra valor={conteo("Anual")} /> <TextoEditorial id="m5-a2-r1-paso3-a" original="anuales," /> <Cifra valor={conteo("Semestral")} />{" "}
            <TextoEditorial id="m5-a2-r1-paso3-b" original="semestrales" />
            {conteo("Otra") ? (
              <>
                {" "}
                <TextoEditorial id="m5-a2-r1-paso3-c" original="y" /> <Cifra valor={conteo("Otra")} />{" "}
                <TextoEditorial id="m5-a2-r1-paso3-d" original="con otra periodicidad" />
              </>
            ) : null}
            .
          </p>
          <p className="m5-nota">
            <TextoEditorial
              id="m5-a2-r1-paso3-nota"
              original="Cuenta la primera periodicidad que escribió la mesa: «Semestral (seguimiento) / Anual (resultado)» se cuenta como semestral."
            />
          </p>
        </div>,
      ]
    : [
        <p key="0" className="m5-entradilla text-[var(--m5-suave)]">
          <TextoEditorial id="m5-a2-r1-sin-ficha" original="Este equipo no tiene ficha del Reto 1." />
        </p>,
      ];

  return (
    <Capitulo
      id={instrumento.id}
      titulo={instrumento.nombre}
      equipo={equipo}
      ficha={
        <>
          {instrumento.instrumento} · <TextoEditorial id="m5-a2-actividad" original="Actividad 2." />{" "}
          <TextoEditorial id="m5-a2-r1-ficha-a" original="Una ficha por mesa:" /> <span className="m5-cifra">{formatNumero(nMesas)}</span>{" "}
          {nMesas === 1 ? "mesa" : "mesas"}, <span className="m5-cifra">{formatNumero(nIndicadores)}</span>{" "}
          {nIndicadores === 1 ? "indicador." : <TextoEditorial id="m5-a2-r1-ficha-b" original="indicadores." />}
        </>
      }
    >
      <Escenario
        compacto={compacto}
        pasos={pasos}
        grafico={(i) =>
          nMesas ? (
            <figure className="flex w-full flex-col gap-4">
              <MapaMesas transformaciones={d.transformaciones} estado={Math.min(i, 2) as 0 | 1 | 2} />
              {i >= 2 ? <LeyendaPeriodicidad conteos={d.periodicidad} /> : null}
              <figcaption>
                <LineaFuente
                  id="m5-a2-fuente-mapa"
                  original="fichas del Reto 1, una por mesa, agrupadas por la transformación que trabajó cada una. Cada casilla es una fila de «Indicadores propuestos»; su color, lo que la mesa escribió en «Periodicidad»."
                />
              </figcaption>
            </figure>
          ) : null
        }
      />

      {nMesas ? (
        <>
          <h3 className="m5-titular-3 mt-16">
            <TextoEditorial id="m5-a2-r1-propuesta" original="Propuesta MESA" />
          </h3>
          <table className="m5-tabla mt-6">
            <thead>
              <tr>
                <th className="w-[13%]">
                  <TextoEditorial id="m5-a2-mesa" original="Mesa" />
                </th>
                {preguntas.map((p) => (
                  <th key={p} className="w-[29%]">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            {d.transformaciones.map((t) => (
              <tbody key={t.nombre}>
                <tr>
                  <th colSpan={preguntas.length + 1} className="pt-6 text-[0.9375rem] text-[var(--m5-tinta)]">
                    {t.nombre}
                  </th>
                </tr>
                {t.mesas.map((m) => (
                  <MesaFilas key={m.mesa} mesa={m} columnas={preguntas.length} />
                ))}
              </tbody>
            ))}
          </table>
          <LineaFuente
            className="mt-4"
            id="m5-a2-fuente-propuesta"
            original="tabla «Propuesta MESA» de cada ficha del Reto 1, transcrita sin corregir. La Mesa 2 entregó cuatro archivos (dos idénticos) con el mismo contenido en distinta redacción: se publica el último que se guardó. Los archivos recibidos están al final de la página."
          />
        </>
      ) : null}

      {nMesas ? (
        <Clasificacion>
          <Tarjeta
            titulo="Indicadores propuestos"
            acciones={
              d.transformaciones.length > 1 ? (
                <FiltroCategoria
                  etiqueta="Transformación"
                  items={d.transformaciones.map((t) => ({ id: t.nombre, label: t.nombre }))}
                  valor={transformacion}
                  onCambiar={setTransformacion}
                />
              ) : null
            }
          >
            <div className="overflow-x-auto">
              <table className="m5-tabla text-[0.8125rem]">
                <thead>
                  <tr>
                    <th className="w-[7%]">
                      <TextoEditorial id="m5-a2-mesa" original="Mesa" />
                    </th>
                    <th className="w-[17%]">{h.indicador}</th>
                    <th className="w-[19%]">{h.formula}</th>
                    <th className="w-[16%]">{h.desagregacion}</th>
                    <th className="w-[16%]">{h.medio}</th>
                    <th className="w-[11%]">{h.periodicidad}</th>
                    <th className="w-[14%]">{h.responsable}</th>
                  </tr>
                </thead>
                <tbody>
                  {indicadoresTabla.map((i) => (
                    <tr key={`${i.mesa}-${i.orden}`}>
                      <td className="m5-cifra font-semibold">{i.mesa}</td>
                      <td>
                        <Celda texto={i.indicador} sic />
                        {i.adicional ? (
                          <span className="m5-nota mt-1 block whitespace-pre-line">
                            <Literal texto={i.adicional} />
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <Celda texto={i.formula} />
                      </td>
                      <td>
                        <Celda texto={i.desagregacion} />
                      </td>
                      <td>
                        <Celda texto={i.medio} />
                      </td>
                      <td>
                        <Celda texto={i.periodicidad} />
                      </td>
                      <td>
                        <Celda texto={i.responsable} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LineaFuente
              id="m5-a2-fuente-indicadores"
              original="tabla «Indicadores propuestos» de cada ficha, transcrita sin corregir; los campos van tal como los escribió la mesa. La Mesa 3 entregó sus indicadores en texto, con los campos separados por punto y coma, en el orden de la tabla. La tabla de la Mesa 6 trae un indicador; los otros dos están en su respuesta a «¿Cómo sabremos que ocurrió?» y se incluyen con los campos que allí aparecen."
            />
          </Tarjeta>

          {d.cierres.length ? (
            <section className="flex flex-col gap-6 border-t border-[var(--m5-filete)] pt-4">
              <h3 className="text-base leading-snug font-semibold">{d.cierres[0].cierre.pregunta}</h3>
              <ul className="grid grid-cols-2 gap-x-[var(--m5-medianil)] gap-y-8">
                {d.cierres.map((m) => (
                  <li key={m.mesa}>
                    <blockquote className="m5-cita">
                      <Literal texto={m.cierre.texto} />
                    </blockquote>
                    <p className="m5-cita-autor">
                      <TextoEditorial id="m5-a2-mesa" original="Mesa" /> {m.mesa} · {m.transformacion}
                    </p>
                  </li>
                ))}
              </ul>
              <LineaFuente
                id="m5-a2-fuente-cierres"
                original="última diapositiva de cada ficha del Reto 1. Se muestran las mesas que la diligenciaron."
              />
            </section>
          ) : null}
        </Clasificacion>
      ) : null}
    </Capitulo>
  );
}

/** Las filas de una mesa: su número y sus tres respuestas; si eligió un resultado, va encima. */
function MesaFilas({ mesa, columnas }: { mesa: DerivadosActividad2["mesas"][number]; columnas: number }) {
  return (
    <>
      {mesa.resultado.texto ? (
        <tr>
          <td className="border-b-0 pb-0" />
          <td colSpan={columnas} className="border-b-0 pb-0 text-[0.875rem]">
            <span className="font-semibold">{mesa.resultado.pregunta}</span> <Literal texto={mesa.resultado.texto} />
          </td>
        </tr>
      ) : null}
      <tr>
        <td>
          {/* Solo el número de la mesa: el nombre que algunas se pusieron no se muestra. */}
          <span className="block font-semibold">
            <TextoEditorial id="m5-a2-mesa" original="Mesa" /> <span className="m5-cifra">{mesa.mesa}</span>
          </span>
        </td>
        {mesa.respuestas.map((r) => (
          <td key={r.pregunta}>
            <Celda texto={r.texto} sic />
          </td>
        ))}
      </tr>
    </>
  );
}
