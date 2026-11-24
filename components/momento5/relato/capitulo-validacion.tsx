"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import {
  porcentajesComplementarios,
  type ConformacionEquipo,
  type DerivadosMomento5,
  type DestacadosMomento5,
  type FiltroEquipo,
} from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5 } from "@/types/momento5";
import { Fuente, TablaSimple, Tarjeta, pct } from "../piezas";
import { RespuestasAbiertas } from "../respuestas-abiertas";
import { BarrasValoracion, MapaComponentes } from "../validacion";
import { Capitulo, Cifra, Clasificacion, Porcentaje, Pregunta } from "./capitulo";
import { EquiposAsignados } from "./equipos-asignados";
import { Escenario } from "./escenario";

const SinDatos = () => (
  <p className="m5-entradilla text-[var(--m5-suave)]">
    <TextoEditorial id="m5-sin-valoraciones" original="Con este filtro no hay valoraciones del plan." />
  </p>
);

/** «Y» antes del último: «A, B y C». */
const enumerar = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : (items[0] ?? ""));

/**
 * Formulario Individual de Validación Estratégica. El formulario tenía una
 * sección «3. Transformación: …» por transformación y, en ella, cada
 * objetivo, ámbito y resultado se marcaba «Se valida» o «Requiere ajuste».
 * Cada paso del scroll explica una de sus gráficas: por transformación, por
 * tipo de componente y componente por componente (el mapa, con las
 * propuestas de cada celda).
 */
