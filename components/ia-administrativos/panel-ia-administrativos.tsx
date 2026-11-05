"use client";

import { useMemo, useState } from "react";
import { BookCheck, CalendarClock, Sparkles, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltroOpciones, TODAS_LAS_OPCIONES } from "@/components/layout/filtro-opciones";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Hallazgos } from "@/components/kpi/hallazgos";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { BarrasEscala } from "@/components/charts/barras-escala";
import { DistribucionEscala } from "@/components/charts/distribucion-escala";
import { ComentariosPorTema } from "@/components/charts/comentarios-por-tema";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import {
  OTRAS_RESPUESTAS,
  contarOpciones,
  distribucionEscala,
  esTextoConContenido,
  estaEnNiveles,
  type ConteoOpcion,
} from "@/lib/reglas/formularios";
import { SIN_ESPECIFICAR } from "@/lib/reglas/participacion";
import {
  COMPETENCIAS_IA,
  ESCALA_CAMBIO,
  ESCALA_CLARIDAD,
  ESCALA_COMPETENCIA,
  ESCALA_FORMA_USO,
  ESCALA_FRECUENCIA,
  ESCALA_USO,
  NIVELES_CAMBIO_ALTO,
  NIVELES_COMPETENCIA_ALTA,
  NIVELES_USA_IA,
  NIVELES_USO_SEMANAL,
  PALABRAS_SIN_TEMA_TAREA,
  PREGUNTAS_IA,
  type CampoIa,
} from "@/lib/reglas/ia-administrativos";
import type { TemaComentarios } from "@/types/formularios";
import type { RespuestaIaAdministrativos } from "@/types/ia-administrativos";

type Respuesta = RespuestaIaAdministrativos;

/** Por debajo de cuántas respuestas una unidad no entra en la comparación de los hallazgos. */
const MINIMO_POR_UNIDAD = 10;

const unidadDe = (r: Respuesta) => r.unidadRegional ?? SIN_ESPECIFICAR;

/** % de quienes respondieron la pregunta que marcaron alguno de esos niveles. */
function porcentajeEn(respuestas: Respuesta[], campo: CampoIa, niveles: readonly string[]): number {
  const conRespuesta = respuestas.filter((r) => r[campo]);
  if (conRespuesta.length === 0) return 0;
  return (conRespuesta.filter((r) => estaEnNiveles(r[campo], niveles)).length / conRespuesta.length) * 100;
}

/** Las opciones con más menciones, sin el grupo de "otras". */
function principales(conteos: ConteoOpcion[], cuantas: number): ConteoOpcion[] {
  return conteos.filter((c) => c.etiqueta !== OTRAS_RESPUESTAS).slice(0, cuantas);
}

const DESCRIPCION_MULTIPLE = "% sobre quienes respondieron la pregunta; se podía marcar más de una opción.";

/**
 * El diagnóstico del uso de IA en procesos administrativos: cuánto y cómo se
 * usa, con qué competencias, qué lo frena y qué apoyo se pide.
 *
 * Todos los que respondieron son administrativos, así que no hay filtro de
 * rol. La unidad regional no la pregunta el formulario: es la de la jornada del
 * día en que se respondió, según las fechas registradas en Participación.
 */
