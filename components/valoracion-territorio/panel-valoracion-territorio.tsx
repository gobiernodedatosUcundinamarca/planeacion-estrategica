"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, Star, ThumbsUp, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FiltroOpciones, TODAS_LAS_OPCIONES } from "@/components/layout/filtro-opciones";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Hallazgos } from "@/components/kpi/hallazgos";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { DistribucionEscala } from "@/components/charts/distribucion-escala";
import { ComentariosPorTema } from "@/components/charts/comentarios-por-tema";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { calcularFrecuenciaPalabras } from "@/lib/frecuencia-palabras";
import { clave, distribucionEscala, esTextoConContenido, estaEnNiveles } from "@/lib/reglas/formularios";
import { SIN_ESPECIFICAR } from "@/lib/reglas/participacion";
import {
  AFIRMACIONES_VALORACION,
  ESCALA_ACUERDO,
  NIVELES_FAVORABLES,
  PALABRAS_SIN_TEMA_MEJORA,
  etiquetaActor,
  type CampoAfirmacion,
} from "@/lib/reglas/valoracion-territorio";
import type { TemaComentarios } from "@/types/formularios";
import type { RespuestaValoracionTerritorio } from "@/types/valoracion-territorio";

const TODOS = TODAS_LAS_OPCIONES;

/** Por debajo de cuántas respuestas un grupo no entra en las comparaciones de los hallazgos. */
const MINIMO_POR_GRUPO = 10;

const formatoDia = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

type Respuesta = RespuestaValoracionTerritorio;

const unidadDe = (r: Respuesta) => r.unidadRegional ?? SIN_ESPECIFICAR;

/** % de respuestas favorables (de acuerdo o totalmente) a una afirmación. */
function favorable(respuestas: Respuesta[], campo: CampoAfirmacion): number {
  const conRespuesta = respuestas.filter((r) => r[campo]);
  if (conRespuesta.length === 0) return 0;
  return (conRespuesta.filter((r) => estaEnNiveles(r[campo], NIVELES_FAVORABLES)).length / conRespuesta.length) * 100;
}

/** Promedio del % favorable de las tres afirmaciones. */
function favorablePromedio(respuestas: Respuesta[]): number {
  return (
    AFIRMACIONES_VALORACION.reduce((suma, a) => suma + favorable(respuestas, a.campo), 0) /
    AFIRMACIONES_VALORACION.length
  );
}

interface Grupo {
  etiqueta: string;
  total: number;
  promedio: number;
  afirmaciones: number[];
}

/** Las respuestas agrupadas por una dimensión, con su valoración favorable. */
function agrupar(respuestas: Respuesta[], clave: (r: Respuesta) => string): Grupo[] {
  const grupos = new Map<string, Respuesta[]>();
  for (const r of respuestas) grupos.set(clave(r), [...(grupos.get(clave(r)) ?? []), r]);
  return [...grupos.entries()]
    .map(([etiqueta, propias]) => ({
      etiqueta,
      total: propias.length,
      promedio: favorablePromedio(propias),
      afirmaciones: AFIRMACIONES_VALORACION.map((a) => favorable(propias, a.campo)),
    }))
    .sort((a, b) =>
      a.etiqueta === SIN_ESPECIFICAR ? 1 : b.etiqueta === SIN_ESPECIFICAR ? -1 : b.total - a.total
    );
}

/** El más y el menos favorable entre los grupos con suficientes respuestas. */
function extremos(grupos: Grupo[]): { alto: Grupo; bajo: Grupo } | null {
  const comparables = grupos
    .filter((g) => g.total >= MINIMO_POR_GRUPO && g.etiqueta !== SIN_ESPECIFICAR)
    .sort((a, b) => b.promedio - a.promedio);
  return comparables.length >= 2 ? { alto: comparables[0], bajo: comparables.at(-1)! } : null;
}

/**
 * La valoración de la experiencia en territorio: qué tanto ayudó a comprender
 * las transformaciones y el rumbo de la universidad, cómo se vivió la dinámica
 * y qué mejorar.
 *
 * La unidad regional no la pregunta el formulario: es la de la jornada del día
 * en que se respondió, según las fechas registradas en Participación.
 */
