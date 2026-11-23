"use client";

import { useState } from "react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { DerivadosMomento5, DestacadosMomento5, FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5 } from "@/types/momento5";
import { Medidor, Ranking, Tarjeta } from "../piezas";
import { RespuestasAbiertas } from "../respuestas-abiertas";
import { TablaProcesos } from "../transformacion-digital";
import { Capitulo, Cifra, Clasificacion, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";
import { Cuadricula } from "./graficos";

const SinDatos = () => (
  <p className="m5-entradilla text-[var(--m5-suave)]">
    <TextoEditorial id="m5-dig-sin-datos" original="Con este filtro no hay propuestas de transformación digital." />
  </p>
);

/**
 * Formulario de Percepción sobre Transformación Digital. Cada paso parte de
 * una pregunta del formulario y muestra su clasificación: categoría del
 * «Proceso propuesto», tipo de «Dificultad percibida» y menciones de IA o
 * automatización en las respuestas. Elegir una barra filtra la tabla de
 * procesos que sigue al relato.
 */
export function CapituloDigital({
  d,
  destacados,
  equipo,
  compacto,
  abiertas,
}: {
  d: DerivadosMomento5;
  destacados: DestacadosMomento5;
  equipo: FiltroEquipo;
  compacto: boolean;
  abiertas: PreguntaAbiertaMomento5[];
}) {
  const [cat, setCat] = useState<string | null>(null);
  const [dif, setDif] = useState<string | null>(null);
  const n = d.percepcion.length;
  const categoria = destacados.categoriaPrincipal;
  const dificultad = destacados.dificultadPrincipal;

  const pasos = [
    categoria ? (
      <>
        <Pregunta>
          <TextoEditorial id="m5-dig-pregunta-proceso" original="Proceso propuesto:" />
        </Pregunta>
        <p className="m5-entradilla">
          <Cifra valor={n} />{" "}
          <TextoEditorial id="m5-dig-paso1-a" original="personas propusieron un proceso de su dependencia. La categoría más frecuente es" />{" "}
          <strong className="font-semibold">{categoria.label}</strong>, <TextoEditorial id="m5-dig-paso1-b" original="con" />{" "}
          <Cifra valor={categoria.value} /> <TextoEditorial id="m5-dig-paso1-c" original="propuestas." />
        </p>
        <p className="m5-nota">
          <TextoEditorial id="m5-dig-paso1-nota" original="Elige una barra para ver solo esos procesos en la tabla, más abajo." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
    dificultad ? (
      <>
        <Pregunta>
          <TextoEditorial id="m5-dig-pregunta-dificultad" original="Dificultad percibida" />
        </Pregunta>
        <p className="m5-entradilla">
          <TextoEditorial id="m5-dig-paso2-a" original="El tipo de dificultad más citado es" />{" "}
          <strong className="font-semibold">{dificultad.label.toLowerCase()}</strong>: <TextoEditorial id="m5-dig-paso2-b" original="aparece en" />{" "}
          <Cifra valor={dificultad.value} /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={n} />{" "}
          <TextoEditorial id="m5-dig-paso2-c" original="respuestas." />
        </p>
        <p className="m5-nota">
          <TextoEditorial id="m5-dig-paso2-nota" original="Una misma respuesta puede citar varias dificultades." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
    n ? (
      <>
        <Pregunta>
          <TextoEditorial
            id="m5-dig-pregunta-ia"
            original="Proceso propuesto, ¿En qué consiste actualmente?, Dificultad percibida y ¿Cómo afecta el trabajo a los usuarios?"
          />
        </Pregunta>
        <p className="m5-entradilla">
          <Cifra valor={d.kpi.procesosAuto} className="m5-valida" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={n} />{" "}
          <TextoEditorial id="m5-dig-paso3-a" original="respuestas mencionan inteligencia artificial o automatización en alguna de estas preguntas;" />{" "}
          <Cifra valor={d.kpi.procesosIA} /> <TextoEditorial id="m5-dig-paso3-b" original="hablan de IA, chatbots o agentes." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
  ];

  const graficos = [
    <Ranking
      key="cat"
      titulo="Procesos propuestos por categoría"
      descripcion="Proceso que cada participante propone transformar digitalmente (una categoría por respuesta)."
      items={d.catProceso}
      total={n}
      truncarEn={30}
      seleccionada={cat}
      onSeleccionar={setCat}
    />,
    <Ranking
      key="dif"
      titulo="Dificultades percibidas"
      descripcion="Tipo de dificultad descrita. Una respuesta puede mencionar varias, por eso los % no suman 100."
      items={d.dificultades}
      total={n}
      truncarEn={30}
      seleccionada={dif}
      onSeleccionar={setDif}
    />,
    <Tarjeta
      key="ia"
      titulo="Hacia dónde apuntan las soluciones"
      descripcion="Menciones explícitas en el proceso, su descripción, la dificultad o la afectación."
    >
      <div className="flex flex-col gap-6">
        <Cuadricula total={n} ia={d.kpi.procesosIA} automatizacion={d.kpi.procesosAuto} />
        <div className="flex flex-col gap-4">
          <Medidor
            etiqueta={<TextoEditorial id="m5-mencionan-ia" original="Mencionan IA, chatbot o agentes inteligentes" />}
            valor={d.kpi.procesosIA}
            total={n}
          />
          <Medidor
            etiqueta={<TextoEditorial id="m5-mencionan-automatizacion" original="Mencionan IA o automatización de tareas" />}
            valor={d.kpi.procesosAuto}
            total={n}
          />
        </div>
      </div>
    </Tarjeta>,
  ];

  return (
    <Capitulo id="transformacion-digital" formulario={d.formularios.find((f) => f.id === "percepcion")} equipo={equipo}>
      <Escenario compacto={compacto} pasos={pasos} grafico={(i) => graficos[Math.min(i, graficos.length - 1)]} />
      <Clasificacion>
        <TablaProcesos d={d} cat={cat} setCat={setCat} dif={dif} setDif={setDif} />
        <RespuestasAbiertas preguntas={abiertas.filter((p) => p.formulario === "percepcion")} equipo={equipo} />
      </Clasificacion>
    </Capitulo>
  );
}
