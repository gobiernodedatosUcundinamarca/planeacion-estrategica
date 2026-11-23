"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SUAVIZADO, useAlEntrar } from "@/components/nota-metodologica/piezas";
import { useTextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero } from "@/lib/formatters";

export interface EquipoCondensado {
  equipo: number;
  individuales: number;
  acuerdos: number;
  validaDemas: boolean;
  desacuerdo: boolean;
}

const ANCHO = 600;
const PASO = 14;
const LADO = 9;
const COLUMNAS = Math.floor(ANCHO / PASO);
const FILA = 30;
const X_FILA = 92;
const PASO_FILA = 19;

/**
 * Las solicitudes individuales de ajuste (una marca cada una) se condensan en
 * los acuerdos de cada equipo: estado 0, todas las marcas; estado 1, solo las
 * que se volvieron acuerdo, en la fila de su equipo; estado 2, además, qué
 * equipo validó el resto y cuál dejó puntos sin consenso.
 */
export function Condensacion({ equipos, estado }: { equipos: EquipoCondensado[]; estado: 0 | 1 | 2 }) {
  const reducido = useReducedMotion();
  // Dentro de un <text> de SVG no cabe el <span> de TextoEditorial: se usa el texto plano editable.
  const tEquipo = useTextoEditorial("m5-equipo", "Equipo");
  const tSinConsenso = useTextoEditorial("m5-condensa-sin-consenso", "no alcanzó acuerdo sobre uno o más componentes");
  const tValido = useTextoEditorial("m5-condensa-valido", "valida los demás componentes");
  const tNoValido = useTextoEditorial("m5-condensa-no-valido", "no valida los demás componentes");
  const totalIndividual = equipos.reduce((s, e) => s + e.individuales, 0);
  const filasGrilla = Math.max(1, Math.ceil(totalIndividual / COLUMNAS));
  const alto = Math.max(filasGrilla * PASO, equipos.length * FILA) + 8;
  const yGrilla = (alto - filasGrilla * PASO) / 2;
  const yFila = (i: number) => (alto - equipos.length * FILA) / 2 + i * FILA + (FILA - 12) / 2;

  let g = 0;
  const marcas = equipos.flatMap((e, fila) =>
    Array.from({ length: Math.max(e.individuales, e.acuerdos) }, (_, j) => {
      const enGrilla = j < e.individuales;
      const indice = enGrilla ? g++ : g;
      const xa = (indice % COLUMNAS) * PASO;
      const ya = yGrilla + Math.floor(indice / COLUMNAS) * PASO;
      const queda = j < e.acuerdos;
      return { clave: `${e.equipo}-${j}`, fila, j, enGrilla, queda, xa, ya };
    })
  );

  const resumen = `${formatNumero(totalIndividual)} solicitudes individuales; ${formatNumero(
    equipos.reduce((s, e) => s + e.acuerdos, 0)
  )} acuerdos de ${formatNumero(equipos.length)} equipos.`;

  return (
    <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="h-auto w-full overflow-visible" role="img" aria-label={resumen}>
      {marcas.map((m, i) => {
        const condensada = estado > 0;
        const x = condensada && m.queda ? X_FILA + m.j * PASO_FILA : m.xa;
        const y = condensada && m.queda ? yFila(m.fila) : m.ya;
        const lado = condensada && m.queda ? 12 : LADO;
        const opacidad = condensada ? (m.queda ? 1 : 0) : m.enGrilla ? 1 : 0;
        return (
          <motion.rect
            key={m.clave}
            initial={false}
            animate={{ x, y, width: lado, height: lado, opacity: opacidad }}
            transition={{ duration: reducido ? 0 : 0.9, delay: reducido ? 0 : (i % 48) * 0.008, ease: SUAVIZADO }}
            rx={1.5}
            fill="var(--m5-correccion)"
          />
        );
      })}
      {equipos.map((e, fila) => (
        <motion.g
          key={e.equipo}
          initial={false}
          animate={{ opacity: estado > 0 ? 1 : 0 }}
          transition={{ duration: reducido ? 0 : 0.5, delay: reducido || estado === 0 ? 0 : 0.5 }}
        >
          <text x={0} y={yFila(fila) + 10} fontSize={12} fontWeight={600} fill="var(--m5-tinta)">
            {tEquipo} {e.equipo}
          </text>
          <motion.text
            x={X_FILA + Math.max(e.acuerdos, 1) * PASO_FILA + 6}
            y={yFila(fila) + 10}
            fontSize={11.5}
            fill={e.desacuerdo ? "var(--m5-correccion-texto)" : "var(--m5-valida)"}
            initial={false}
            animate={{ opacity: estado === 2 ? 1 : 0 }}
            transition={{ duration: reducido ? 0 : 0.4 }}
          >
            {e.desacuerdo ? tSinConsenso : e.validaDemas ? tValido : tNoValido}
          </motion.text>
        </motion.g>
      ))}
    </svg>
  );
}

/**
 * Una casilla por propuesta de transformación digital: llenas las que
 * mencionan IA, a medio tono las que solo hablan de automatizar.
 */
export function Cuadricula({ total, ia, automatizacion }: { total: number; ia: number; automatizacion: number }) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.3);
  const reducido = useReducedMotion();
  return (
    <div
      ref={ref}
      className="grid grid-cols-[repeat(10,1.6rem)] gap-1.5"
      role="img"
      aria-label={`${ia} de ${total} propuestas mencionan IA; ${automatizacion} mencionan IA o automatización.`}
    >
      {Array.from({ length: total }, (_, i) => {
        const tipo = i < ia ? "ia" : i < automatizacion ? "auto" : "resto";
        const fondo =
          tipo === "ia"
            ? "var(--m5-valida)"
            : tipo === "auto"
              ? "color-mix(in srgb, var(--primary) 40%, var(--background))"
              : "var(--m5-velo)";
        return (
          <motion.span
            key={i}
            className="block aspect-square"
            style={{ background: fondo }}
            initial={{ opacity: tipo === "resto" ? 1 : 0, scale: tipo === "resto" ? 1 : 0.4 }}
            animate={visible || reducido ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, delay: reducido ? 0 : 0.2 + i * 0.03, ease: SUAVIZADO }}
          />
        );
      })}
    </div>
  );
}
