"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { EstratoMuestreo, NotaMetodologica } from "@/types/nota-metodologica";
import { Apartado, COLOR_ESTAMENTO, decimal, entero, nombreEstamento, useAlEntrar } from "./piezas";

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Comparación: tabla con un estrato por columna y, debajo, el mapa de sillas de cada uno. */
export function EscenaTope({ nota, numero, titulo, enlace }: Props) {
  const conTope = nota.estratos.filter((e) => e.topeLogistico !== null);
  if (conTope.length === 0) return null;
  const observaciones = [...new Set(conTope.map((e) => e.observacion).filter((o): o is string => Boolean(o)))];

  const filas: { texto: ReactNode; valor: (e: EstratoMuestreo) => ReactNode; destacada?: boolean }[] = [
    {
      texto: <TextoEditorial id="nota-muestreo-tabla-poblacion" original={"Población"} />,
      valor: (e) => entero(e.poblacion),
    },
    {
      texto: <TextoEditorial id="nota-muestreo-tope-calculada" original={"Muestra calculada"} />,
      valor: (e) => entero(e.muestraCalculada),
    },
    {
      texto: <TextoEditorial id="nota-muestreo-tope-capacidad" original={"Capacidad del auditorio"} />,
      valor: (e) => entero(e.topeLogistico ?? 0),
    },
    {
      texto: <TextoEditorial id="nota-muestreo-formula-paso-4" original={"Personas convocadas"} />,
      valor: (e) => entero(e.convocados),
      destacada: true,
    },
    {
      texto: <TextoEditorial id="nota-muestreo-tope-sin-silla" original={"Sin cupo"} />,
      valor: (e) => `−${entero(e.muestraCalculada - e.convocados)}`,
    },
    {
      texto: <TextoEditorial id="nota-muestreo-tope-margen" original={"Margen de error de planificación"} />,
      valor: (e) => (
        <>
          <span className="text-[var(--nm-gris)]">±{decimal(nota.parametros.margenError * 100, 1)} → </span>±
          {decimal(e.margenDiseno * 100, 1)}
        </>
      ),
      destacada: true,
    },
  ];

  return (
    <Apartado
      id="escena-tope"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-tope-gancho" original={"¿Qué ocurre cuando la capacidad del lugar es inferior a la muestra?"} />}
      entrada={
        <TextoEditorial
          id="nota-muestreo-tope-entrada"
          original={"Cuando la capacidad del lugar del encuentro era inferior a la muestra calculada, la convocatoria se limitó a dicha capacidad."}
        />
      }
    >
      <div className="nm-reticula items-start">
        <aside className="nm-margen">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-tope-efecto" original={"Efecto del ajuste"} />
          </p>
          <p className="nm-nota mt-1">
            <TextoEditorial
              id="nota-muestreo-tope-metafora"
              original={
                "Al convocar a menos personas que las indicadas por la fórmula, se reduce la precisión prevista del estrato, aun cuando asista la totalidad de los convocados."
              }
            />
          </p>
        </aside>

        <div className="nm-principal">
          <table className="nm-tabla">
            <thead>
              <tr>
                <th />
                {conTope.map((e) => (
                  <th key={`${e.estamento}-${e.unidad}`} className="w-[30%]">
                    <span className="inline-flex items-center gap-2 normal-case tracking-normal text-[var(--nm-tinta)]">
                      <span className="nm-muestra-color" style={{ backgroundColor: COLOR_ESTAMENTO[e.estamento] }} aria-hidden />
                      {nombreEstamento(nota, e.estamento)} · {e.unidad}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td className={f.destacada ? "font-semibold" : undefined}>{f.texto}</td>
                  {conTope.map((e) => (
                    <td
                      key={`${e.estamento}-${e.unidad}`}
                      className={f.destacada ? "text-[length:var(--nm-t-4)] font-bold" : "text-[length:var(--nm-t-3)]"}
                    >
                      {f.valor(e)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 grid gap-8" style={{ gridTemplateColumns: `repeat(${conTope.length}, minmax(0, 1fr))` }}>
            {conTope.map((e, i) => (
              <Sillas key={`${e.estamento}-${e.unidad}`} estrato={e} retraso={i * 0.3} />
            ))}
          </div>
          <p className="nm-nota mt-3">
            <TextoEditorial id="nota-muestreo-tope-escala" original={"Cada silla representa a dos personas."} />{" "}
            {observaciones.join(" ")}
          </p>
        </div>
      </div>
    </Apartado>
  );
}

function Sillas({ estrato, retraso }: { estrato: EstratoMuestreo; retraso: number }) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.3);
  const color = COLOR_ESTAMENTO[estrato.estamento];
  // Las sillas se dibujan por lotes de 2 para que 300+ puestos quepan sin volverse polvo.
  const porSilla = 2;
  const sillas = Math.ceil(estrato.muestraCalculada / porSilla);
  const ocupadas = Math.ceil(estrato.convocados / porSilla);

  return (
    <div ref={ref} className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]" aria-hidden>
      {Array.from({ length: sillas }, (_, i) => {
        const ocupada = i < ocupadas;
        return (
          <motion.span
            key={i}
            className="aspect-[4/5]"
            style={ocupada ? { backgroundColor: color } : { border: "1px solid var(--nm-gris)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? (ocupada ? 1 : 0.5) : 0 }}
            transition={{
              duration: 0.25,
              delay: retraso + (ocupada ? i * 0.005 : ocupadas * 0.005 + 0.4 + (i - ocupadas) * 0.008),
            }}
          />
        );
      })}
    </div>
  );
}
