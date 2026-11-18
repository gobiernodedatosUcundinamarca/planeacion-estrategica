"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { EstamentoMuestreo, NotaMetodologica } from "@/types/nota-metodologica";
import {
  Apartado,
  COLOR_ESTAMENTO,
  Contador,
  Pestanas,
  SUAVIZADO,
  entero,
  partirEtiqueta,
  porcentaje,
  sumarTotales,
  useAlEntrar,
} from "./piezas";

type Filtro = "todos" | EstamentoMuestreo;
type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/**
 * Hallazgo: gráfico anotado con ampliación. La población ocupa todo el ancho
 * y la muestra es un tramo pequeño; ese tramo se amplía debajo para comparar
 * las tres cifras siguientes, que a escala de la población serían ilegibles.
 */
export function EscenaCuatroCifras({ nota, numero, titulo, enlace }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.3);

  const cifras = filtro === "todos" ? sumarTotales(nota.totales) : nota.totales.find((t) => t.estamento === filtro)!;
  const color = filtro === "todos" ? "var(--nm-acento)" : COLOR_ESTAMENTO[filtro];
  const fraccionMuestra = cifras.muestraCalculada / cifras.poblacion;
  const mayor = Math.max(cifras.muestraCalculada, cifras.convocados, cifras.asistentes);
  const diferencia = cifras.convocados - cifras.muestraCalculada;

  const ampliadas = [
    {
      etapa: 2,
      valor: cifras.muestraCalculada,
      titulo: <TextoEditorial id="nota-muestreo-tope-calculada" original={"Muestra calculada"} />,
      definicion: (
        <TextoEditorial id="nota-muestreo-cifras-muestra-def" original={"Tamaño mínimo que la fórmula estadística establece para cada estrato."} />
      ),
      anotacion: null as ReactNode,
    },
    {
      etapa: 3,
      valor: cifras.convocados,
      titulo: <TextoEditorial id="nota-muestreo-formula-paso-4" original={"Personas convocadas"} />,
      definicion: (
        <TextoEditorial
          id="nota-muestreo-cifras-convocados-def"
          original={"Personas efectivamente invitadas. Coincide con la muestra calculada, salvo donde existió un tope logístico."}
        />
      ),
      anotacion:
        diferencia < 0 ? (
          <>
            <strong className="nm-mono">−{entero(-diferencia)}</strong>{" "}
            <TextoEditorial id="nota-muestreo-cifras-delta-tope" original={"Obedece al tope de capacidad de un auditorio, descrito más adelante."} />
          </>
        ) : (
          <TextoEditorial id="nota-muestreo-cifras-delta-igual" original={"La convocatoria coincidió con la muestra calculada."} />
        ),
    },
    {
      etapa: 4,
      valor: cifras.asistentes,
      titulo: <TextoEditorial id="2a607b6d60d0cc4b5bc5" original={"Asistentes registrados"} />,
      definicion: (
        <TextoEditorial id="nota-muestreo-cifras-asistentes-def" original={"Personas que figuran en el registro de asistencia."} />
      ),
      anotacion: (
        <>
          <strong className="nm-mono">{entero((cifras.asistentes / cifras.convocados) * 100)}</strong>{" "}
          <TextoEditorial id="nota-muestreo-cifras-por-cada-100" original={"asistentes por cada 100 personas convocadas."} />
        </>
      ),
    },
  ];

  return (
    <Apartado
      id="escena-cifras"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={
        <TextoEditorial id="nota-muestreo-cifras-gancho" original={"¿Qué diferencia hay entre población, muestra, convocatoria y asistencia?"} />
      }
      entrada={
        <TextoEditorial
          id="nota-muestreo-cifras-entrada"
          original={
            "El proceso involucra cuatro cifras que deben distinguirse: la población de referencia, el tamaño de muestra calculado, las personas convocadas y los asistentes registrados. Confundirlas es el error más frecuente al interpretar los resultados."
          }
        />
      }
    >
      <div className="nm-reticula">
        <div className="nm-margen">
          <p className="nm-rotulo mb-2">
            <TextoEditorial id="nota-muestreo-portada-matriz-estamento" original={"Estamento"} />
          </p>
          <Pestanas<Filtro>
            etiqueta="Estamento de las cuatro cifras"
            orientacion="vertical"
            valor={filtro}
            onCambio={setFiltro}
            opciones={[
              { id: "todos", texto: <TextoEditorial id="conversatorios-todos" original={"Todos"} /> },
              ...nota.totales.map((t) => ({
                id: t.estamento as Filtro,
                texto: partirEtiqueta(t.etiqueta).nombre,
                color: COLOR_ESTAMENTO[t.estamento],
              })),
            ]}
          />
        </div>

        <div ref={ref} className="nm-principal">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="nm-rotulo">
                <TextoEditorial id="nota-muestreo-cifras-parada" original={"Etapa"} /> 1
              </p>
              <h3 className="font-semibold">
                <TextoEditorial id="nota-muestreo-cap-poblacion" original={"Población de referencia"} />
              </h3>
              <p className="nm-nota">
                <TextoEditorial id="nota-muestreo-cifras-poblacion-def" original={"Total de personas del estamento."} />
              </p>
            </div>
            <Contador valor={cifras.poblacion} duracion={0.9} className="text-[length:var(--nm-t-5)] leading-none font-bold" />
          </div>

          <div className="relative mt-3 h-8 bg-[var(--nm-velo)]">
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: visible ? `${fraccionMuestra * 100}%` : 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: SUAVIZADO }}
            />
          </div>
          <p className="nm-nota mt-1.5">
            <TextoEditorial id="nota-muestreo-cifras-cuadricula-1" original={"La muestra calculada equivale al"} />{" "}
            <strong className="nm-mono text-[var(--nm-tinta)]">{porcentaje(fraccionMuestra)}</strong>{" "}
            <TextoEditorial
              id="nota-muestreo-cifras-cuadricula-2"
              original={"de la población: no es necesario consultar a la totalidad para obtener resultados con una precisión conocida."}
            />
          </p>

          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 block h-12 w-full" aria-hidden>
            <motion.polygon
              fill="var(--nm-velo)"
              initial={{ opacity: 0 }}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              points={`0,0 ${fraccionMuestra * 100},0 100,40 0,40`}
            />
            <line x1={fraccionMuestra * 100} y1="0" x2="100" y2="40" stroke="var(--nm-tinta)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1="0" x2="0" y2="40" stroke="var(--nm-tinta)" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="nm-rotulo bg-[var(--nm-velo)] px-3 py-1.5">
            <TextoEditorial id="nota-muestreo-cifras-ampliacion" original={"Ampliación del tramo de la muestra"} />
          </p>

          <div className="flex flex-col gap-7 bg-[var(--nm-velo)]/40 px-3 pt-5 pb-6">
            {ampliadas.map((fila, i) => (
              <div key={fila.etapa} className="grid grid-cols-[14rem_1fr] gap-6">
                <div>
                  <p className="nm-rotulo">
                    <TextoEditorial id="nota-muestreo-cifras-parada" original={"Etapa"} /> {fila.etapa}
                  </p>
                  <h3 className="font-semibold">{fila.titulo}</h3>
                  <p className="nm-nota">{fila.definicion}</p>
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 flex-1">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: color, opacity: 1 - i * 0.18 }}
                        initial={{ width: 0 }}
                        animate={{ width: visible ? `${(fila.valor / mayor) * 100}%` : 0 }}
                        transition={{ duration: 0.9, delay: 1.2 + i * 0.25, ease: SUAVIZADO }}
                      />
                    </div>
                    <Contador valor={fila.valor} duracion={0.9} className="w-24 text-right text-[length:var(--nm-t-4)] font-bold" />
                  </div>
                  {fila.anotacion ? (
                    <p className="mt-1.5 border-l border-[var(--nm-tinta)] pl-2 text-[length:var(--nm-t-0)] leading-snug">
                      {fila.anotacion}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Apartado>
  );
}
