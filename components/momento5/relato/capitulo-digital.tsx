"use client";

import { useState } from "react";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { DerivadosMomento5, DestacadosMomento5, FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5 } from "@/types/momento5";
import { Fuente, Medidor, Ranking, Tarjeta } from "../piezas";
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
          <TextoEditorial id="m5-dig-paso1-a" original="participantes propusieron un proceso de su dependencia o unidad académica. La categoría más frecuente es" />{" "}
          <strong className="font-semibold">{categoria.label}</strong>, <TextoEditorial id="m5-dig-paso1-b" original="con" />{" "}
          <Cifra valor={categoria.value} /> <TextoEditorial id="m5-dig-paso1-c" original="propuestas." />
        </p>
        <p className="m5-nota">
          <TextoEditorial id="m5-dig-paso1-nota" original="Haz clic en una barra para ver solo esos procesos en la tabla de más abajo." />
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
          <TextoEditorial id="m5-dig-paso2-nota" original="Es una pregunta abierta: los tipos de dificultad salen de clasificar cada respuesta." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
    n ? (
      <>
        <Pregunta>
          <TextoEditorial id="m5-dig-pregunta-ia" original="Menciones de inteligencia artificial y automatización" />
        </Pregunta>
        <p className="m5-entradilla">
          <Cifra valor={d.kpi.procesosAuto} className="m5-valida" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={n} />{" "}
          <TextoEditorial id="m5-dig-paso3-a" original="respuestas mencionan inteligencia artificial o automatización de tareas; de ellas," />{" "}
          <Cifra valor={d.kpi.procesosIA} /> <TextoEditorial id="m5-dig-paso3-b" original="hablan de IA, chatbots o agentes inteligentes." />
        </p>
        <p className="m5-nota">
          <TextoEditorial
            id="m5-dig-paso3-nota"
            original="Se buscaron en las cuatro preguntas abiertas: «Proceso propuesto:», «¿En qué consiste actualmente?», «Dificultad percibida» y «¿Cómo afecta el trabajo a los usuarios?»."
          />
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
      descripcion="Clasificación de las respuestas a «Proceso propuesto:», una categoría por respuesta."
      pie={
        <Fuente
          id="m5-fuente-dig-categoria"
          original="«Proceso propuesto:», Formulario de Percepción sobre Transformación Digital. Pregunta abierta: cada respuesta se leyó y recibió una sola categoría (codificación analítica); aquí se cuentan las respuestas de cada categoría."
        />
      }
      items={d.catProceso}
      total={n}
      truncarEn={30}
      seleccionada={cat}
      onSeleccionar={setCat}
    />,
    <Ranking
      key="dif"
      titulo="Dificultades percibidas"
      descripcion="Clasificación de las respuestas a «Dificultad percibida». Una respuesta puede tener varios tipos, por eso los porcentajes no suman 100 %."
      pie={
        <Fuente
          id="m5-fuente-dig-dificultad"
          original="«Dificultad percibida», Formulario de Percepción sobre Transformación Digital. Pregunta abierta: cada respuesta se leyó junto con lo demás que escribió la persona y recibió uno o más tipos de dificultad (codificación analítica). Porcentaje = respuestas con ese tipo ÷ total de respuestas."
        />
      }
      items={d.dificultades}
      total={n}
      truncarEn={30}
      seleccionada={dif}
      onSeleccionar={setDif}
    />,
    <Tarjeta
      key="ia"
      titulo="Menciones de inteligencia artificial y automatización"
      descripcion="Respuestas que las nombran de forma explícita en alguna de las cuatro preguntas abiertas."
      pie={
        <Fuente
          id="m5-fuente-dig-ia"
          original="búsqueda de palabras en «Proceso propuesto:», «¿En qué consiste actualmente?», «Dificultad percibida» y «¿Cómo afecta el trabajo a los usuarios?». IA: la respuesta contiene «IA», «inteligencia artificial», «chatbot» o «agente». Automatización: contiene una palabra que empieza por «automati» (automatizar, automatización). Una respuesta cuenta una vez aunque lo mencione en varias preguntas."
        />
      }
    >
      <div className="flex flex-col gap-6">
        <Cuadricula total={n} ia={d.kpi.procesosIA} automatizacion={d.kpi.procesosAuto} />
        <div className="flex flex-col gap-4">
          <Medidor
            etiqueta={<TextoEditorial id="m5-mencionan-ia" original="Mencionan IA, chatbots o agentes inteligentes" />}
            valor={d.kpi.procesosIA}
            total={n}
          />
          <Medidor
            etiqueta={<TextoEditorial id="m5-mencionan-automatizacion" original="Mencionan IA o automatización de tareas (incluye las anteriores)" />}
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
