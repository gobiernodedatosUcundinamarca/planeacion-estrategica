"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SUAVIZADO, useAlEntrar } from "@/components/nota-metodologica/piezas";
import { TextoEditorial, useTextoEditorial } from "@/components/editorial/texto-editorial";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import type { FiltroEquipo } from "@/lib/reglas/momento5";
import { NOMBRE_KAHOOT } from "@/lib/reglas/momento5-actividad2";
import type { KahootMomento5, PreguntaKahoot } from "@/types/momento5-kahoot";
import { LineaFuente, Tarjeta } from "../piezas";
import { Capitulo, Cifra, Clasificacion, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";

const pct = (f: number) => formatPorcentaje(f * 100);

/** Radio y perímetro del anillo de precisión general. */
const R = 70;
const PERIMETRO = 2 * Math.PI * R;

/**
 * El gráfico fijo del Kahoot, en tres estados que siguen los pasos del texto:
 * 0, el anillo con la precisión del juego; 1, una barra por pregunta; 2, cuántos
 * jugadores acertaron 0, 1, 2… preguntas. Cada capa se desvanece y las barras
 * crecen al aparecer; con «reducir movimiento» no hay transición.
 */
function GraficoKahoot({ kahoot, estado }: { kahoot: KahootMomento5; estado: 0 | 1 | 2 }) {
  const reducido = useReducedMotion();
  // Dentro de un <text> de SVG no cabe el <span> de TextoEditorial: se usa el texto plano editable.
  const ejeAciertos = useTextoEditorial("m5-kahoot-eje-aciertos", "Preguntas acertadas");
  const t = (retraso = 0) => ({ duration: reducido ? 0 : 0.7, delay: reducido ? 0 : retraso, ease: SUAVIZADO });
  const maxJugadores = Math.max(1, ...kahoot.porAciertos);
  const respondidas = kahoot.preguntas.reduce((s, p) => s + p.correctas + p.incorrectas + p.sinResponder, 0);
  const correctas = kahoot.preguntas.reduce((s, p) => s + p.correctas, 0);
  const resumen = `Precisión del juego ${pct(kahoot.precision)}; ${kahoot.preguntas.map((p) => `pregunta ${p.numero}: ${pct(p.precision)}`).join(", ")}.`;

  return (
    <svg viewBox="0 0 600 320" className="h-auto w-full" role="img" aria-label={resumen}>
      {/* Estado 0: anillo */}
      <motion.g initial={false} animate={{ opacity: estado === 0 ? 1 : 0 }} transition={t()}>
        <circle cx={300} cy={150} r={R} fill="none" stroke="var(--m5-velo)" strokeWidth={22} />
        <motion.circle
          cx={300}
          cy={150}
          r={R}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={22}
          strokeLinecap="butt"
          transform="rotate(-90 300 150)"
          strokeDasharray={PERIMETRO}
          initial={false}
          animate={{ strokeDashoffset: estado === 0 ? PERIMETRO * (1 - kahoot.precision) : PERIMETRO }}
          transition={{ duration: reducido ? 0 : 1.3, ease: SUAVIZADO }}
        />
        <text x={300} y={146} textAnchor="middle" fontSize={38} fontWeight={700} fill="var(--m5-tinta)">
          {pct(kahoot.precision)}
        </text>
        <text x={300} y={170} textAnchor="middle" fontSize={13} fill="var(--m5-suave)">
          {formatNumero(correctas)} de {formatNumero(respondidas)}
        </text>
      </motion.g>

      {/* Estado 1: una barra por pregunta */}
      <motion.g initial={false} animate={{ opacity: estado === 1 ? 1 : 0 }} transition={t()}>
        {kahoot.preguntas.map((p, i) => {
          const y = 20 + i * 56;
          const menor = p.precision === Math.min(...kahoot.preguntas.map((q) => q.precision));
          return (
            <g key={p.numero}>
              <text x={0} y={y + 18} fontSize={13} fontWeight={600} fill="var(--m5-tinta)">
                P{p.numero}
              </text>
              <rect x={40} y={y} width={470} height={26} rx={3} fill="var(--m5-velo)" />
              <motion.rect
                x={40}
                y={y}
                height={26}
                rx={3}
                fill={menor ? "var(--m5-correccion)" : "var(--primary)"}
                initial={false}
                animate={{ width: estado === 1 ? 470 * p.precision : 0 }}
                transition={t(i * 0.12)}
              />
              <text x={518} y={y + 18} fontSize={13} fontWeight={600} fill={menor ? "var(--m5-correccion-texto)" : "var(--m5-tinta)"}>
                {pct(p.precision)}
              </text>
            </g>
          );
        })}
      </motion.g>

      {/* Estado 2: jugadores por número de aciertos */}
      <motion.g initial={false} animate={{ opacity: estado === 2 ? 1 : 0 }} transition={t()}>
        {kahoot.porAciertos.map((n, a) => {
          const ancho = 600 / kahoot.porAciertos.length;
          const alto = (n / maxJugadores) * 230;
          return (
            <g key={a}>
              <motion.rect
                x={a * ancho + ancho * 0.18}
                width={ancho * 0.64}
                rx={3}
                fill={a === kahoot.porAciertos.length - 1 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, var(--card))"}
                initial={false}
                animate={{ y: estado === 2 ? 260 - alto : 260, height: estado === 2 ? alto : 0 }}
                transition={t(a * 0.1)}
              />
              <text x={a * ancho + ancho / 2} y={estado === 2 ? 254 - alto : 254} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--m5-tinta)">
                {n}
              </text>
              <text x={a * ancho + ancho / 2} y={284} textAnchor="middle" fontSize={13} fill="var(--m5-suave)">
                {a}
              </text>
            </g>
          );
        })}
        <text x={300} y={308} textAnchor="middle" fontSize={11.5} fill="var(--m5-suave)">
          {ejeAciertos}
        </text>
      </motion.g>
    </svg>
  );
}