export function PanelIaAdministrativos({
  respuestas,
  temas,
}: {
  respuestas: Respuesta[];
  temas: TemaComentarios[];
}) {
  const [unidad, setUnidad] = useState(TODAS_LAS_OPCIONES);

  const unidades = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const r of respuestas) conteo.set(unidadDe(r), (conteo.get(unidadDe(r)) ?? 0) + 1);
    return [...conteo.entries()]
      .sort(([a, x], [b, y]) => (a === SIN_ESPECIFICAR ? 1 : b === SIN_ESPECIFICAR ? -1 : y - x))
      .map(([etiqueta]) => etiqueta);
  }, [respuestas]);

  const filtradas = useMemo(
    () => (unidad === TODAS_LAS_OPCIONES ? respuestas : respuestas.filter((r) => unidadDe(r) === unidad)),
    [respuestas, unidad]
  );

  const m = useMemo(() => {
    const valores = (campo: CampoIa) => filtradas.map((r) => r[campo]);
    const competencias = COMPETENCIAS_IA.map((campo) => ({
      etiqueta: PREGUNTAS_IA[campo].texto,
      niveles: distribucionEscala(valores(campo), ESCALA_COMPETENCIA),
      resumen: porcentajeEn(filtradas, campo, NIVELES_COMPETENCIA_ALTA),
    })).sort((a, b) => b.resumen - a.resumen);

    return {
      total: filtradas.length,
      uso: distribucionEscala(valores("usoIa"), ESCALA_USO),
      usaIa: porcentajeEn(filtradas, "usoIa", NIVELES_USA_IA),
      frecuencia: distribucionEscala(valores("frecuencia"), ESCALA_FRECUENCIA),
      semanal: porcentajeEn(filtradas, "frecuencia", NIVELES_USO_SEMANAL),
      herramientas: contarOpciones(valores("herramientas")),
      actividades: contarOpciones(valores("actividades")),
      formaUso: distribucionEscala(valores("formaUso"), ESCALA_FORMA_USO),
      competencias,
      beneficios: contarOpciones(valores("beneficios")),
      cambio: distribucionEscala(valores("cambio"), ESCALA_CAMBIO),
      cambioAlto: porcentajeEn(filtradas, "cambio", NIVELES_CAMBIO_ALTO),
      dificultades: contarOpciones(valores("dificultades")),
      claridad: distribucionEscala(valores("claridad"), ESCALA_CLARIDAD),
      claridadPlena: porcentajeEn(filtradas, "claridad", ["Sí, completamente"]),
      noConoce: porcentajeEn(filtradas, "claridad", ["No las conozco", "No sé si existen"]),
      potencial: contarOpciones(valores("potencial")),
      apoyo: contarOpciones(valores("apoyo")),
      funciones: contarOpciones(valores("tipoFunciones")),
      tareas: filtradas.filter((r) => esTextoConContenido(r.tareaRepetitiva)),
    };
  }, [filtradas]);

  const hallazgos = useMemo(() => {
    if (m.total === 0) return [];
    const frases: string[] = [];
    frases.push(
      `El ${formatPorcentaje(m.usaIa)} usa IA en su trabajo y el ${formatPorcentaje(m.semanal)} lo hace al menos una vez por semana.`
    );

    const [h1, h2] = principales(m.herramientas, 2);
    const [a1] = principales(m.actividades, 1);
    if (h1 && a1) {
      frases.push(
        `${h1.etiqueta} (${formatPorcentaje(h1.porcentaje)})${h2 ? ` y ${h2.etiqueta} (${formatPorcentaje(h2.porcentaje)})` : ""} son las herramientas más usadas; el uso más común es «${a1.etiqueta}» (${formatPorcentaje(a1.porcentaje)}).`
      );
    }

    const fuerte = m.competencias[0];
    const debil = m.competencias.at(-1)!;
    frases.push(
      `La competencia con más dominio alto es «${fuerte.etiqueta}» (${formatPorcentaje(fuerte.resumen)} alta o muy alta); la más débil, «${debil.etiqueta}» (${formatPorcentaje(debil.resumen)}).`
    );

    const [d1, d2] = principales(m.dificultades, 2);
    if (d1) {
      frases.push(
        `La principal barrera es «${d1.etiqueta}» (${formatPorcentaje(d1.porcentaje)})${d2 ? `, seguida de «${d2.etiqueta}» (${formatPorcentaje(d2.porcentaje)})` : ""}.`
      );
    }

    frases.push(
      `${m.claridadPlena < 50 ? "Solo el" : "El"} ${formatPorcentaje(m.claridadPlena)} tiene plena claridad sobre las orientaciones institucionales para el uso responsable y seguro de IA; el ${formatPorcentaje(m.noConoce)} no las conoce o no sabe si existen.`
    );

    const [ap1] = principales(m.apoyo, 1);
    if (ap1) frases.push(`El apoyo más pedido es «${ap1.etiqueta}» (${formatPorcentaje(ap1.porcentaje)}).`);

    frases.push(`Para el ${formatPorcentaje(m.cambioAlto)} la IA ha cambiado bastante o mucho su forma de trabajar.`);

    if (unidad === TODAS_LAS_OPCIONES) {
      const comparables = unidades
        .filter((u) => u !== SIN_ESPECIFICAR)
        .map((u) => {
          const propias = respuestas.filter((r) => unidadDe(r) === u);
          return { unidad: u, total: propias.length, usaIa: porcentajeEn(propias, "usoIa", NIVELES_USA_IA) };
        })
        .filter((u) => u.total >= MINIMO_POR_UNIDAD);
      if (comparables.length >= 2) {
        frases.push(
          `Por unidad regional, el uso de IA en el trabajo es de ${comparables
            .map((u) => `${formatPorcentaje(u.usaIa)} en ${u.unidad} (${formatNumero(u.total)} respuestas)`)
            .join(" y ")}.`
        );
      }
    }
    return frases;
  }, [m, unidad, unidades, respuestas]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-end gap-3">
          <FiltroOpciones
            etiqueta="Unidad regional"
            valor={unidad}
            opciones={unidades}
            siTodas="Todas"
            ancho="w-60"
            onCambiar={setUnidad}
          />
          {unidad !== TODAS_LAS_OPCIONES ? (
            <Button variant="ghost" size="sm" onClick={() => setUnidad(TODAS_LAS_OPCIONES)}>
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          ) : null}
          <span className="text-[11px] text-muted-foreground">Unidad de la jornada del día en que se respondió.</span>
          <Badge variant="secondary" className="ml-auto">
            {formatNumero(filtradas.length)} de {formatNumero(respuestas.length)} respuestas
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard etiqueta="Respuestas" valor={formatNumero(m.total)} detalle="Administrativos que respondieron" icono={Users} />
        <KpiCard etiqueta="Usa IA en su trabajo" valor={formatPorcentaje(m.usaIa)} detalle="Frecuente u ocasionalmente" icono={Sparkles} />
        <KpiCard etiqueta="Uso al menos semanal" valor={formatPorcentaje(m.semanal)} detalle="Varias veces por semana o a diario" icono={CalendarClock} />
        <KpiCard
          etiqueta="Claridad plena sobre orientaciones"
          valor={formatPorcentaje(m.claridadPlena)}
          detalle="Uso responsable y seguro de IA"
          icono={BookCheck}
        />
      </div>

      {m.total === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Ninguna respuesta coincide con el filtro elegido.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <BarrasEscala titulo={PREGUNTAS_IA.usoIa.texto} niveles={m.uso} />
            </Tarjeta>
            <Tarjeta>
              <BarrasEscala titulo={PREGUNTAS_IA.frecuencia.texto} niveles={m.frecuencia} />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.herramientas.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.herramientas} truncarEn={34} />
            </Tarjeta>
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.actividades.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.actividades} truncarEn={40} />
            </Tarjeta>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Competencias para usar IA (autoevaluación)</CardTitle>
            </CardHeader>
            <CardContent>
              <DistribucionEscala etiquetaResumen="Alta o muy alta" filas={m.competencias} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <BarrasEscala
                titulo={PREGUNTAS_IA.formaUso.texto}
                descripcion="Ordenada de la forma de uso más avanzada a la más básica."
                niveles={m.formaUso}
              />
            </Tarjeta>
            <Tarjeta>
              <BarrasEscala titulo={PREGUNTAS_IA.cambio.texto} niveles={m.cambio} />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.beneficios.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.beneficios} truncarEn={34} />
            </Tarjeta>
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.dificultades.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.dificultades} truncarEn={40} />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <BarrasEscala titulo={PREGUNTAS_IA.claridad.texto} niveles={m.claridad} />
            </Tarjeta>
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.tipoFunciones.texto} datos={m.funciones} truncarEn={30} />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Tarjeta>
              <RankedBarChart titulo={PREGUNTAS_IA.potencial.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.potencial} truncarEn={36} />
            </Tarjeta>
            <Tarjeta>
              {/* 42, medido en WebKit: el eje reserva 6 px por carácter y estas
                  etiquetas ocupan más. Con 40 se cortaba "Acompañamiento para
                  identificar procesos" y con 46 "Formación avanzada en
                  automatización y agentes"; con 42 la línea más ancha mide
                  238 px de 252. */}
              <RankedBarChart titulo={PREGUNTAS_IA.apoyo.texto} descripcion={DESCRIPCION_MULTIPLE} datos={m.apoyo} truncarEn={42} />
            </Tarjeta>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Tareas que la IA podría mejorar</CardTitle>
            </CardHeader>
            <CardContent>
              <ComentariosPorTema
                temas={temas}
                palabrasIgnoradas={PALABRAS_SIN_TEMA_TAREA}
                tituloNube="Lo que más se repite en las tareas descritas"
                tituloLista="Tareas o procesos descritos"
                comentarios={m.tareas.map((r) => ({
                  id: r.id,
                  texto: r.tareaRepetitiva ?? "",
                  tema: r.tema,
                  detalle: [r.tipoFunciones, r.dependencia, r.unidadRegional].filter(Boolean).join(" · "),
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Al final, como cierre: primero se ven los datos y después la lectura
          que se hace de ellos. */}
      <Hallazgos frases={hallazgos} />
    </div>
  );
}

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-border/70">
      <CardContent>{children}</CardContent>
    </Card>
  );
}