export function PanelValoracionTerritorio({
  respuestas,
  temas,
  excluidas,
}: {
  respuestas: Respuesta[];
  temas: TemaComentarios[];
  /** Respuestas que no entran por no tener unidad regional o tipo de actor (`entraEnValoracion`). */
  excluidas: { sinUnidadRegional: number; sinRol: number };
}) {
  const totalExcluidas = excluidas.sinUnidadRegional + excluidas.sinRol;
  const [rol, setRol] = useState(TODOS);
  const [unidad, setUnidad] = useState(TODOS);

  const opciones = useMemo(
    () => ({
      roles: agrupar(respuestas, (r) => etiquetaActor(r.tipoActor)).map((g) => g.etiqueta),
      unidades: agrupar(respuestas, unidadDe).map((g) => g.etiqueta),
    }),
    [respuestas]
  );

  const filtradas = useMemo(
    () =>
      respuestas.filter(
        (r) =>
          (rol === TODOS || etiquetaActor(r.tipoActor) === rol) &&
          (unidad === TODOS || unidadDe(r) === unidad)
      ),
    [respuestas, rol, unidad]
  );

  const metricas = useMemo(() => {
    const total = filtradas.length;
    const porAfirmacion = AFIRMACIONES_VALORACION.map((a) => ({
      ...a,
      niveles: distribucionEscala(filtradas.map((r) => r[a.campo]), ESCALA_ACUERDO),
      favorable: favorable(filtradas, a.campo),
    }));

    const todoMaximo = filtradas.filter((r) =>
      AFIRMACIONES_VALORACION.every((a) => estaEnNiveles(r[a.campo], ["Totalmente de acuerdo"]))
    ).length;

    const sugerencias = filtradas.filter((r) => esTextoConContenido(r.mejora));
    const sinTema = new Set(PALABRAS_SIN_TEMA_MEJORA.map(clave));
    const palabrasClave = calcularFrecuenciaPalabras(
      sugerencias.map((r) => r.mejora ?? ""),
      { maxPalabras: 20, frecuenciaMinima: 2 }
    )
      .filter((p) => !sinTema.has(clave(p.palabra)))
      .slice(0, 3)
      .map((p) => p.palabra);

    return {
      total,
      porAfirmacion,
      porRol: agrupar(filtradas, (r) => etiquetaActor(r.tipoActor)),
      porUnidad: agrupar(filtradas, unidadDe),
      promedio: favorablePromedio(filtradas),
      todoMaximo: total > 0 ? (todoMaximo / total) * 100 : 0,
      sugerencias,
      palabrasClave,
    };
  }, [filtradas]);

  const hallazgos = useMemo(() => {
    if (metricas.total === 0) return [];
    const frases: string[] = [];
    const ordenadas = [...metricas.porAfirmacion].sort((a, b) => b.favorable - a.favorable);
    const mejor = ordenadas[0];
    const peor = ordenadas.at(-1)!;

    frases.push(
      `El ${formatPorcentaje(mejor.favorable)} está de acuerdo o totalmente de acuerdo con «${mejor.corta}», la afirmación mejor valorada.`
    );
    if (peor.campo !== mejor.campo) {
      frases.push(
        `La que menos acuerdo reúne es «${peor.corta}» (${formatPorcentaje(peor.favorable)}): el ${formatPorcentaje(100 - peor.favorable)} se declara neutral o en desacuerdo.`
      );
    }
    frases.push(`El ${formatPorcentaje(metricas.todoMaximo)} marcó «Totalmente de acuerdo» en las tres afirmaciones.`);

    const porRol = rol === TODOS ? extremos(metricas.porRol) : null;
    if (porRol) {
      frases.push(
        `Por rol, la valoración más favorable es la de ${porRol.alto.etiqueta} (${formatPorcentaje(porRol.alto.promedio)}) y la menos, la de ${porRol.bajo.etiqueta} (${formatPorcentaje(porRol.bajo.promedio)}).`
      );
    }
    const porUnidad = unidad === TODOS ? extremos(metricas.porUnidad) : null;
    if (porUnidad) {
      frases.push(
        `Por unidad regional, la jornada mejor valorada fue la de ${porUnidad.alto.etiqueta} (${formatPorcentaje(porUnidad.alto.promedio)}) y la menos, la de ${porUnidad.bajo.etiqueta} (${formatPorcentaje(porUnidad.bajo.promedio)}).`
      );
    }

    if (metricas.sugerencias.length > 0) {
      const palabras =
        metricas.palabrasClave.length > 0
          ? `; lo que más se repite: ${metricas.palabrasClave.map((p) => `«${p}»`).join(", ")}`
          : "";
      frases.push(
        `${formatNumero(metricas.sugerencias.length)} personas (${formatPorcentaje((metricas.sugerencias.length / metricas.total) * 100)}) dejaron una sugerencia de mejora con contenido${palabras}.`
      );
    }
    return frases;
  }, [metricas, rol, unidad]);

  const hayFiltros = rol !== TODOS || unidad !== TODOS;
  const alternar = (actual: string, etiqueta: string) => (actual === etiqueta ? TODOS : etiqueta);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-end gap-3">
          <FiltroOpciones etiqueta="Unidad regional" valor={unidad} opciones={opciones.unidades} siTodas="Todas" ancho="w-60" onCambiar={setUnidad} />
          <FiltroOpciones etiqueta="Rol" valor={rol} opciones={opciones.roles} siTodas="Todos" ancho="w-72" onCambiar={setRol} />
          {hayFiltros ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRol(TODOS);
                setUnidad(TODOS);
              }}
            >
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          ) : null}
          <Badge variant="secondary" className="ml-auto">
            {formatNumero(filtradas.length)} de {formatNumero(respuestas.length)} respuestas
          </Badge>
          {/* Se dice en vez de esconderlo: quien compare con el total del
              formulario debe saber por qué la cifra es menor. */}
          {totalExcluidas > 0 ? (
            <p className="basis-full text-[11px] text-muted-foreground">
              No se incluyen {formatNumero(totalExcluidas)} respuesta(s) para que todas las cifras cuadren
              entre sí:{" "}
              {[
                excluidas.sinUnidadRegional > 0
                  ? `${formatNumero(excluidas.sinUnidadRegional)} de un día sin jornada registrada (sin unidad regional)`
                  : null,
                excluidas.sinRol > 0 ? `${formatNumero(excluidas.sinRol)} sin tipo de actor` : null,
              ]
                .filter(Boolean)
                .join(" y ")}
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard etiqueta="Respuestas" valor={formatNumero(metricas.total)} detalle="Personas que valoraron la experiencia" icono={Users} />
        <KpiCard
          etiqueta="Valoración favorable"
          valor={formatPorcentaje(metricas.promedio)}
          detalle="De acuerdo o totalmente, promedio de las tres afirmaciones"
          icono={ThumbsUp}
        />
        <KpiCard
          etiqueta="Totalmente de acuerdo en todo"
          valor={formatPorcentaje(metricas.todoMaximo)}
          detalle="Marcó el nivel más alto en las tres"
          icono={Star}
        />
        <KpiCard
          etiqueta="Sugerencias de mejora"
          valor={formatNumero(metricas.sugerencias.length)}
          detalle="Respuestas abiertas con contenido"
          icono={MessageSquareText}
        />
      </div>

      {metricas.total === 0 ? (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Ninguna respuesta coincide con los filtros elegidos.
        </p>
      ) : (
        <>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Nivel de acuerdo con cada afirmación</CardTitle>
            </CardHeader>
            <CardContent>
              <DistribucionEscala
                etiquetaResumen="De acuerdo"
                filas={metricas.porAfirmacion.map((a) => ({
                  etiqueta: a.corta,
                  detalle: a.texto,
                  niveles: a.niveles,
                  resumen: a.favorable,
                }))}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/70">
              <CardContent>
                <RankedBarChart
                  titulo="Respuestas por unidad regional"
                  descripcion="Unidad de la jornada del día en que se respondió."
                  datos={metricas.porUnidad.map((g) => ({
                    etiqueta: g.etiqueta,
                    conteo: g.total,
                    porcentaje: (g.total / metricas.total) * 100,
                  }))}
                  onSeleccionarBarra={(etiqueta) => setUnidad((actual) => alternar(actual, etiqueta))}
                  etiquetaSeleccionada={unidad === TODOS ? null : unidad}
                  truncarEn={30}
                />
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent>
                <RankedBarChart
                  titulo="Respuestas por rol"
                  datos={metricas.porRol.map((g) => ({
                    etiqueta: g.etiqueta,
                    conteo: g.total,
                    porcentaje: (g.total / metricas.total) * 100,
                  }))}
                  onSeleccionarBarra={(etiqueta) => setRol((actual) => alternar(actual, etiqueta))}
                  etiquetaSeleccionada={rol === TODOS ? null : rol}
                  truncarEn={34}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TablaFavorable titulo="Valoración favorable por unidad regional" columna="Unidad regional" grupos={metricas.porUnidad} />
            <TablaFavorable titulo="Valoración favorable por rol" columna="Rol" grupos={metricas.porRol} />
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>¿Qué aspecto de la experiencia podríamos mejorar?</CardTitle>
            </CardHeader>
            <CardContent>
              <ComentariosPorTema
                temas={temas}
                palabrasIgnoradas={PALABRAS_SIN_TEMA_MEJORA}
                tituloNube="Lo que más se repite en las sugerencias"
                tituloLista="Sugerencias"
                comentarios={metricas.sugerencias.map((r) => ({
                  id: r.id,
                  texto: r.mejora ?? "",
                  tema: r.tema,
                  detalle: [
                    etiquetaActor(r.tipoActor),
                    r.unidadRegional,
                    r.fechaRespuesta ? formatoDia.format(new Date(`${r.fechaRespuesta}T12:00:00`)) : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
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

/** Tono de una casilla según su valor dentro del rango de la tabla. */
function tono(valor: number, minimo: number, maximo: number): string | undefined {
  if (maximo === minimo) return undefined;
  const intensidad = Math.round(4 + ((valor - minimo) / (maximo - minimo)) * 22);
  return `color-mix(in oklch, var(--primary) ${intensidad}%, transparent)`;
}

/**
 * % favorable de cada afirmación por grupo, con tono para ver de un vistazo
 * dónde es más alto. Los grupos con menos de `MINIMO_POR_GRUPO` respuestas van
 * en gris y sin tono: con 1 o 3 respuestas el porcentaje salta a 100 % o a 50 %
 * por una sola persona, y pintado como los demás parecería el mejor o el peor.
 */
function TablaFavorable({ titulo, columna, grupos }: { titulo: string; columna: string; grupos: Grupo[] }) {
  const valores = grupos.filter((g) => g.total >= MINIMO_POR_GRUPO).flatMap((g) => g.afirmaciones);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const hayPequenos = grupos.some((g) => g.total < MINIMO_POR_GRUPO);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-[13px]">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{columna}</TableHead>
              {AFIRMACIONES_VALORACION.map((a) => (
                <TableHead key={a.campo} className="min-w-20 text-right text-xs leading-tight whitespace-normal" title={a.texto}>
                  {a.corta}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((g) => {
              const pequeno = g.total < MINIMO_POR_GRUPO;
              return (
                <TableRow key={g.etiqueta} className={pequeno ? "text-muted-foreground" : undefined}>
                  <TableCell className="text-xs whitespace-normal">
                    {g.etiqueta}
                    <span className="block text-[11px] text-muted-foreground">{formatNumero(g.total)} resp.</span>
                  </TableCell>
                  {g.afirmaciones.map((valor, i) => (
                    <TableCell
                      key={AFIRMACIONES_VALORACION[i].campo}
                      className={pequeno ? "text-right text-xs tabular-nums" : "text-right text-xs font-medium tabular-nums"}
                      style={pequeno ? undefined : { backgroundColor: tono(valor, minimo, maximo) }}
                    >
                      {formatPorcentaje(valor)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          % de acuerdo o totalmente de acuerdo. El tono resalta los valores más altos de la tabla.
          {hayPequenos
            ? ` En gris, los grupos con menos de ${MINIMO_POR_GRUPO} respuestas: ahí una sola persona mueve mucho el porcentaje.`
            : ""}
        </p>
      </CardContent>
    </Card>
  );
}
