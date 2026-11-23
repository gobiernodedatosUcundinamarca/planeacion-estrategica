"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import type { DerivadosMomento5, DestacadosMomento5, FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5 } from "@/types/momento5";
import { TablaSimple, Tarjeta, pct } from "../piezas";
import { RespuestasAbiertas } from "../respuestas-abiertas";
import { BarrasValoracion, MapaComponentes } from "../validacion";
import { Capitulo, Cifra, Clasificacion, Porcentaje, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";

const SinDatos = () => (
  <p className="m5-entradilla text-[var(--m5-suave)]">
    <TextoEditorial id="m5-sin-valoraciones" original="Con este filtro no hay valoraciones del plan." />
  </p>
);

/**
 * Formulario Individual de Validación Estratégica. En el formulario, cada
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
}: {
  d: DerivadosMomento5;
  destacados: DestacadosMomento5;
  equipo: FiltroEquipo;
  compacto: boolean;
  abiertas: PreguntaAbiertaMomento5[];
}) {
  const k = d.kpi;
  const tipo = destacados.tipoMasCorregido;
  const masT = destacados.transformacionMasCorregida;
  const foco = destacados.componenteMasAjustado;
  const filasT = d.porT.map((r) => ({ id: r.t, label: r.nombre, V: r.V, A: r.A, total: r.total }));
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
          <TextoEditorial id="m5-val-pregunta-transformacion" original="3. Transformación:" /> {d.porT.map((t) => t.nombre).join(", ")}
        </Pregunta>
        {opciones}
        <p className="m5-entradilla">
          <TextoEditorial id="m5-val-paso1-a" original="De las" /> <Cifra valor={k.valoraciones} />{" "}
          <TextoEditorial id="m5-val-paso1-b" original="valoraciones," /> <Porcentaje fraccion={k.pctValida} className="m5-valida" />{" "}
          <TextoEditorial id="m5-val-paso1-c" original="fueron «Se valida» y" /> <Cifra valor={k.ajustesIndividuales} className="m5-correccion" />{" "}
          <TextoEditorial id="m5-val-paso1-d" original="«Requiere ajuste»." />
        </p>
        {masT ? (
          <p className="m5-texto">
            <TextoEditorial id="m5-val-paso1-e" original="La transformación con más «Requiere ajuste» en proporción fue" /> {masT.nombre}:{" "}
            <Porcentaje fraccion={masT.A / masT.total} className="m5-correccion" />.
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
          <TextoEditorial id="m5-val-paso2-a" original="El tipo de componente con más «Requiere ajuste» fue" /> {tipo.label.toLowerCase()}:{" "}
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
        {foco.texto ? <p className="m5-texto text-[var(--m5-suave)] line-clamp-4">{foco.texto}</p> : null}
        {opciones}
        <p className="m5-entradilla">
          <Cifra valor={foco.A} className="m5-correccion" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={foco.total} />{" "}
          <TextoEditorial id="m5-val-paso3-a" original="participantes marcaron «Requiere ajuste» en este componente, el que más ajustes reunió." />
        </p>
        <p className="m5-nota">
          <TextoEditorial
            id="m5-val-paso3-nota"
            original="En el mapa, cada celda es un objetivo, ámbito o resultado, y su tono marca qué parte pidió ajuste. Elige una celda para leer el «Ajuste propuesto» y la «Justificación del ajuste» de cada persona."
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
      descripcion="Proporción de componentes que cada participante validó tal como están o para los que pidió ajuste."
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
      titulo="Por tipo de componente"
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
      <Escenario compacto={compacto} pasos={pasos} grafico={(i) => graficos[Math.min(i, graficos.length - 1)]} />
      <Clasificacion>
        <RespuestasAbiertas preguntas={abiertas.filter((p) => p.formulario === "validacion")} equipo={equipo} />
      </Clasificacion>
    </Capitulo>
  );
}
