"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import {
  muestraPoblacionFinita,
  muestraPoblacionInfinita,
  muestraRequerida,
} from "@/lib/reglas/nota-metodologica";
import type { CalculoMuestra, NotaMetodologica } from "@/types/nota-metodologica";
import {
  Apartado,
  Aparecer,
  COLOR_ESTAMENTO,
  SUAVIZADO,
  decimal,
  entero,
  nombreEstamento,
  porcentaje,
  useAlEntrar,
} from "./piezas";

/** Valor ilustrativo para explicar el margen de error; no es un resultado de las mesas. */
const OPINION_DE_EJEMPLO = 0.6;

type Props = { nota: NotaMetodologica; numero: number; titulo: ReactNode; enlace: ReactNode | null };

/** Definiciones: una fila por parámetro (valor al margen, explicación, diagrama). Después, la curva anotada. */
export function EscenaParametros({ nota, numero, titulo, enlace }: Props) {
  const p = nota.parametros;
  const aciertos = Math.round(p.confianza * 100);

  return (
    <Apartado
      id="escena-parametros"
      numero={numero}
      titulo={titulo}
      enlace={enlace}
      pregunta={<TextoEditorial id="nota-muestreo-parametros-gancho" original={"¿Con qué nivel de precisión se planificó la convocatoria?"} />}
      entrada={
        <TextoEditorial
          id="nota-muestreo-parametros-entrada"
          original={
            "Antes del cálculo se fijaron tres parámetros. Ninguno proviene de los resultados de las mesas: son decisiones de planificación adoptadas antes de la convocatoria."
          }
        />
      }
    >
      <Definicion
        valor={porcentaje(p.confianza, 0)}
        titulo={<TextoEditorial id="nota-muestreo-parametros-confianza" original={"Nivel de confianza"} />}
        texto={
          <>
            <TextoEditorial id="nota-muestreo-parametros-confianza-1" original={"Si el procedimiento se repitiera 100 veces, en"} />{" "}
            <strong className="nm-cifra">{aciertos}</strong>{" "}
            <TextoEditorial id="nota-muestreo-parametros-confianza-2" original={"de ellas el intervalo obtenido contendría el valor real de la población."} />
          </>
        }
        diagrama={(visible) => (
          <div className="grid grid-cols-20 gap-[3px]" aria-hidden>
            {Array.from({ length: 100 }, (_, i) => (
              <span key={i} className="relative aspect-square bg-[var(--nm-velo)]">
                <motion.span
                  className="absolute inset-0"
                  style={{ backgroundColor: i < aciertos ? "var(--nm-tinta)" : "var(--nm-senal)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: visible ? 1 : 0 }}
                  transition={{ duration: 0.25, delay: visible ? i * 0.01 : 0 }}
                />
              </span>
            ))}
          </div>
        )}
      />

      <Definicion
        valor={`±${decimal(p.margenError * 100, 0)}`}
        titulo={<TextoEditorial id="nota-muestreo-parametros-margen" original={"Margen de error (puntos porcentuales)"} />}
        texto={
          <>
            <TextoEditorial id="nota-muestreo-parametros-margen-1" original={"Por ejemplo, si el"} />{" "}
            <strong className="nm-cifra">{porcentaje(OPINION_DE_EJEMPLO, 0)}</strong>{" "}
            <TextoEditorial
              id="nota-muestreo-parametros-margen-2"
              original={"de los participantes manifiesta una opinión, en la población total esa proporción se ubicaría entre"}
            />{" "}
            <strong className="nm-cifra">{porcentaje(OPINION_DE_EJEMPLO - p.margenError, 0)}</strong>{" "}
            <TextoEditorial id="nota-muestreo-parametros-margen-3" original={"y"} />{" "}
            <strong className="nm-cifra">{porcentaje(OPINION_DE_EJEMPLO + p.margenError, 0)}</strong>.
          </>
        }
        diagrama={(visible) => (
          <div className="relative h-14" aria-hidden>
            <div className="absolute inset-x-0 top-5 h-px bg-[var(--nm-tinta)]" />
            <motion.div
              className="absolute top-3 h-4 bg-[var(--nm-acento)]/25"
              initial={{ left: `${OPINION_DE_EJEMPLO * 100}%`, width: "0%" }}
              animate={
                visible
                  ? { left: `${(OPINION_DE_EJEMPLO - p.margenError) * 100}%`, width: `${p.margenError * 200}%` }
                  : {}
              }
              transition={{ duration: 0.8, delay: 0.4, ease: SUAVIZADO }}
            />
            <span className="absolute top-2 h-6 w-0.5 -translate-x-1/2 bg-[var(--nm-tinta)]" style={{ left: `${OPINION_DE_EJEMPLO * 100}%` }} />
            {[0, OPINION_DE_EJEMPLO - p.margenError, OPINION_DE_EJEMPLO + p.margenError, 1].map((v) => (
              <span
                key={v}
                // Los extremos se alinean hacia dentro para no salirse de la columna.
                className={`nm-mono absolute top-9 text-[10px] text-[var(--nm-gris)] ${
                  v === 0 ? "" : v === 1 ? "-translate-x-full" : "-translate-x-1/2"
                }`}
                style={{ left: `${v * 100}%` }}
              >
                {decimal(v * 100, 0)}
              </span>
            ))}
          </div>
        )}
      />

      <Definicion
        valor={decimal(p.proporcion, 1)}
        titulo={<TextoEditorial id="nota-muestreo-parametros-proporcion" original={"Proporción esperada (p)"} />}
        texto={
          <TextoEditorial
            id="nota-muestreo-parametros-proporcion-texto"
            original={
              "Ante la ausencia de información previa, se asume la situación de máxima variabilidad, con opiniones divididas por mitades. Este supuesto produce el mayor tamaño de muestra y, por tanto, el más conservador."
            }
          />
        }
        diagrama={(visible) => <CurvaVariabilidad proporcion={p.proporcion} visible={visible} />}
      />

      <CurvaMuestra nota={nota} />
    </Apartado>
  );
}

function Definicion({
  valor,
  titulo,
  texto,
  diagrama,
}: {
  valor: string;
  titulo: ReactNode;
  texto: ReactNode;
  diagrama: (visible: boolean) => ReactNode;
}) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className="nm-reticula items-start border-t border-[var(--nm-linea)] py-7">
      <p className="nm-margen nm-cifra text-[length:var(--nm-t-6)] leading-none font-bold">{valor}</p>
      <div className="col-span-5">
        <h3 className="font-semibold">{titulo}</h3>
        <p className="nm-nota mt-1.5">{texto}</p>
      </div>
      <div className="col-span-4 pt-1">{diagrama(visible)}</div>
    </div>
  );
}