export function CapituloValidacion({
  d,
  destacados,
  equipo,
  compacto,
  abiertas,
  equipos,
}: {
  d: DerivadosMomento5;
  destacados: DestacadosMomento5;
  equipo: FiltroEquipo;
  compacto: boolean;
  abiertas: PreguntaAbiertaMomento5[];
  equipos: ConformacionEquipo[];
}) {
  const k = d.kpi;
  const tipo = destacados.tipoMasCorregido;
  const masT = destacados.transformacionMasCorregida;
  const foco = destacados.componenteMasAjustado;
  const filasT = d.porT.map((r) => ({ id: r.t, label: r.nombre, V: r.V, A: r.A, total: r.total }));
  // Con filtro de equipo solo cuentan las dos transformaciones que ese equipo valoró.
  const valoradas = d.porT.filter((t) => t.total > 0).map((t) => t.nombre);
  const reparto = porcentajesComplementarios(k.ajustesIndividuales, k.valoraciones);
  const nombreT = Object.fromEntries(d.porT.map((t) => [t.t, t.nombre]));
  const filaTabla = (r: { label: string; V: number; A: number; total: number }) => [
    r.label,
    r.V,
    r.A,
    r.total,
    r.total ? pct(r.A / r.total) : "—",
  ];
  const opciones = (
    <p className="m5-nota">
      <TextoEditorial id="m5-val-opciones" original="Opciones de respuesta: «Se valida» o «Requiere ajuste»." />
    </p>
  );

  const pasos = [
    k.valoraciones ? (
      <>
        <Pregunta>
          <TextoEditorial id="m5-val-pregunta-transformacion" original="3. Transformación:" /> {enumerar(valoradas)}
        </Pregunta>
        {opciones}
        <p className="m5-entradilla">
          <TextoEditorial id="m5-val-paso1-a" original="De las" /> <Cifra valor={k.valoraciones} />{" "}
          <TextoEditorial id="m5-val-paso1-b" original="valoraciones," /> <Cifra valor={k.valoraciones - k.ajustesIndividuales} className="m5-valida" /> (
          <Porcentaje fraccion={reparto.valida / 100} className="m5-valida" />){" "}
          <TextoEditorial id="m5-val-paso1-c" original="fueron «Se valida» y" /> <Cifra valor={k.ajustesIndividuales} className="m5-correccion" /> (
          <Porcentaje fraccion={reparto.ajuste / 100} className="m5-correccion" />){" "}
          <TextoEditorial id="m5-val-paso1-d" original="«Requiere ajuste»." />
        </p>
        {masT ? (
          <p className="m5-texto">
            <TextoEditorial id="m5-val-paso1-e" original="La transformación con mayor proporción de «Requiere ajuste» fue" /> {masT.nombre}:{" "}
            <Porcentaje fraccion={masT.A / masT.total} className="m5-correccion" />{" "}
            <TextoEditorial id="m5-val-paso1-f" original="de sus valoraciones." />
          </p>
        ) : null}
        <p className="m5-nota">
          <TextoEditorial id="m5-val-paso1-nota" original="Cada participante valoró las dos transformaciones asignadas a su equipo." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
    tipo ? (
      <>
        <Pregunta>
          <TextoEditorial id="m5-val-pregunta-tipo" original="OBJETIVO ESTRATÉGICO, ÁMBITO y RESULTADO ESTRATÉGICO" />
        </Pregunta>
        {opciones}
        <p className="m5-entradilla">
          {/* Las tres agrupaciones son masculinas y plurales: «Los objetivos…», «Los ámbitos…», «Los resultados…». */}
          <TextoEditorial id="m5-val-paso2-los" original="Los" /> {tipo.label.toLowerCase()}{" "}
          <TextoEditorial id="m5-val-paso2-a" original="reunieron la mayor proporción de «Requiere ajuste»:" />{" "}
          <Porcentaje fraccion={tipo.pct} className="m5-correccion" /> <TextoEditorial id="m5-val-paso2-b" original="de sus valoraciones." />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
    foco ? (
      <>
        <Pregunta>
          {nombreT[foco.t] ?? foco.t}: {foco.titulo}
        </Pregunta>
        {foco.texto ? <p className="m5-texto text-[var(--m5-suave)]">{foco.texto}</p> : null}
        {opciones}
        <p className="m5-entradilla">
          <Cifra valor={foco.A} className="m5-correccion" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={foco.total} />{" "}
          <TextoEditorial id="m5-val-paso3-a" original="participantes marcaron «Requiere ajuste» en este componente:" />{" "}
          <Porcentaje fraccion={foco.pct} className="m5-correccion" />
          <TextoEditorial id="m5-val-paso3-b" original=", la proporción más alta entre los componentes." />
        </p>
        <p className="m5-nota">
          <TextoEditorial
            id="m5-val-paso3-nota"
            original="Elige una celda del mapa para leer el «Ajuste propuesto» y la «Justificación del ajuste» de cada persona."
          />
        </p>
      </>
    ) : (
      <SinDatos />
    ),
  ];

  const graficos = [
    <Tarjeta
      key="t"
      titulo="Valoración por transformación"
      descripcion="Respuestas «Se valida» y «Requiere ajuste» a los componentes de cada transformación."
      pie={
        <Fuente
          id="m5-fuente-val-transformacion"
          original="las cuatro secciones «3. Transformación:» del Formulario Individual de Validación Estratégica (UC Inteligente, UC Translocal, UC Emprendedora e Innovadora y UC para la Vida). Cada valoración es la respuesta de una persona a un componente (OBJETIVO ESTRATÉGICO, ÁMBITO o RESULTADO ESTRATÉGICO) con las opciones «Se valida» o «Requiere ajuste»; aquí se suman por transformación. Cada persona solo respondió las dos transformaciones de su equipo."
        />
      }
      tabla={
        <TablaSimple
          encabezados={["Agrupación", "Se valida", "Requiere ajuste", "Total", "% ajuste"]}
          numericas={[1, 2, 3, 4]}
          filas={filasT.map(filaTabla)}
        />
      }
    >
      <BarrasValoracion filas={filasT} />
    </Tarjeta>,
    <Tarjeta
      key="c"
      titulo="Valoración por tipo de componente"
      descripcion="Las mismas respuestas, agrupadas en objetivos estratégicos, ámbitos de transformación y resultados estratégicos."
      pie={
        <Fuente
          id="m5-fuente-val-tipo"
          original="las mismas valoraciones «Se valida» o «Requiere ajuste», sumadas según el tipo de componente que encabezaba cada pregunta: OBJETIVO ESTRATÉGICO, ÁMBITO o RESULTADO ESTRATÉGICO."
        />
      }
      tabla={
        <TablaSimple
          encabezados={["Agrupación", "Se valida", "Requiere ajuste", "Total", "% ajuste"]}
          numericas={[1, 2, 3, 4]}
          filas={d.porTipoComp.map(filaTabla)}
        />
      }
    >
      <BarrasValoracion filas={d.porTipoComp} />
    </Tarjeta>,
    <MapaComponentes key="m" d={d} />,
  ];

  return (
    <Capitulo id="validacion" formulario={d.formularios.find((f) => f.id === "validacion")} equipo={equipo}>
      <EquiposAsignados equipos={equipos} equipo={equipo} />
      <Escenario compacto={compacto} pasos={pasos} grafico={(i) => graficos[Math.min(i, graficos.length - 1)]} />
      <Clasificacion>
        <RespuestasAbiertas preguntas={abiertas.filter((p) => p.formulario === "validacion")} equipo={equipo} />
      </Clasificacion>
    </Capitulo>
  );
}
