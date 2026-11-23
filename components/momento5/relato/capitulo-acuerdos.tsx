"use client";

import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { validaDemasComponentes, type DerivadosMomento5, type DestacadosMomento5, type FiltroEquipo } from "@/lib/reglas/momento5";
import type { PreguntaAbiertaMomento5, ResultadosMomento5 } from "@/types/momento5";
import { AcuerdosEquipo } from "../acuerdos";
import { RespuestasAbiertas } from "../respuestas-abiertas";
import { Capitulo, Cifra, Clasificacion, Pregunta } from "./capitulo";
import { Escenario } from "./escenario";
import { Condensacion, type EquipoCondensado } from "./graficos";

/**
 * Acuerdos Estratégicos del Equipo: solo lo que registró cada equipo, con los
 * enunciados del formulario. Los ajustes aparecen juntos, se ordenan en la
 * fila de su equipo y después se marca qué equipo validó los demás
 * componentes y cuál no alcanzó acuerdo. La matriz por transformación y
 * componente, y los ajustes uno por uno, siguen a continuación.
 */
export function CapituloAcuerdos({
  d,
  datos,
  destacados,
  equipo,
  compacto,
  abiertas,
}: {
  d: DerivadosMomento5;
  datos: ResultadosMomento5;
  destacados: DestacadosMomento5;
  equipo: FiltroEquipo;
  compacto: boolean;
  abiertas: PreguntaAbiertaMomento5[];
}) {
  // Solo los equipos que registraron el formulario: es su unidad de respuesta.
  const equipos: EquipoCondensado[] = d.acuerdos.map((a) => ({
    equipo: a.equipo,
    individuales: a.ajustes.length,
    acuerdos: a.ajustes.length,
    validaDemas: validaDemasComponentes(a),
    desacuerdo: Boolean(a.desacuerdos),
  }));
  const nEquipos = equipos.length;
  const conMas = equipos.reduce<EquipoCondensado | null>((m, e) => (!m || e.acuerdos > m.acuerdos ? e : m), null);
  const sinRegistro = equipo !== null && !datos.acuerdos.some((a) => a.equipo === equipo);

  const pasos = nEquipos
    ? [
        <div key="0" className="flex flex-col gap-4">
          <Pregunta>
            <TextoEditorial id="m5-acu-pregunta-ajuste" original="Registro de ajuste: Ajuste propuesto por el equipo" />
          </Pregunta>
          <p className="m5-entradilla">
            <TextoEditorial id="m5-acu-paso1-a" original="Los relatores registraron" /> <Cifra valor={d.kpi.ajustesEquipo} className="m5-correccion" />{" "}
            <TextoEditorial id="m5-acu-paso1-b" original="ajustes en los que hubo consenso, uno por cada marca." />
          </p>
          <p className="m5-nota">
            <TextoEditorial id="m5-acu-paso1-nota" original="Cada equipo podía registrar hasta cinco ajustes." />
          </p>
        </div>,
        <div key="1" className="flex flex-col gap-4">
          <Pregunta>
            <TextoEditorial id="m5-acu-pregunta-equipo" original="Equipo n.º" />
          </Pregunta>
          <p className="m5-entradilla">
            <Cifra valor={nEquipos} /> {nEquipos === 1 ? "equipo" : "equipos"}
            {conMas && nEquipos > 1 ? (
              <>
                ; <TextoEditorial id="m5-acu-paso2-b" original="el que más ajustes registró fue el equipo" /> <Cifra valor={conMas.equipo} />,{" "}
                <TextoEditorial id="m5-acu-paso2-c" original="con" /> <Cifra valor={conMas.acuerdos} />.
              </>
            ) : (
              "."
            )}
          </p>
        </div>,
        <div key="2" className="flex flex-col gap-4">
          <Pregunta>
            <TextoEditorial
              id="m5-acu-pregunta-valida"
              original="El equipo valida, sin ajustes adicionales, los demás componentes de las dos transformaciones asignadas."
            />
          </Pregunta>
          <p className="m5-entradilla">
            <Cifra valor={destacados.validanDemas} className="m5-valida" /> <TextoEditorial id="m5-de" original="de" /> <Cifra valor={nEquipos} />{" "}
            <TextoEditorial id="m5-acu-paso3-a" original="equipos respondieron «SI»." />
          </p>
          {destacados.conDesacuerdo.length ? (
            <>
              <p className="m5-texto font-semibold">
                <TextoEditorial id="m5-acu-pregunta-desacuerdo" original="El equipo no alcanzó acuerdo sobre uno o más componentes (identificar brevemente):" />
              </p>
              <ul className="flex flex-col gap-4 border-l border-[var(--m5-correccion)] pl-4">
                {destacados.conDesacuerdo.map((a) => (
                  <li key={a.equipo}>
                    <p className="m5-texto line-clamp-5">{a.desacuerdos}</p>
                    <p className="m5-cita-autor">
                      <TextoEditorial id="m5-equipo" original="Equipo" /> {a.equipo}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>,
      ]
    : [
        <p key="0" className="m5-entradilla text-[var(--m5-suave)]">
          {sinRegistro ? (
            <TextoEditorial id="m5-acu-sin-registro" original="Este equipo no registró acuerdos." />
          ) : (
            <TextoEditorial id="m5-acu-sin-datos" original="Con este filtro no hay acuerdos registrados." />
          )}
        </p>,
      ];

  return (
    <Capitulo id="acuerdos" formulario={d.formularios.find((f) => f.id === "acuerdos")} equipo={equipo}>
      <Escenario
        compacto={compacto}
        pasos={pasos}
        grafico={(i) => (nEquipos ? <Condensacion equipos={equipos} estado={Math.min(i, 2) as 0 | 1 | 2} /> : null)}
      />
      <Clasificacion>
        <AcuerdosEquipo d={d} />
        <RespuestasAbiertas preguntas={abiertas.filter((p) => p.formulario === "acuerdos")} equipo={equipo} />
      </Clasificacion>
    </Capitulo>
  );
}