/** p·(1 − p): una parábola con su punto más alto en p = 0,5. */
function CurvaVariabilidad({ proporcion, visible }: { proporcion: number; visible: boolean }) {
  const puntos = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    return `${i === 0 ? "M" : "L"}${x * 200},${56 - x * (1 - x) * 4 * 48}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <line x1="0" y1="56" x2="200" y2="56" stroke="var(--nm-tinta)" strokeWidth="1" />
      <motion.path
        d={puntos}
        fill="none"
        stroke="var(--nm-tinta)"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: visible ? 1 : 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: SUAVIZADO }}
      />
      <line x1={proporcion * 200} y1="8" x2={proporcion * 200} y2="56" stroke="var(--nm-acento)" strokeDasharray="2 3" />
      <motion.circle
        cx={proporcion * 200}
        cy={56 - proporcion * (1 - proporcion) * 4 * 48}
        r="4"
        fill="var(--nm-acento)"
        initial={{ scale: 0 }}
        animate={{ scale: visible ? 1 : 0 }}
        transition={{ type: "spring", delay: 1.3 }}
      />
    </svg>
  );
}

const ANCHO = 1000;
const ALTO = 360;
const MARGEN = { izquierda: 48, derecha: 16, arriba: 24, abajo: 34 };

/**
 * Hallazgo: tamaño de muestra según el tamaño de la población, en escala
 * logarítmica. Las anotaciones van sobre el gráfico, junto al dato que
 * explican; los puntos son los estratos reales y el control deja probar
 * cualquier tamaño.
 */
function CurvaMuestra({ nota }: { nota: NotaMetodologica }) {
  const p = nota.parametros;
  const n0 = muestraPoblacionInfinita(p);
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.3);
  const [foco, setFoco] = useState<CalculoMuestra | null>(null);

  const minimo = 10;
  const maximo = Math.max(50_000, ...nota.calculos.map((k) => k.poblacion * 1.2));
  const logMin = Math.log10(minimo);
  const logMax = Math.log10(maximo);
  const protagonista = nota.calculos[0];
  const [prueba, setPrueba] = useState(protagonista?.poblacion ?? 1000);

  const tope = Math.ceil((Math.max(n0, p.umbralCenso) * 1.15) / 100) * 100;
  const x = (N: number) =>
    MARGEN.izquierda + ((Math.log10(N) - logMin) / (logMax - logMin)) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
  const y = (n: number) => ALTO - MARGEN.abajo - (n / tope) * (ALTO - MARGEN.arriba - MARGEN.abajo);
  const enPorcentaje = (vx: number, vy: number) => ({ left: `${(vx / ANCHO) * 100}%`, top: `${(vy / ALTO) * 100}%` });

  const tramo = (desde: number, hasta: number, valor: (N: number) => number) =>
    Array.from({ length: 80 }, (_, i) => {
      const N = desde * (hasta / desde) ** (i / 79);
      return `${i === 0 ? "M" : "L"}${x(N).toFixed(1)},${y(valor(N)).toFixed(1)}`;
    }).join(" ");

  const ticksX = [10, 100, 1_000, 10_000, 100_000].filter((t) => t <= maximo);
  const ticksY = Array.from({ length: tope / 100 + 1 }, (_, i) => i * 100);
  const requeridaPrueba = muestraRequerida(prueba, p);

  return (
    <div ref={ref} className="mt-10 border-t border-[var(--nm-tinta)] pt-6">
      <div className="nm-reticula">
        <p className="nm-margen nm-rotulo">
          <TextoEditorial id="nota-muestreo-curva-rotulo" original={"Hallazgo"} />
        </p>
        <div className="nm-principal">
          <h3 className="text-[length:var(--nm-t-3)] font-bold">
            <TextoEditorial id="nota-muestreo-curva-titulo" original={"Relación entre el tamaño de la población y el de la muestra"} />
          </h3>
          <p className="nm-nota mt-1 max-w-[62ch]">
            <TextoEditorial
              id="nota-muestreo-curva-texto-1"
              original={"La muestra aumenta con el tamaño de la población, pero se estabiliza: con estos parámetros nunca supera"}
            />{" "}
            <strong className="nm-mono text-[var(--nm-tinta)]">{decimal(n0, 2)}</strong>
            {". "}
            <TextoEditorial
              id="nota-muestreo-curva-texto-2"
              original={"Cada punto corresponde a un estrato real de las mesas. El control deslizante permite calcular la muestra para cualquier tamaño de población."}
            />
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block w-full" role="img" aria-label="Tamaño de muestra según el tamaño de la población">
          <rect
            x={x(minimo)}
            y={MARGEN.arriba}
            width={x(p.umbralCenso) - x(minimo)}
            height={ALTO - MARGEN.arriba - MARGEN.abajo}
            fill="var(--nm-velo)"
          />
          {ticksY.map((t) => (
            <g key={t}>
              <line
                x1={MARGEN.izquierda}
                x2={ANCHO - MARGEN.derecha}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--nm-tinta)" : "var(--nm-linea)"}
              />
              <text x={MARGEN.izquierda - 8} y={y(t) + 4} fontSize="12" textAnchor="end" fill="var(--nm-gris)" fontFamily="var(--font-geist-mono)">
                {entero(t)}
              </text>
            </g>
          ))}
          {ticksX.map((t) => (
            <text key={t} x={x(t)} y={ALTO - MARGEN.abajo + 20} fontSize="12" textAnchor="middle" fill="var(--nm-gris)" fontFamily="var(--font-geist-mono)">
              {entero(t)}
            </text>
          ))}
          <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(n0)} y2={y(n0)} stroke="var(--nm-tinta)" strokeDasharray="4 4" />

          <motion.path
            d={tramo(minimo, p.umbralCenso, (N) => N)}
            fill="none"
            stroke="var(--nm-gris)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: visible ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.path
            d={tramo(p.umbralCenso + 1, maximo, (N) => muestraPoblacionFinita(N, p))}
            fill="none"
            stroke="var(--nm-tinta)"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: visible ? 1 : 0 }}
            transition={{ duration: 1.6, delay: 0.6, ease: SUAVIZADO }}
          />

          {nota.calculos.map((k, i) => (
            <motion.circle
              key={`${k.estamento}-${k.unidad}-${k.vinculacion ?? ""}`}
              cx={x(Math.max(minimo, k.poblacion))}
              cy={y(k.muestraCalculada)}
              r={foco === k ? 7 : 4.5}
              fill={COLOR_ESTAMENTO[k.estamento]}
              stroke="var(--nm-papel)"
              strokeWidth="1.5"
              className="cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ delay: 2 + i * 0.02 }}
              onMouseEnter={() => setFoco(k)}
              onMouseLeave={() => setFoco(null)}
              onClick={() => setFoco(k)}
            />
          ))}

          <line x1={x(prueba)} x2={x(prueba)} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} stroke="var(--nm-acento)" />
          <circle cx={x(prueba)} cy={y(requeridaPrueba)} r="5" fill="var(--nm-acento)" />
        </svg>

        <motion.div
          className="nm-anotacion text-right"
          // Anclada por la derecha y por abajo para quedar justo encima de la línea, sin transformaciones.
          style={{ right: `${(MARGEN.derecha / ANCHO) * 100}%`, bottom: `${(1 - (y(n0) - 6) / ALTO) * 100}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 2.2 }}
        >
          <strong>n₀ = {decimal(n0, 2)}</strong>
          <br />
          <TextoEditorial id="nota-muestreo-curva-anotacion-techo" original={"Techo de la muestra: no se supera, por grande que sea la población."} />
        </motion.div>

        <motion.div
          className="nm-anotacion"
          style={enPorcentaje(x(minimo) + 8, MARGEN.arriba + 8)}
          initial={{ opacity: 0 }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 1 }}
        >
          <strong>N ≤ {entero(p.umbralCenso)}</strong>
          <br />
          <TextoEditorial id="nota-muestreo-curva-leyenda-censo" original={"Convocatoria total del estrato"} />
        </motion.div>

        {protagonista ? (
          <motion.div
            className="nm-anotacion border-l border-[var(--nm-tinta)] pl-2"
            style={enPorcentaje(x(protagonista.poblacion) + 10, y(protagonista.muestraCalculada) + 14)}
            initial={{ opacity: 0 }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={{ delay: 2.4 }}
          >
            {nombreEstamento(nota, protagonista.estamento)} · {protagonista.unidad}
            <br />
            <strong>
              {entero(protagonista.poblacion)} → {entero(protagonista.muestraCalculada)}
            </strong>
          </motion.div>
        ) : null}
      </div>

      <div className="nm-reticula mt-4 items-center">
        <p className="nm-margen nm-rotulo">
          <TextoEditorial id="nota-muestreo-curva-eje-x" original={"Tamaño de la población (N), escala logarítmica"} />
        </p>
        <div className="col-span-5">
          <input
            type="range"
            min={logMin * 100}
            max={logMax * 100}
            step={1}
            value={Math.log10(prueba) * 100}
            onChange={(e) => setPrueba(Math.round(10 ** (Number(e.target.value) / 100)))}
            className="nm-rango"
            aria-label="Tamaño de la población para el cálculo"
          />
        </div>
        <p className="col-span-4 text-[length:var(--nm-t-1)]">
          <TextoEditorial id="nota-muestreo-curva-prueba-1" original={"Para una población de"} />{" "}
          <strong className="nm-mono">{entero(prueba)}</strong>{" "}
          <TextoEditorial id="nota-muestreo-curva-prueba-2" original={"personas, la muestra requerida es de"} />{" "}
          <strong className="nm-mono text-[var(--nm-acento)]">{entero(requeridaPrueba)}</strong>
        </p>
      </div>

      <Aparecer className="nm-reticula mt-2">
        <p className="nm-principal nm-nota min-h-5">
          {foco ? (
            <>
              <strong style={{ color: COLOR_ESTAMENTO[foco.estamento] }}>
                {nombreEstamento(nota, foco.estamento)} · {foco.unidad}
                {foco.vinculacion ? ` · ${foco.vinculacion}` : ""}
              </strong>
              {": "}
              <span className="nm-mono">
                {entero(foco.poblacion)} → {entero(foco.muestraCalculada)}
              </span>
            </>
          ) : (
            <TextoEditorial id="nota-muestreo-curva-pista" original={"Al situar el cursor sobre un punto se muestra el estrato correspondiente."} />
          )}
        </p>
      </Aparecer>
    </div>
  );
}
