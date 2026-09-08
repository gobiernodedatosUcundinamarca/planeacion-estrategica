"use client";

import { useMemo, useState } from "react";
import { MessageSquareQuote, ThumbsUp, Users2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/kpi/kpi-card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { DistribucionRespaldo } from "@/components/transformaciones/distribucion-respaldo";
import {
  RespaldoPorTransformacion,
  type FilaRespaldo,
} from "@/components/transformaciones/respaldo-por-transformacion";
import { AportesAjustes } from "@/components/transformaciones/aportes-ajustes";
import { ClasificacionComentarios } from "@/components/transformaciones/clasificacion-comentarios";
import { NubePalabras } from "@/components/charts/nube-palabras";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { calcularFrecuenciaPalabras } from "@/lib/frecuencia-palabras";
import {
  OPCIONES_RESPALDO,
  TRANSFORMACIONES_MOMENTO4,
  clasificarRespaldo,
  correoIdentifica,
  programasDeGraduado,
  normalizar,
  type OpcionRespaldo,
} from "@/lib/reglas/momento4";
import type { ClusterComentarios, RespuestaMomento4 } from "@/types/momento4";

const TODAS = "__todas__";

/**
 * Etiqueta para las respuestas que dejaron en blanco un campo de clasificación
 * (tipo de actor, unidad regional).
 *
 * Existe por el mismo motivo que "Sin responder u otra" en la escala de
 * respaldo: quien no contestó igual respondió el formulario, y omitirlo del
 * gráfico dejaba las barras sumando 289 mientras la tarjeta decía 290, sin
 * nada que explicara la diferencia. Preferimos que se vea que ese caso existe
 * a que desaparezca del conteo.
 */
const SIN_ESPECIFICAR = "Sin especificar";

const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" });

/**
 * Una fecha ISO como texto legible. Se le pega el mediodía antes de
 * construir el Date: `new Date("2026-08-18")` se interpreta en UTC y en
 * Colombia caería el día anterior.
 */
function formatoFecha(iso: string): string {
  return formatoDiaLargo.format(new Date(`${iso}T12:00:00`));
}

/**
 * Lo que muestra el selector de fechas cerrado. Con dos o más no cabe la
 * lista —"18 de agosto de 2026" ya ocupa el ancho entero—, así que se dice
 * cuántas hay; el detalle está en el desplegable, con sus marcas.
 */
function textoFechas(fechas: string[]): string {
  if (fechas.length === 0) return "Todas";
  if (fechas.length === 1) return formatoFecha(fechas[0]);
  return `${fechas.length} fechas`;
}

/** El valor del campo, o `SIN_ESPECIFICAR` si viene vacío. */
function valorOSinEspecificar(valor: string | null): string {
  return valor?.trim() || SIN_ESPECIFICAR;
}

/**
 * Los programas que menciona una respuesta de graduado, ya unificados. Lista
 * vacía si quien respondió no es graduado: la pregunta solo le aplicaba a
 * ellos, y marcar como "Sin especificar" a los demás —que hicieron bien en
 * dejarla vacía— mezclaría "no respondió" con "no le preguntaron".
 *
 * Un graduado que sí es graduado pero no nombró ninguna carrera reconocible
 * cae en "Sin especificar". Un graduado que nombró varias suma en cada una:
 * por eso las barras pueden sumar más que el número de graduados.
 */
function programasDeGraduadoDe(respuesta: RespuestaMomento4): string[] {
  if (!normalizar(respuesta.tipoActor ?? "").includes("GRADUAD")) return [];
  const programas = programasDeGraduado(respuesta.programaGraduado);
  return programas.length > 0 ? programas : [SIN_ESPECIFICAR];
}

/**
 * Si se muestran las tarjetas de temas sobre los comentarios.
 *
 * Apagado por decisión de presentación, NO porque la función se haya retirado:
 * la clasificación se sigue calculando y guardando en cada cargue, y el filtro
 * por tema sigue funcionando. Poner esto en `true` las devuelve a la pantalla
 * sin ningún otro cambio.
 */
const MOSTRAR_CLASIFICACION_TEMAS = false;

interface Filtros {
  transformacion: string;
  /**
   * Días de la respuesta, en ISO. Lista vacía = todos: se prefiere a una
   * opción "Todas" dentro del desplegable porque, pudiendo elegir varias,
   * "Todas" junto a dos fechas marcadas no querría decir nada.
   */
  fechas: string[];
  tipoActor: string;
  unidadRegional: string;
  /** Programa del graduado, ya estandarizado. */
  programaGraduado: string;
  respaldo: string;
  busqueda: string;
  /** Tema del comentario; null = todos. */
  cluster: number | null;
}

const SIN_FILTROS: Filtros = {
  transformacion: TODAS,
  fechas: [],
  tipoActor: TODAS,
  unidadRegional: TODAS,
  programaGraduado: TODAS,
  respaldo: TODAS,
  busqueda: "",
  cluster: null,
};

export function PanelTransformaciones({
  respuestas,
  clusters,
}: {
  respuestas: RespuestaMomento4[];
  clusters: ClusterComentarios[];
}) {
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  // Las opciones de cada filtro salen de los datos, no de una lista fija: si un
  // export trae una unidad regional nueva, aparece sola en el desplegable.
  const opciones = useMemo(
    () => ({
      // Con `valorOSinEspecificar`, las respuestas que dejaron el campo en
      // blanco quedan agrupadas bajo una opción propia en vez de no ser
      // filtrables por ningún valor.
      // De más reciente a más antigua: al filtrar por día se busca casi
      // siempre la última jornada, no la primera.
      fechas: [
        ...new Set(respuestas.map((r) => r.fechaInicio).filter((f): f is string => Boolean(f))),
      ].sort((a, b) => b.localeCompare(a)),
      tiposActor: valoresUnicos(respuestas.map((r) => valorOSinEspecificar(r.tipoActor))),
      unidadesRegionales: valoresUnicos(
        respuestas.map((r) => valorOSinEspecificar(r.unidadRegional))
      ),
      // Ya unificados: en el Excel el mismo programa viene escrito de varias
      // formas, y sin estandarizar el desplegable ofrecería la misma carrera
      // repetida tres o cuatro veces.
      programasGraduado: valoresUnicos(respuestas.flatMap(programasDeGraduadoDe)),
      // Las tres opciones del formulario van siempre, aunque alguna tenga cero:
      // son una escala fija y quitarlas haría parecer que no existen. La cuarta
      // ("Sin responder u otra") es un cajón de sastre para valores
      // inesperados, así que solo aparece si de verdad hay alguna respuesta que
      // caiga ahí — de lo contrario sería una opción que no filtra nada.
      respaldo: OPCIONES_RESPALDO.filter(
        (opcion) =>
          opcion.id !== "otra" ||
          respuestas.some((r) => clasificarRespaldo(r.respondeNecesidad) === "otra")
      ),
    }),
    // Se calcula sobre TODAS las respuestas, no sobre las filtradas: si
    // dependiera del filtro activo, elegir una opción haría desaparecer a las
    // demás del desplegable.
    [respuestas]
  );

  const filtradas = useMemo(() => {
    const busqueda = normalizar(filtros.busqueda);
    return respuestas.filter((r) => {
      if (filtros.transformacion !== TODAS && r.transformacion !== filtros.transformacion) {
        return false;
      }
      if (
        filtros.fechas.length > 0 &&
        (r.fechaInicio === null || !filtros.fechas.includes(r.fechaInicio))
      ) {
        return false;
      }
      if (filtros.tipoActor !== TODAS && valorOSinEspecificar(r.tipoActor) !== filtros.tipoActor) {
        return false;
      }
      if (
        filtros.unidadRegional !== TODAS &&
        valorOSinEspecificar(r.unidadRegional) !== filtros.unidadRegional
      ) {
        return false;
      }
      if (
        filtros.programaGraduado !== TODAS &&
        !programasDeGraduadoDe(r).includes(filtros.programaGraduado)
      ) {
        return false;
      }
      if (filtros.respaldo !== TODAS && clasificarRespaldo(r.respondeNecesidad) !== filtros.respaldo) {
        return false;
      }
      if (filtros.cluster !== null && r.cluster !== filtros.cluster) return false;
      if (busqueda) {
        // Se busca sobre nombre, correo y el aporte abierto: es donde alguien
        // buscaría a una persona concreta o un tema mencionado.
        const texto = normalizar(`${r.nombre ?? ""} ${r.correo ?? ""} ${r.ajustes ?? ""}`);
        if (!texto.includes(busqueda)) return false;
      }
      return true;
    });
  }, [respuestas, filtros]);

  const metricas = useMemo(() => calcularMetricas(filtradas), [filtradas]);

  // Se calcula sobre lo FILTRADO: al elegir un tema, una sede o una
  // transformación, la nube muestra el vocabulario de ese recorte y no el del
  // total, que es lo que hace útil mirarla junto a los filtros.
  const nube = useMemo(() => {
    const textos = filtradas
      .map((r) => r.ajustes)
      .filter((t): t is string => Boolean(t && t.trim()));
    return {
      // Con pocos comentarios, exigir que una palabra se repita dejaría la nube
      // vacía; el umbral baja a 1 cuando el recorte es pequeño.
      palabras: calcularFrecuenciaPalabras(textos, {
        maxPalabras: 45,
        frecuenciaMinima: textos.length >= 15 ? 2 : 1,
      }),
      total: textos.length,
    };
  }, [filtradas]);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  function actualizar(campo: keyof Filtros, valor: string) {
    setFiltros((previos) => ({ ...previos, [campo]: valor }));
  }

  function elegirTema(cluster: number | null) {
    setFiltros((previos) => ({ ...previos, cluster }));
  }

  /** Click en una barra: alterna ese valor como filtro. */
  function alternar(campo: keyof Filtros, valor: string) {
    setFiltros((previos) => ({
      ...previos,
      [campo]: previos[campo] === valor ? TODAS : valor,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros: una sola fila sobre los gráficos, para que se vea de entrada
          qué recorte se está mirando. */}
      <Card className="gap-0 border-border/70 py-3">
        <CardContent className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Transformación">
            <Select
              value={filtros.transformacion}
              onValueChange={(v) => actualizar("transformacion", v ?? TODAS)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todas">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">
                      {textoSeleccion(v, "Todas", ETIQUETAS_TRANSFORMACION)}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {TRANSFORMACIONES_MOMENTO4.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {/* Solo si hay más de un día: con una sola jornada, el desplegable
              ofrecería una opción que no recorta nada. */}
          {opciones.fechas.length > 1 ? (
            <Campo etiqueta="Fecha">
              {/* Admite varias: es normal querer ver dos jornadas juntas sin
                  tener que mirarlas de a una o pasar al total. */}
              <Select
                multiple
                value={filtros.fechas}
                onValueChange={(v) => setFiltros((previos) => ({ ...previos, fechas: v ?? [] }))}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todas">
                    {(v: string[] | null) => (
                      <span className="min-w-0 truncate">{textoFechas(v ?? [])}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {opciones.fechas.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {formatoFecha(valor)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          ) : null}

          <Campo etiqueta="Tipo de actor">
            <Select
              value={filtros.tipoActor}
              onValueChange={(v) => actualizar("tipoActor", v ?? TODAS)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todos">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{textoSeleccion(v, "Todos")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todos</SelectItem>
                {opciones.tiposActor.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo etiqueta="Unidad Regional">
            <Select
              value={filtros.unidadRegional}
              onValueChange={(v) => actualizar("unidadRegional", v ?? TODAS)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{textoSeleccion(v, "Todas")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {opciones.unidadesRegionales.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {/* Solo si alguien respondió la pregunta: la contestan únicamente
              los graduados, y en un recorte sin ninguno el desplegable
              quedaría vacío ofreciendo un filtro que no filtra nada. */}
          {opciones.programasGraduado.length > 0 ? (
            <Campo etiqueta="Programa del graduado">
              <Select
                value={filtros.programaGraduado}
                onValueChange={(v) => actualizar("programaGraduado", v ?? TODAS)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Todos">
                    {(v: string | null) => (
                      <span className="min-w-0 truncate">{textoSeleccion(v, "Todos")}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos</SelectItem>
                  {opciones.programasGraduado.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {valor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          ) : null}

          <Campo etiqueta="¿Responde a lo que se necesita?">
            <Select
              value={filtros.respaldo}
              onValueChange={(v) => actualizar("respaldo", v ?? TODAS)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todas">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">
                      {textoSeleccion(v, "Todas", ETIQUETAS_RESPALDO)}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {opciones.respaldo.map((opcion) => (
                  <SelectItem key={opcion.id} value={opcion.id}>
                    {opcion.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo etiqueta="Buscar">
            <Input
              value={filtros.busqueda}
              onChange={(evento) => actualizar("busqueda", evento.target.value)}
              placeholder="Nombre, correo o aporte"
              className="w-56"
            />
          </Campo>

          {hayFiltros ? (
            <Button variant="ghost" size="sm" onClick={() => setFiltros(SIN_FILTROS)}>
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          ) : null}

          <Badge variant="secondary" className="ml-auto">
            {formatNumero(filtradas.length)} de {formatNumero(respuestas.length)} respuestas
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard etiqueta="Respuestas" valor={formatNumero(filtradas.length)} icono={MessageSquareQuote} />
        <KpiCard
          etiqueta="Participantes únicos"
          valor={formatNumero(metricas.participantes)}
          detalle={
            metricas.anonimos > 0
              ? `Correos distintos y ${formatNumero(metricas.anonimos)} anónimas`
              : "Correos distintos"
          }
          icono={Users2}
        />
        <KpiCard
          etiqueta="Responde a lo que se necesita"
          valor={metricas.total > 0 ? formatPorcentaje(metricas.porcentajeSi) : "—"}
          detalle={`${formatNumero(metricas.conteos.si)} respondieron “Sí”`}
          icono={ThumbsUp}
        />
        <KpiCard
          etiqueta="Ajustes propuestos"
          valor={formatNumero(metricas.conAporte)}
          detalle="Respuestas con texto abierto"
          icono={MessageSquareQuote}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>¿La transformación responde a lo que se necesita?</CardTitle>
          </CardHeader>
          <CardContent>
            <DistribucionRespaldo conteos={metricas.conteos} />
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Respaldo por transformación</CardTitle>
          </CardHeader>
          <CardContent>
            <RespaldoPorTransformacion filas={metricas.porTransformacion} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart
              titulo="Participación por tipo de actor"
              datos={metricas.porTipoActor}
              onSeleccionarBarra={(etiqueta) => alternar("tipoActor", etiqueta)}
              etiquetaSeleccionada={filtros.tipoActor === TODAS ? null : filtros.tipoActor}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart
              titulo="Participación por Unidad Regional"
              datos={metricas.porUnidadRegional}
              onSeleccionarBarra={(etiqueta) => alternar("unidadRegional", etiqueta)}
              etiquetaSeleccionada={
                filtros.unidadRegional === TODAS ? null : filtros.unidadRegional
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Solo cuando hay graduados en el recorte: la pregunta es exclusiva
          suya, y una tarjeta vacía en el resto de recortes daría a entender
          que falta un dato que nunca se pidió. */}
      {metricas.porProgramaGraduado.length > 0 ? (
        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart
              titulo="Programa de los graduados que participaron"
              datos={metricas.porProgramaGraduado}
              onSeleccionarBarra={(etiqueta) => alternar("programaGraduado", etiqueta)}
              etiquetaSeleccionada={
                filtros.programaGraduado === TODAS ? null : filtros.programaGraduado
              }
              truncarEn={54}
              coberturaColapsada={0.8}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>¿Qué ajustarían en esta transformación?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {MOSTRAR_CLASIFICACION_TEMAS ? (
            <ClasificacionComentarios
              clusters={clusters}
              seleccionado={filtros.cluster}
              onSeleccionar={elegirTema}
              totalComentarios={clusters.reduce((suma, c) => suma + c.total, 0)}
            />
          ) : null}
          {nube.palabras.length > 0 ? (
            <NubePalabras
              palabras={nube.palabras}
              totalRespuestas={nube.total}
              titulo="Lo que más se repite en los comentarios"
              descripcion={`Palabras más frecuentes en los ${formatNumero(nube.total)} comentarios del recorte seleccionado.`}
            />
          ) : null}

          <AportesAjustes respuestas={filtradas} />
        </CardContent>
      </Card>

    </div>
  );
}

/**
 * Texto que muestra un selector cerrado. Hace falta porque el componente
 * pinta el VALOR crudo, no la etiqueta del ítem elegido: sin esto se leería
 * "__todas__" o "uc-digital" en vez de "Todas" o "UC DIGITAL".
 */
function textoSeleccion(
  valor: string | null,
  siTodas: string,
  etiquetas?: Map<string, string>
): string {
  if (!valor || valor === TODAS) return siTodas;
  return etiquetas?.get(valor) ?? valor;
}

const ETIQUETAS_TRANSFORMACION = new Map<string, string>(
  TRANSFORMACIONES_MOMENTO4.map((t) => [t.id as string, t.etiqueta as string])
);
const ETIQUETAS_RESPALDO = new Map<string, string>(
  OPCIONES_RESPALDO.map((o) => [o.id as string, o.etiqueta as string])
);

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{etiqueta}</span>
      {children}
    </label>
  );
}

/** Valores presentes, sin vacíos ni repetidos y en orden alfabético. */
function valoresUnicos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

function calcularMetricas(respuestas: RespuestaMomento4[]) {
  const conteos: Record<OpcionRespaldo, number> = { si: 0, parcialmente: 0, no: 0, otra: 0 };
  const porTransformacion = new Map<string, FilaRespaldo>();
  const porTipoActor = new Map<string, number>();
  const porUnidadRegional = new Map<string, number>();
  const porProgramaGraduado = new Map<string, number>();
  const correos = new Set<string>();
  let anonimos = 0;
  let conAporte = 0;

  for (const respuesta of respuestas) {
    const respaldo = clasificarRespaldo(respuesta.respondeNecesidad);
    conteos[respaldo] += 1;

    const fila = porTransformacion.get(respuesta.transformacion) ?? {
      transformacion: respuesta.transformacion,
      etiqueta: respuesta.etiqueta,
      total: 0,
      conteos: { si: 0, parcialmente: 0, no: 0, otra: 0 },
    };
    fila.total += 1;
    fila.conteos[respaldo] += 1;
    porTransformacion.set(respuesta.transformacion, fila);

    // Se cuentan TODAS las respuestas, también las que dejaron el campo en
    // blanco: si se saltaran, las barras sumarían menos que el total y nadie
    // sabría a qué se debe la diferencia.
    const actor = valorOSinEspecificar(respuesta.tipoActor);
    porTipoActor.set(actor, (porTipoActor.get(actor) ?? 0) + 1);

    const unidad = valorOSinEspecificar(respuesta.unidadRegional);
    porUnidadRegional.set(unidad, (porUnidadRegional.get(unidad) ?? 0) + 1);
    // Solo las respuestas de graduados entran aquí: para el resto la pregunta
    // no aplicaba (ver programasDeGraduadoDe). Un combo suma en cada carrera
    // que nombra, así que estas barras pueden sumar más que el nº de graduados.
    for (const programa of programasDeGraduadoDe(respuesta)) {
      porProgramaGraduado.set(programa, (porProgramaGraduado.get(programa) ?? 0) + 1);
    }

    // Las respuestas anónimas no traen un correo que las distinga (Forms
    // escribe "anonymous" en todas), así que cada una cuenta como un
    // participante en vez de fundirse en uno solo: es lo mismo que hace la
    // deduplicación al cargar, y de lo contrario 47 personas figurarían como 1.
    if (correoIdentifica(respuesta.correo)) correos.add(respuesta.correo!.toLowerCase());
    else anonimos += 1;
    if (respuesta.ajustes && respuesta.ajustes.trim()) conAporte += 1;
  }

  const total = respuestas.length;

  return {
    total,
    conteos,
    conAporte,
    participantes: correos.size + anonimos,
    anonimos,
    porcentajeSi: total > 0 ? (conteos.si / total) * 100 : 0,
    // El orden de las 5 transformaciones es fijo (el de las reglas) y no por
    // tamaño: así una barra no cambia de sitio al mover un filtro.
    porTransformacion: TRANSFORMACIONES_MOMENTO4.map(
      (t) =>
        porTransformacion.get(t.id) ?? {
          transformacion: t.id,
          etiqueta: t.etiqueta,
          total: 0,
          conteos: { si: 0, parcialmente: 0, no: 0, otra: 0 },
        }
    ).filter((fila) => fila.total > 0),
    porTipoActor: aDatosBarra(porTipoActor, total),
    porUnidadRegional: aDatosBarra(porUnidadRegional, total),
    // El porcentaje se calcula sobre el nº de graduados que respondieron la
    // pregunta (uno por respuesta, aunque nombre varias carreras), no sobre el
    // total ni sobre la suma de menciones: así se lee como "% de graduados que
    // mencionan esta carrera" y una barra puede pasar de 100% si hubo combos.
    porProgramaGraduado: aDatosBarra(
      porProgramaGraduado,
      respuestas.filter((r) => programasDeGraduadoDe(r).length > 0).length
    ),
  };
}

function aDatosBarra(conteos: Map<string, number>, total: number) {
  return [...conteos.entries()].map(([etiqueta, conteo]) => ({
    etiqueta,
    conteo,
    porcentaje: total > 0 ? (conteo / total) * 100 : 0,
  }));
}
