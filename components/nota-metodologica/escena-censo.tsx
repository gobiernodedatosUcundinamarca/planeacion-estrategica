"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { muestraPoblacionFinita } from "@/lib/reglas/nota-metodologica";
import type { CalculoMuestra, NotaMetodologica } from "@/types/nota-metodologica";
import { Apartado, COLOR_ESTAMENTO, SUAVIZADO, entero, nombreEstamento, porcentaje, useAlEntrar } from "./piezas";

const clave = (k: CalculoMuestra) => `${k.estamento}|${k.unidad}|${k.vinculacion ?? ""}`;

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Hallazgo en un estrato (cuadrícula de personas) y comparación entre todos los estratos pequeños (tabla). */
export function EscenaCenso({ nota, numero, titulo, enlace }: Props) {
  const p = nota.parametros;
  const censos = nota.calculos.filter((k) => k.censo);
  const [elegido, setElegido] = useState(() => (censos[0] ? clave(censos[0]) : ""));
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.3);
  const actual = censos.find((k) => clave(k) === elegido) ?? censos[0];
  if (!actual) return null;

  const formulaDe = (k: CalculoMuestra) => Math.ceil(muestraPoblacionFinita(k.poblacion, p) - 1e-9);
  const pedidos = formulaDe(actual);
  const extra = actual.poblacion - pedidos;
  const ordenados = [...censos].sort((a, b) => b.poblacion - a.poblacion);

  return (
    <Apartado
      id="escena-censo"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-censo-gancho" original={"¿Qué ocurre cuando el estrato tiene pocas personas?"} />}
      entrada={
        <>
          <TextoEditorial
            id="nota-muestreo-censo-entrada-1"
            original={
              "En poblaciones pequeñas, la fórmula exige convocar a la gran mayoría de las personas. Seleccionar a quiénes excluir no mejora la precisión y reduce la participación. Por ello, en los estratos con"
            }
          />{" "}
          <strong className="nm-cifra">{entero(p.umbralCenso)}</strong>{" "}
          <TextoEditorial id="nota-muestreo-censo-entrada-2" original={"personas o menos se convocó a la totalidad."} />
        </>
      }
    >
      <div ref={ref} className="nm-reticula items-start">
        <div className="nm-margen flex flex-col gap-4">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-censo-lectura" original={"Lectura del gráfico"} />
          </p>
          <p className="flex items-baseline gap-2 text-[length:var(--nm-t-1)]">
            <span className="nm-muestra-color bg-[var(--nm-tinta)]" aria-hidden />
            <span>
              <TextoEditorial id="nota-muestreo-censo-leyenda-formula" original={"Muestra según la fórmula:"} />{" "}
              <strong className="nm-mono">{entero(pedidos)}</strong>
            </span>
          </p>
          {extra > 0 ? (
            <p className="flex items-baseline gap-2 text-[length:var(--nm-t-1)]">
              <span className="nm-muestra-color bg-[var(--nm-senal)]" aria-hidden />
              <span>
                <TextoEditorial id="nota-muestreo-censo-leyenda-extra" original={"Personas adicionales por convocatoria total:"} />{" "}
                <strong className="nm-mono">{entero(extra)}</strong>
              </span>
            </p>
          ) : null}
          <p className="nm-nota border-t border-[var(--nm-linea)] pt-3">
            <TextoEditorial id="nota-muestreo-censo-lista-nota" original={"En el estrato seleccionado, la fórmula habría exigido el"} />{" "}
            <strong className="nm-mono text-[var(--nm-tinta)]">{porcentaje(pedidos / actual.poblacion)}</strong>{" "}
            <TextoEditorial id="nota-muestreo-censo-lista-nota-2" original={"de sus integrantes."} />
          </p>
        </div>

        <div className="col-span-5">
          <p className="text-[length:var(--nm-t-3)] font-semibold">
            {nombreEstamento(nota, actual.estamento)} · {actual.unidad}
            {actual.vinculacion ? ` · ${actual.vinculacion}` : ""}
          </p>
          <p className="nm-mono text-[length:var(--nm-t-1)] text-[var(--nm-gris)]">N = {entero(actual.poblacion)}</p>
          <div key={elegido} className="mt-5 grid grid-cols-10 gap-2" aria-hidden>
            {Array.from({ length: actual.poblacion }, (_, i) => {
              const porFormula = i < pedidos;
              return (
                <span key={i} className="relative aspect-square rounded-full border border-[var(--nm-linea)]">
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: porFormula ? "var(--nm-tinta)" : "var(--nm-senal)" }}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
                    transition={{
                      duration: 0.3,
                      ease: SUAVIZADO,
                      delay: porFormula ? i * 0.012 : pedidos * 0.012 + 0.5 + (i - pedidos) * 0.06,
                    }}
                  />
                </span>
              );
            })}
          </div>
        </div>

        <div className="col-span-4">
          <table className="nm-tabla text-[length:var(--nm-t-1)]">
            <caption className="nm-rotulo mb-2 text-left">
              <TextoEditorial id="nota-muestreo-censo-lista" original={"Estratos con convocatoria total"} />
            </caption>
            <thead>
              <tr>
                <th>
                  <TextoEditorial id="nota-muestreo-censo-columna-estrato" original={"Estrato"} />
                </th>
                <th>N</th>
                <th>
                  <TextoEditorial id="nota-muestreo-censo-columna-formula" original={"Fórmula"} />
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((k) => (
                <tr
                  key={clave(k)}
                  data-elegible=""
                  aria-selected={clave(k) === clave(actual)}
                  tabIndex={0}
                  onClick={() => setElegido(clave(k))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setElegido(clave(k));
                    }
                  }}
                >
                  <td className="py-1.5">
                    <span className="flex items-baseline gap-2">
                      <span className="nm-muestra-color" style={{ backgroundColor: COLOR_ESTAMENTO[k.estamento] }} aria-hidden />
                      <span>
                        {k.unidad}
                        {k.vinculacion ? <span className="text-[var(--nm-gris)]"> · {k.vinculacion}</span> : null}
                      </span>
                    </span>
                  </td>
                  <td className="py-1.5">{entero(k.poblacion)}</td>
                  <td className="py-1.5 text-[var(--nm-gris)]">{entero(formulaDe(k))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Apartado>
  );
}
