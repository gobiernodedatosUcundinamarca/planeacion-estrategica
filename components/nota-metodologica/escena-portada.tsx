"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { NotaMetodologica } from "@/types/nota-metodologica";
import { COLOR_ESTAMENTO, Contador, SUAVIZADO, entero, partirEtiqueta, sumarTotales, useAlEntrar } from "./piezas";

/**
 * Apertura. El titular es la cifra de la población y, debajo, la matriz de
 * las metas por estrato: la idea propia de este diseño (una muestra para cada
 * unidad regional y estamento) es lo primero que se ve.
 */
export function EscenaPortada({
  nota,
  indice,
}: {
  nota: NotaMetodologica;
  indice: { id: string; titulo: ReactNode }[];
}) {
  const total = sumarTotales(nota.totales);
  const [refMatriz, visible] = useAlEntrar<HTMLTableElement>(0.3);
  const hayTope = nota.estratos.some((e) => e.topeLogistico !== null);
  const hayCenso = nota.estratos.some((e) => e.censo);
  const observacionTope = nota.estratos.find((e) => e.observacion)?.observacion ?? null;

  return (
    <section className="pb-16">
      <div className="nm-reticula items-baseline border-b border-[var(--nm-tinta)] pb-3">
        <p className="nm-margen nm-rotulo">
          <TextoEditorial id="04ac4c37bf9db99e7963" original={"Universidad de Cundinamarca"} />
        </p>
        <p className="col-span-6 nm-rotulo">
          <TextoEditorial id="nota-muestreo-portada-antetitulo" original={"Plan Estratégico 2027–2037 · Mesas de diálogo"} />
        </p>
        {nota.asistencia.corte ? (
          <p className="col-span-3 nm-rotulo text-right">
            <TextoEditorial id="nota-muestreo-portada-corte" original={"Corte de asistencia"} /> {nota.asistencia.corte}
          </p>
        ) : null}
      </div>

      <div className="nm-reticula mt-12">
        <div className="nm-margen">
          <motion.h1
            className="nm-h1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: SUAVIZADO }}
          >
            <TextoEditorial id="nota-muestreo-titulo" original={"Nota metodológica: muestreo"} />
          </motion.h1>
          <p className="nm-nota mt-4">
            <TextoEditorial
              id="nota-muestreo-portada-entrada"
              original={
                "Este documento explica cómo se determinó el número de personas convocadas a las mesas de diálogo en cada unidad regional y estamento, cómo se registró la asistencia y qué alcance tienen los resultados obtenidos."
              }
            />
          </p>
        </div>
        <div className="nm-principal">
          <p className="nm-display">
            <Contador valor={total.poblacion} duracion={2} />
          </p>
          <p className="mt-6 max-w-[40ch] text-[length:var(--nm-t-3)] leading-snug">
            <TextoEditorial
              id="nota-muestreo-portada-tesis-1"
              original={
                "personas conforman la población de referencia. No era necesario convocarlas a todas: se calculó una muestra independiente para cada uno de los"
              }
            />{" "}
            <strong className="nm-cifra">{entero(nota.estratos.length)}</strong>{" "}
            <TextoEditorial
              id="nota-muestreo-portada-tesis-2"
              original={"estratos de unidad regional y estamento, y se registraron"}
            />{" "}
            <strong className="nm-cifra">{entero(total.asistentes)}</strong>{" "}
            <TextoEditorial id="nota-muestreo-portada-tesis-3" original={"asistentes."} />
          </p>
        </div>
      </div>

      <div className="nm-reticula mt-16">
        <div className="nm-margen">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-portada-matriz-rotulo" original={"Muestra calculada por estrato"} />
          </p>
          <p className="nm-nota mt-2">
            <TextoEditorial
              id="nota-muestreo-portada-matriz-nota"
              original={"Cada cifra es la meta de un estrato. Su suma es la muestra total del diseño:"}
            />{" "}
            <strong className="nm-cifra text-[var(--nm-tinta)]">{entero(total.muestraCalculada)}</strong>.
          </p>
        </div>
        <div className="nm-principal">
          <table ref={refMatriz} className="nm-tabla">
            <thead>
              <tr>
                <th>
                  <TextoEditorial id="nota-muestreo-portada-matriz-estamento" original={"Estamento"} />
                </th>
                {nota.unidades.map((u) => (
                  <th key={u.nombre}>
                    <span className="block normal-case tracking-normal text-[var(--nm-tinta)]">{u.nombre}</span>
                    {u.tipo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nota.totales.map((t, fila) => (
                <tr key={t.estamento}>
                  <td className="whitespace-nowrap">
                    <span className="nm-muestra-color mr-2" style={{ backgroundColor: COLOR_ESTAMENTO[t.estamento] }} aria-hidden />
                    {partirEtiqueta(t.etiqueta).nombre}
                  </td>
                  {nota.unidades.map((u, col) => {
                    const e = nota.estratos.find((x) => x.estamento === t.estamento && x.unidad === u.nombre);
                    return (
                      <td key={u.nombre} className="text-[length:var(--nm-t-3)]">
                        {e ? (
                          <motion.span
                            className="inline-block"
                            initial={{ opacity: 0, y: 6 }}
                            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                            transition={{ duration: 0.4, delay: (fila * nota.unidades.length + col) * 0.03 }}
                          >
                            {entero(e.muestraCalculada)}
                            <sup className="nm-mono ml-0.5 text-[length:var(--nm-t-0)] text-[var(--nm-senal)]">
                              {e.topeLogistico !== null ? "*" : e.censo ? "†" : ""}
                            </sup>
                          </motion.span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-col gap-1">
            {hayTope ? (
              <p className="nm-nota">
                <span className="nm-mono text-[var(--nm-senal)]">* </span>
                {observacionTope}
              </p>
            ) : null}
            {hayCenso ? (
              <p className="nm-nota">
                <span className="nm-mono text-[var(--nm-senal)]">† </span>
                <TextoEditorial id="nota-muestreo-portada-censo" original={"Estrato pequeño: se convocó a la totalidad de sus integrantes."} />
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <nav aria-label="Apartados de la nota" className="nm-reticula mt-16 border-t border-[var(--nm-linea)] pt-4">
        <p className="nm-margen nm-rotulo">
          <TextoEditorial id="nota-muestreo-portada-contenido" original={"Contenido"} />
        </p>
        <ol className="nm-principal grid grid-cols-2 gap-x-8">
          {indice.map((apartado, i) => (
            <li key={apartado.id} className="border-b border-[var(--nm-linea)]">
              <a href={`#${apartado.id}`} className="flex gap-4 py-2 text-[length:var(--nm-t-1)] hover:text-[var(--nm-acento)]">
                <span className="nm-mono text-[var(--nm-gris)]">{String(i + 1).padStart(2, "0")}</span>
                {apartado.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
