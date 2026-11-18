"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import {
  esCenso,
  muestraPoblacionFinita,
  muestraPoblacionInfinita,
  muestraRequerida,
  varianzaEsperada,
} from "@/lib/reglas/nota-metodologica";
import type { CalculoMuestra, EstamentoMuestreo, NotaMetodologica } from "@/types/nota-metodologica";
import {
  Apartado,
  COLOR_ESTAMENTO,
  Cita,
  Pestanas,
  SUAVIZADO,
  decimal,
  entero,
  nombreEstamento,
  porcentaje,
  useAlEntrar,
} from "./piezas";

/** Parámetros con los decimales que tengan, sin ceros de relleno («0,5», «1,96»). */
const compacto = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 });
const c = (n: number) => compacto.format(n);

function claveDe(k: CalculoMuestra): string {
  return `${k.unidad}|${k.vinculacion ?? ""}`;
}

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Procedimiento: la fórmula anotada símbolo por símbolo y un ejemplo desarrollado como secuencia aritmética. */
export function EscenaFormula({ nota, numero, titulo, enlace }: Props) {
  const [estamento, setEstamento] = useState<EstamentoMuestreo>(nota.calculos[0]?.estamento ?? "estudiantes");
  const opciones = nota.calculos.filter((k) => k.estamento === estamento);
  const [clave, setClave] = useState(() => (opciones[0] ? claveDe(opciones[0]) : ""));
  const calculo = opciones.find((k) => claveDe(k) === clave) ?? opciones[0];
  const [ref, visible] = useAlEntrar<HTMLOListElement>(0.2);

  if (!calculo) return null;

  const p = nota.parametros;
  const N = calculo.poblacion;
  const numerador = p.z ** 2 * varianzaEsperada(p);
  const finita = muestraPoblacionFinita(N, p);
  const requerida = muestraRequerida(N, p);
  const censo = esCenso(N, p);
  const coincide = requerida === calculo.muestraCalculada;

  const simbolos = [
    {
      simbolo: "N",
      valor: entero(N),
      texto: <TextoEditorial id="nota-muestreo-formula-simbolo-n" original={"Población del estrato"} />,
    },
    {
      simbolo: "Z",
      valor: c(p.z),
      texto: (
        <>
          <TextoEditorial id="nota-muestreo-formula-simbolo-z" original={"Valor crítico para un nivel de confianza del"} />{" "}
          {porcentaje(p.confianza, 0)}
        </>
      ),
    },
    {
      simbolo: "p",
      valor: c(p.proporcion),
      texto: <TextoEditorial id="nota-muestreo-formula-simbolo-p" original={"Proporción esperada"} />,
    },
    {
      simbolo: "e",
      valor: c(p.margenError),
      texto: <TextoEditorial id="nota-muestreo-formula-simbolo-e" original={"Margen de error de planificación"} />,
    },
  ];

  const pasos: { titulo: ReactNode; formula: ReactNode; resultado: string; nota?: ReactNode }[] = [
    {
      titulo: <TextoEditorial id="nota-muestreo-formula-paso-1" original={"Tamaño de muestra para una población muy grande"} />,
      formula: (
        <>
          n₀ = Z² · p · (1 − p) ÷ e² = {c(p.z)}² · {c(p.proporcion)} · {c(1 - p.proporcion)} ÷ {c(p.margenError)}²
        </>
      ),
      resultado: decimal(muestraPoblacionInfinita(p), 2),
      nota: (
        <TextoEditorial
          id="nota-muestreo-formula-paso-1-nota"
          original={"Valor de partida, común a todos los estratos; no depende del tamaño de la población."}
        />
      ),
    },
    {
      titulo: <TextoEditorial id="nota-muestreo-formula-paso-2" original={"Corrección por población finita"} />,
      formula: (
        <>
          n = {entero(N)} · {c(numerador)} ÷ ({c(p.margenError ** 2)} · {entero(N - 1)} + {c(numerador)})
        </>
      ),
      resultado: decimal(finita, 2),
      nota: (
        <TextoEditorial
          id="nota-muestreo-formula-paso-2-nota"
          original={"Ajusta el valor anterior al tamaño real del estrato: en poblaciones finitas se requieren menos personas."}
        />
      ),
    },
    {
      titulo: censo ? (
        <TextoEditorial id="nota-muestreo-formula-paso-3-censo" original={"Estrato pequeño: convocatoria total"} />
      ) : (
        <TextoEditorial id="nota-muestreo-formula-paso-3" original={"Redondeo al entero superior"} />
      ),
      formula: censo ? (
        <>
          N = {entero(N)} ≤ {entero(p.umbralCenso)}
        </>
      ) : (
        <>⌈{decimal(finita, 2)}⌉</>
      ),
      resultado: entero(requerida),
      nota: censo ? (
        <>
          <TextoEditorial id="nota-muestreo-formula-paso-3-censo-nota" original={"La fórmula habría arrojado"} />{" "}
          {entero(Math.ceil(finita - 1e-9))}{" "}
          <TextoEditorial
            id="nota-muestreo-formula-paso-3-censo-nota-2"
            original={"personas; la regla de convocatoria total se explica más adelante."}
          />
        </>
      ) : (
        <TextoEditorial
          id="nota-muestreo-formula-paso-3-nota"
          original={"El resultado se redondea siempre hacia arriba para no quedar por debajo de la precisión fijada."}
        />
      ),
    },
  ];

  return (
    <Apartado
      id="escena-formula"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-formula-gancho" original={"¿Cuántas personas era necesario convocar en cada estrato?"} />}
      entrada={
        <TextoEditorial
          id="nota-muestreo-formula-entrada"
          original={
            "El cálculo se realizó de forma independiente para cada combinación de unidad regional y estamento (estrato). Así, cada unidad cuenta con su propia meta y las unidades de menor tamaño quedan debidamente representadas."
          }
        />
      }
    >
      <Cita rotulo={<TextoEditorial id="nota-muestreo-formula-principio" original={"Principio"} />}>
        <TextoEditorial
          id="nota-muestreo-formula-metafora"
          original={
            "No es necesario consultar a toda la población para conocer su opinión con un margen de error conocido: basta con un subconjunto de tamaño suficiente."
          }
        />
      </Cita>

      <div className="nm-reticula mt-14">
        <p className="nm-margen nm-rotulo pt-3">
          <TextoEditorial id="nota-muestreo-formula-rotulo" original={"Fórmula para población finita"} />
        </p>
        <div className="nm-principal">
          {/* Fracción compuesta tipográficamente: numerador sobre denominador, como se escribe a mano. */}
          <div className="nm-mono flex items-center gap-4 text-[length:var(--nm-t-4)] leading-tight" role="math" aria-label="n igual a N por Z al cuadrado por p por uno menos p, dividido entre e al cuadrado por N menos uno, más Z al cuadrado por p por uno menos p">
            <span>n =</span>
            <span className="inline-flex flex-col items-center">
              <span className="px-2 pb-1">N · Z² · p(1 − p)</span>
              <span className="border-t-2 border-[var(--nm-tinta)] px-2 pt-1">e² · (N − 1) + Z² · p(1 − p)</span>
            </span>
          </div>
          <dl className="mt-5 grid grid-cols-4 gap-6 border-t border-[var(--nm-tinta)] pt-3">
            {simbolos.map((s) => (
              <div key={s.simbolo}>
                <dt className="nm-mono text-[length:var(--nm-t-3)]">
                  {s.simbolo}
                  {s.simbolo !== "N" ? <span className="text-[var(--nm-gris)]"> = {s.valor}</span> : null}
                </dt>
                <dd className="nm-nota mt-1">{s.texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="nm-reticula mt-14">
        <div className="nm-margen flex flex-col gap-5">
          <p className="nm-rotulo">
            <TextoEditorial id="nota-muestreo-formula-sigamos" original={"Ejemplo desarrollado"} />
          </p>
          <Pestanas<EstamentoMuestreo>
            etiqueta="Estamento del ejemplo"
            orientacion="vertical"
            valor={estamento}
            onCambio={(e) => {
              setEstamento(e);
              const primero = nota.calculos.find((k) => k.estamento === e);
              if (primero) setClave(claveDe(primero));
            }}
            opciones={nota.totales.map((t) => ({
              id: t.estamento,
              texto: nombreEstamento(nota, t.estamento),
              color: COLOR_ESTAMENTO[t.estamento],
            }))}
          />
          <Pestanas<string>
            etiqueta="Unidad regional del ejemplo"
            orientacion="vertical"
            valor={claveDe(calculo)}
            onCambio={setClave}
            opciones={opciones.map((k) => ({
              id: claveDe(k),
              texto: k.vinculacion ? `${k.unidad} · ${k.vinculacion}` : k.unidad,
            }))}
          />
          {estamento === "administrativos" ? (
            <p className="nm-nota">
              <TextoEditorial
                id="nota-muestreo-formula-administrativos"
                original={
                  "En el estamento administrativo, el personal de planta y los contratistas OPS-APA se calcularon como estratos separados y luego se sumaron por unidad regional."
                }
              />
            </p>
          ) : null}
        </div>

        <div className="nm-principal">
          <p className="text-[length:var(--nm-t-3)] font-semibold">
            {nombreEstamento(nota, calculo.estamento)} · {calculo.unidad}
            {calculo.vinculacion ? ` · ${calculo.vinculacion}` : ""}
            <span className="nm-mono ml-3 font-normal text-[var(--nm-gris)]">N = {entero(N)}</span>
          </p>

          <ol ref={ref} key={claveDe(calculo) + estamento} className="mt-4 border-t border-[var(--nm-tinta)]">
            {pasos.map((paso, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.45, delay: i * 0.3, ease: SUAVIZADO }}
                className="grid grid-cols-[2.5rem_1fr_8rem] items-baseline gap-4 border-b border-[var(--nm-linea)] py-4"
              >
                <span className="nm-mono text-[var(--nm-gris)]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-semibold">{paso.titulo}</p>
                  <p className="nm-mono mt-1 text-[length:var(--nm-t-1)]">{paso.formula}</p>
                  {paso.nota ? <p className="nm-nota mt-1">{paso.nota}</p> : null}
                </div>
                <span className="nm-cifra text-right text-[length:var(--nm-t-4)]">{paso.resultado}</span>
              </motion.li>
            ))}
            <motion.li
              initial={{ opacity: 0 }}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ duration: 0.5, delay: pasos.length * 0.3 }}
              className="grid grid-cols-[2.5rem_1fr_8rem] items-baseline gap-4 border-b-[3px] border-double border-[var(--nm-tinta)] py-5"
            >
              <span className="nm-mono text-[var(--nm-gris)]">{String(pasos.length + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-semibold">
                  <TextoEditorial id="nota-muestreo-formula-paso-4" original={"Personas convocadas"} />
                </p>
                <p className="nm-mono mt-1 text-[length:var(--nm-t-1)]">
                  {calculo.topeLogistico !== null ? (
                    <>
                      mín({entero(calculo.muestraCalculada)}, {entero(calculo.topeLogistico)})
                    </>
                  ) : (
                    <TextoEditorial id="nota-muestreo-formula-paso-4-igual" original={"= muestra calculada"} />
                  )}
                </p>
                {calculo.observacion ? <p className="nm-nota mt-1">{calculo.observacion}</p> : null}
                <p className="nm-rotulo mt-2" style={{ color: coincide ? "var(--nm-acento)" : "var(--nm-senal)" }}>
                  {coincide ? (
                    <TextoEditorial id="nota-muestreo-formula-coincide" original={"Verificado frente al Excel"} />
                  ) : (
                    <>
                      <TextoEditorial id="nota-muestreo-formula-no-coincide" original={"Diferencia con el Excel:"} />{" "}
                      {entero(calculo.muestraCalculada)}
                    </>
                  )}
                </p>
              </div>
              <span className="nm-cifra text-right text-[length:var(--nm-t-6)] leading-none font-bold">
                {entero(calculo.convocados)}
              </span>
            </motion.li>
          </ol>
        </div>
      </div>
    </Apartado>
  );
}