/** Una pregunta con sus opciones de respuesta como barras: la correcta en verde, las demás en naranja. */
function PreguntaTarjeta({ p, total }: { p: PreguntaKahoot; total: number }) {
  const [ref, visible] = useAlEntrar<HTMLDivElement>(0.2);
  const maximo = Math.max(1, ...p.opciones.map((o) => o.total));
  return (
    <Tarjeta
      titulo={`${p.numero}. ${p.pregunta}`}
      descripcion={
        <>
          {pct(p.precision)} <TextoEditorial id="m5-kahoot-acierto" original="de acierto" /> · {formatNumero(p.correctas)} / {formatNumero(total)} ·{" "}
          {p.tiempoPromedio} s <TextoEditorial id="m5-kahoot-promedio" original="en promedio por jugador" />
          {p.sinResponder ? (
            <>
              {" "}
              · {formatNumero(p.sinResponder)} <TextoEditorial id="m5-kahoot-sin-responder" original="sin responder" />
            </>
          ) : null}
        </>
      }
    >
      <div ref={ref} className="flex flex-col gap-3">
        {p.opciones.map((o) => (
          <div key={o.texto} className="flex flex-col gap-1">
            <p className={`text-[13px] leading-snug ${o.correcta ? "font-semibold" : ""}`}>{o.texto}</p>
            <div className="flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-sm bg-[var(--m5-velo)]" aria-hidden>
                <span
                  className="block h-full rounded-sm transition-[width] duration-[900ms] ease-out motion-reduce:transition-none"
                  style={{
                    width: visible ? `${(o.total / maximo) * 100}%` : "0%",
                    background: o.correcta ? "var(--primary)" : "var(--m5-correccion)",
                  }}
                />
              </span>
              <span className="m5-cifra w-24 shrink-0 text-right text-xs font-semibold">
                {formatNumero(o.total)} {o.correcta ? <TextoEditorial id="m5-kahoot-correcta" original="· correcta" /> : null}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

/**
 * Kahoot de Apropiación del MEDIT (Actividad 3): un juego en vivo de cinco
 * preguntas. Se cuenta con tres pasos y un gráfico fijo (precisión del juego,
 * una barra por pregunta, jugadores por aciertos) y, debajo, cada pregunta con
 * sus opciones tal como las mostró el juego. Kahoot registra apodos, no
 * equipos: el filtro de equipo no lo recorta y ningún jugador se nombra.
 */
export function CapituloKahoot({ kahoot, equipo, compacto }: { kahoot: KahootMomento5; equipo: FiltroEquipo; compacto: boolean }) {
  const menor = kahoot.preguntas.reduce((m, p) => (p.precision < m.precision ? p : m), kahoot.preguntas[0]);
  const mayor = kahoot.preguntas.reduce((m, p) => (p.precision > m.precision ? p : m), kahoot.preguntas[0]);
  const perfectos = kahoot.porAciertos[kahoot.porAciertos.length - 1] ?? 0;
  const total = kahoot.jugadores;

  const pasos = [
    <div key="0" className="flex flex-col gap-4">
      <Pregunta>{NOMBRE_KAHOOT}</Pregunta>
      <p className="m5-entradilla">
        <Cifra valor={total} /> <TextoEditorial id="m5-kahoot-paso1-a" original="jugadores respondieron" />{" "}
        <Cifra valor={kahoot.preguntas.length} /> <TextoEditorial id="m5-kahoot-paso1-b" original="preguntas y acertaron el" />{" "}
        <span className="m5-valida m5-cifra font-semibold">{pct(kahoot.precision)}</span>.
      </p>
      {equipo !== null ? (
        <p className="m5-nota">
          <TextoEditorial
            id="m5-kahoot-sin-filtro"
            original="Kahoot registra apodos, no equipos: con el filtro de equipo se siguen mostrando todos los jugadores."
          />
        </p>
      ) : null}
    </div>,
    <div key="1" className="flex flex-col gap-4">
      <Pregunta>
        <TextoEditorial id="m5-kahoot-paso2-titulo" original="Acierto por pregunta" />
      </Pregunta>
      <p className="m5-entradilla">
        <TextoEditorial id="m5-kahoot-paso2-a" original="La que más se acertó fue la" /> <Cifra valor={mayor.numero} /> (
        <span className="m5-valida m5-cifra font-semibold">{pct(mayor.precision)}</span>
        ); <TextoEditorial id="m5-kahoot-paso2-b" original="la que menos, la" /> <Cifra valor={menor.numero} /> (
        <span className="m5-correccion m5-cifra font-semibold">{pct(menor.precision)}</span>).
      </p>
      <p className="m5-texto">«{menor.pregunta}»</p>
    </div>,
    <div key="2" className="flex flex-col gap-4">
      <Pregunta>
        <TextoEditorial id="m5-kahoot-paso3-titulo" original="Jugadores según sus aciertos" />
      </Pregunta>
      <p className="m5-entradilla">
        <Cifra valor={perfectos} className="m5-valida" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={total} />{" "}
        <TextoEditorial id="m5-kahoot-paso3-a" original="acertaron las cinco preguntas." />
      </p>
      <p className="m5-nota">
        <TextoEditorial id="m5-kahoot-paso3-nota" original="Cada columna cuenta jugadores con ese número de preguntas acertadas, de 0 a 5." />
      </p>
    </div>,
  ];

  return (
    <Capitulo
      id="kahoot"
      titulo={NOMBRE_KAHOOT}
      equipo={equipo}
      ficha={
        <>
          <TextoEditorial id="m5-kahoot-ficha-actividad" original="Actividad 3. Juego en vivo:" /> <span className="m5-cifra">{formatNumero(total)}</span>{" "}
          <TextoEditorial id="m5-kahoot-ficha-a" original="jugadores," /> <span className="m5-cifra">{formatNumero(kahoot.preguntas.length)}</span>{" "}
          <TextoEditorial id="m5-kahoot-ficha-b" original="preguntas." />
        </>
      }
    >
      <Escenario
        compacto={compacto}
        pasos={pasos}
        grafico={(i) => (
          <figure className="flex w-full flex-col gap-4">
            <GraficoKahoot kahoot={kahoot} estado={Math.min(i, 2) as 0 | 1 | 2} />
            <figcaption>
              <LineaFuente
                id="m5-kahoot-fuente-grafico"
                original="reporte del juego exportado de Kahoot. Precisión: respuestas correctas ÷ (jugadores × preguntas); lo que no se respondió cuenta como no acertado. Acierto por pregunta y aciertos por jugador, tal como los calcula Kahoot; no se publica ningún apodo."
              />
            </figcaption>
          </figure>
        )}
      />
      <Clasificacion>
        {kahoot.preguntas.map((p) => (
          <PreguntaTarjeta key={p.numero} p={p} total={total} />
        ))}
        <LineaFuente
          id="m5-kahoot-fuente-opciones"
          original="opciones de respuesta tal como las escribió el juego. Kahoot no exporta la clave: se toma como correcta la opción que eligieron los jugadores que acertaron las cinco preguntas, y coincide con los aciertos que informa Kahoot en cada pregunta."
        />
      </Clasificacion>
    </Capitulo>
  );
}
