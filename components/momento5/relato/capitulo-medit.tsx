"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SUAVIZADO, useAlEntrar } from "@/components/nota-metodologica/piezas";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { citasDeTema, type DerivadosMomento5, type DestacadosMomento5, type FiltroEquipo } from "@/lib/reglas/momento5";
import { VocesMedit } from "../medit";
import { Ranking, pct } from "../piezas";
import { Capitulo, Cifra, Clasificacion, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";

/** Una cita que se descubre de izquierda a derecha, como si se subrayara al leerla. */
function Cita({ texto, autor }: { texto: string; autor: string }) {
  const [ref, visible] = useAlEntrar<HTMLQuoteElement>(0.4);
  const reducido = useReducedMotion();
  return (
    <figure>
      <motion.blockquote
        ref={ref}
        className="m5-cita"
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: visible || reducido ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
        transition={{ duration: reducido ? 0 : 1.1, ease: SUAVIZADO }}
      >
        «{texto}»
      </motion.blockquote>
      <figcaption className="m5-cita-autor">{autor}</figcaption>
    </figure>
  );
}

/**
 * Formulario individual de consolidación del MEDIT. El ranking de temas es el
 * gráfico fijo: el primer paso lo presenta y los siguientes resaltan cada tema
 * principal con una respuesta textual. Debajo, todas las respuestas, filtradas
 * por el tema que se elija en el ranking.
 */
export function CapituloMedit({
  d,
  destacados,
  equipo,
  compacto,
}: {
  d: DerivadosMomento5;
  destacados: DestacadosMomento5;
  equipo: FiltroEquipo;
  compacto: boolean;
}) {
  const [tema, setTema] = useState<string | null>(null);
  const n = d.consolidacion.length;
  const temas = destacados.temasPrincipales;
  const principal = temas[0] ?? null;

  const pasos = principal
    ? [
        <div key="0" className="flex flex-col gap-4">
          <Pregunta>
            <TextoEditorial id="m5-medit-pregunta-aspecto" original="Aspecto prioritario de consolidación del MEDIT:" />
          </Pregunta>
        <p className="m5-entradilla">
          <TextoEditorial id="m5-medit-entrada-a" original="En" /> <Cifra valor={n} />{" "}
          <TextoEditorial id="m5-medit-entrada-b" original="respuestas individuales, el tema que más se repite es" />{" "}
          <strong className="font-semibold">{principal.label.toLowerCase()}</strong>: <TextoEditorial id="m5-medit-entrada-c" original="aparece en" />{" "}
          <Cifra valor={principal.value} /> ({pct(n ? principal.value / n : 0)}).
        </p>
        </div>,
        ...temas.map((t) => {
          const cita = citasDeTema(d.consolidacion, t.id, 1)[0];
          return (
            <div key={t.id} className="flex flex-col gap-4">
              <Pregunta>{t.label}</Pregunta>
              <p className="m5-nota">
                <Cifra valor={t.value} /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={n} />{" "}
                <TextoEditorial id="m5-medit-respuestas" original="respuestas." />
              </p>
              {cita ? <Cita texto={cita.aspecto ?? ""} autor={[cita.nombre, cita.rol, cita.sede].filter(Boolean).join(", ")} /> : null}
            </div>
          );
        }),
      ]
    : [
        <p key="0" className="m5-entradilla text-[var(--m5-suave)]">
          <TextoEditorial id="m5-medit-sin-datos" original="Con este filtro no hay respuestas sobre el MEDIT." />
        </p>,
      ];

  return (
    <Capitulo id="consolidacion-medit" formulario={d.formularios.find((f) => f.id === "consolidacion")} equipo={equipo}>
      <Escenario
        compacto={compacto}
        pasos={pasos}
        grafico={(i) =>
          principal ? (
            <Ranking
              titulo="Aspectos prioritarios para consolidar el MEDIT"
              descripcion="Temas presentes en cada respuesta individual (una respuesta puede tocar varios). Clic en un tema para leer las respuestas."
              items={d.temas}
              total={n}
              truncarEn={30}
              // El tema del paso queda resaltado; si se elige otro en el ranking, manda la elección.
              seleccionada={tema ?? (i > 0 ? (temas[i - 1]?.id ?? null) : null)}
              onSeleccionar={setTema}
              pie={
                <TextoEditorial
                  id="m5-pie-temas"
                  original="Temas asignados por palabras clave sobre el aspecto prioritario y la propuesta de cambio."
                />
              }
            />
          ) : null
        }
      />
      <Clasificacion>
        <VocesMedit d={d} tema={tema} setTema={setTema} />
      </Clasificacion>
    </Capitulo>
  );
}
