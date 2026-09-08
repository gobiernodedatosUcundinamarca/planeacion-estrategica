"use client";

import { useMemo, useState } from "react";
import { Building2, GraduationCap, MapPinned, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/kpi/kpi-card";
import { RankedBarChart } from "@/components/charts/ranked-bar-chart";
import { SerieTemporal, type PuntoSerie } from "@/components/charts/serie-temporal";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import {
  CAMPOS_FILTRO_UNIFICADO,
  CAMPOS_UNIDAD_REGIONAL,
  estandarizarDependencia,
  estandarizarUnidadRegional,
} from "@/lib/reglas/participacion";
import type { RegistroParticipacion } from "@/types/participacion";

const TODAS = "__todas__";

/**
 * Etiqueta para las filas que no traen rol, unidad o dependencia.
 *
 * Sin ella esas filas desaparecían de los gráficos y de los desplegables: las
 * barras de unidad regional sumaban 470 sobre 478 asistentes, sin nada que
 * explicara los 8 que faltaban. Es el mismo criterio que sigue la sección de
 * resultados de encuestas.
 */
const SIN_ESPECIFICAR = "Sin especificar";

interface Filtros {
  /**
   * Jornadas elegidas, en ISO. Lista vacía = todas: se prefiere a una opción
   * "Todas" dentro del desplegable porque, pudiendo marcar varias, "Todas"
   * junto a dos fechas señaladas no querría decir nada.
   */
  fechas: string[];
  rol: string;
  unidadRegional: string;
  /** Programa, facultad, coordinación o área: un solo valor entre los cuatro. */
  adscripcion: string;
}

const SIN_FILTROS: Filtros = {
  fechas: [],
  rol: TODAS,
  unidadRegional: TODAS,
  adscripcion: TODAS,
};

const formatoDiaCorto = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" });
const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" });

/**
 * La unidad regional del asistente: la primera columna (estudiante, docente o
 * trabajador) que nombre una sede reconocida, ya estandarizada por
 * `estandarizarUnidadRegional`.
 *
 * Solo se aceptan las unidades reales de la UCundinamarca (más Bogotá). La
 * columna del Excel a veces trae el programa o la facultad en su lugar
 * —"ENFERMERIA", "ADMINISTRACION DEL MEDIO AMBIENTE"—; esas filas caen en
 * "Sin especificar" en vez de aparecer como una sede inexistente.
 */
function unidadRegionalDe(r: RegistroParticipacion): string {
  for (const campo of CAMPOS_UNIDAD_REGIONAL) {
    const unidad = estandarizarUnidadRegional(r[campo]);
    if (unidad) return unidad;
  }
  return SIN_ESPECIFICAR;
}

/**
 * A qué dependencia pertenece el asistente (programa, facultad, coordinación o
 * área), ya estandarizada: sin la promoción ni la sede pegadas al nombre, que
 * es lo que hacía aparecer un mismo programa como varias entradas distintas.
 */
function adscripcionesDe(r: RegistroParticipacion): string[] {
  const valores = CAMPOS_FILTRO_UNIFICADO.map((campo) => estandarizarDependencia(r[campo]));
  // Un docente puede traer facultad y coordinación con el mismo nombre; sin
  // quitar repetidos, esa fila contaría dos veces en su propia barra.
  const unicas = [...new Set(valores.filter((v): v is string => Boolean(v)))];
  // Quien no trae ninguna sigue siendo un asistente: se le agrupa en vez de
  // dejarlo fuera de todo filtro.
  return unicas.length > 0 ? unicas : [SIN_ESPECIFICAR];
}

export function PanelParticipacion({ registros }: { registros: RegistroParticipacion[] }) {
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  // Las opciones salen de los datos y sobre el total, no sobre lo filtrado: si
  // dependieran del filtro activo, elegir una opción haría desaparecer las
  // demás del desplegable.
  const opciones = useMemo(
    () => ({
      // De más reciente a más antigua: al filtrar por jornada se busca casi
      // siempre la última, no la primera.
      fechas: [
        ...new Set(registros.map((r) => r.fechaInicio).filter((f): f is string => Boolean(f))),
      ].sort((a, b) => b.localeCompare(a)),
      roles: valoresUnicos(registros.map((r) => r.rol?.trim() || SIN_ESPECIFICAR)),
      unidadesRegionales: valoresUnicos(registros.map(unidadRegionalDe)),
      adscripciones: valoresUnicos(registros.flatMap(adscripcionesDe)),
    }),
    [registros]
  );

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (
        filtros.fechas.length > 0 &&
        (r.fechaInicio === null || !filtros.fechas.includes(r.fechaInicio))
      ) {
        return false;
      }
      if (filtros.rol !== TODAS && (r.rol?.trim() || SIN_ESPECIFICAR) !== filtros.rol) return false;
      if (filtros.unidadRegional !== TODAS && unidadRegionalDe(r) !== filtros.unidadRegional) {
        return false;
      }
      if (filtros.adscripcion !== TODAS && !adscripcionesDe(r).includes(filtros.adscripcion)) {
        return false;
      }
      return true;
    });
  }, [registros, filtros]);

  const metricas = useMemo(() => calcularMetricas(filtrados), [filtrados]);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  // Los filtros de un solo valor. `fechas` queda fuera a propósito: guarda una
  // lista, y con la clave suelta se le podría asignar un texto sin que el tipo
  // lo impidiera.
  type CampoSimple = Exclude<keyof Filtros, "fechas">;

  function actualizar(campo: CampoSimple, valor: string) {
    setFiltros((previos) => ({ ...previos, [campo]: valor }));
  }

  /** Click en una barra: alterna ese valor como filtro. */
  function alternar(campo: CampoSimple, valor: string) {
    setFiltros((previos) => ({
      ...previos,
      [campo]: previos[campo] === valor ? TODAS : valor,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 border-border/70 py-3">
        <CardContent className="flex flex-wrap items-end gap-3">
          {/* Solo si hay más de una jornada: con una sola, el desplegable
              ofrecería una opción que no recorta nada. */}
          {opciones.fechas.length > 1 ? (
            <Campo etiqueta="Fecha">
              {/* Admite varias: comparar dos jornadas es lo natural aquí, y con
                  selección simple habría que mirarlas de a una o ir al total. */}
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
                      {formatoDiaLargo.format(new Date(`${valor}T12:00:00`))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          ) : null}

          <Campo etiqueta="Rol">
            <Select value={filtros.rol} onValueChange={(v) => actualizar("rol", v ?? TODAS)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todos">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{textoSeleccion(v, "Todos")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todos</SelectItem>
                {opciones.roles.map((valor) => (
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
              <SelectTrigger className="w-72">
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

          <Campo etiqueta="Programa, facultad, coordinación o área">
            <Select
              value={filtros.adscripcion}
              onValueChange={(v) => actualizar("adscripcion", v ?? TODAS)}
            >
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Todas">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{textoSeleccion(v, "Todas")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {opciones.adscripciones.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {valor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {hayFiltros ? (
            <Button variant="ghost" size="sm" onClick={() => setFiltros(SIN_FILTROS)}>
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          ) : null}

          <Badge variant="secondary" className="ml-auto">
            {formatNumero(filtrados.length)} de {formatNumero(registros.length)} registros
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          etiqueta="Asistentes registrados"
          valor={formatNumero(filtrados.length)}
          detalle={
            metricas.jornadas === 0
              ? "Sin fecha registrada"
              : metricas.jornadas === 1
                ? "En 1 jornada de territorio"
                : `En ${formatNumero(metricas.jornadas)} jornadas de territorio`
          }
          icono={UserCheck}
        />
        <KpiCard
          etiqueta="Unidades regionales"
          valor={formatNumero(metricas.unidadesRegionales)}
          detalle="Sedes, seccionales y extensiones"
          icono={MapPinned}
        />
        <KpiCard
          etiqueta="Programas, facultades y áreas"
          valor={formatNumero(metricas.adscripciones)}
          detalle="Dependencias representadas"
          icono={Building2}
        />
        {/* El número grande es el porcentaje y no el nombre del rol: la tarjeta
            usa tipografía de cifra, y un rol largo ("SIN VINCULACION ACTIVA")
            se desbordaría. El nombre va en el detalle, donde cabe. */}
        <KpiCard
          etiqueta="Rol con más asistencia"
          valor={
            metricas.rolMayoritario ? formatPorcentaje(metricas.rolMayoritario.porcentaje) : "—"
          }
          detalle={
            metricas.rolMayoritario
              ? `${metricas.rolMayoritario.etiqueta} · ${formatNumero(metricas.rolMayoritario.conteo)} de ${formatNumero(filtrados.length)}`
              : "Sin rol registrado"
          }
          icono={GraduationCap}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Asistencia en el tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Con una sola fecha no hay evolución que dibujar: una curva de un
                único punto se ve como un gráfico roto, así que se dice el dato
                en palabras. */}
            {metricas.serieFechas.length > 1 ? (
              <SerieTemporal datos={metricas.serieFechas} nombreValor="asistentes" />
            ) : metricas.serieFechas.length === 1 ? (
              <div className="flex h-52 flex-col items-center justify-center gap-1 text-center">
                <p className="font-heading text-3xl font-bold tabular-nums text-foreground">
                  {formatNumero(metricas.serieFechas[0].valor)}
                </p>
                <p className="text-sm text-muted-foreground">
                  asistentes el{" "}
                  {formatoDiaLargo.format(new Date(`${metricas.serieFechas[0].fecha}T12:00:00`))}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ninguno de los registros del recorte trae una fecha de inicio reconocible.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart
              titulo="Participación por rol"
              datos={metricas.porRol}
              onSeleccionarBarra={(etiqueta) => alternar("rol", etiqueta)}
              etiquetaSeleccionada={filtros.rol === TODAS ? null : filtros.rol}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart
              titulo="Participación por Unidad Regional"
              datos={metricas.porUnidadRegional}
              onSeleccionarBarra={(etiqueta) => alternar("unidadRegional", etiqueta)}
              etiquetaSeleccionada={
                filtros.unidadRegional === TODAS ? null : filtros.unidadRegional
              }
              truncarEn={30}
            />
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent>
            <RankedBarChart titulo="Distribución por edad" datos={metricas.porRangoEdad} ocultarAccion />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardContent>
          {/* A ancho completo: los nombres de facultad y área son largos y en
              media tarjeta quedarían cortados hasta ser indistinguibles.

              `truncarEn` va holgado (70) y no ajustado al nombre más largo
              —59 caracteres— porque el eje reserva `truncarEn × 6` píxeles y
              estos nombres, en mayúsculas, ocupan cerca de 6,5 por carácter:
              con el valor justo, la primera palabra se recortaba y "FACULTAD"
              se leía "JLTAD". */}
          <RankedBarChart
            titulo="Participación por programa, facultad, coordinación o área"
            datos={metricas.porAdscripcion}
            onSeleccionarBarra={(etiqueta) => alternar("adscripcion", etiqueta)}
            etiquetaSeleccionada={filtros.adscripcion === TODAS ? null : filtros.adscripcion}
            truncarEn={70}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{etiqueta}</span>
      {children}
    </label>
  );
}

function textoSeleccion(valor: string | null, siTodas: string): string {
  return !valor || valor === TODAS ? siTodas : valor;
}

/**
 * Lo que muestra el selector de fechas cerrado. Con dos o más no cabe la
 * lista —"31 de agosto de 2026" ya ocupa el ancho del campo—, así que se dice
 * cuántas hay; cuáles están marcadas se ve al abrirlo.
 */
function textoFechas(fechas: string[]): string {
  if (fechas.length === 0) return "Todas";
  if (fechas.length === 1) return formatoDiaLargo.format(new Date(`${fechas[0]}T12:00:00`));
  return `${fechas.length} fechas`;
}

function valoresUnicos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => Boolean(v && v.trim())))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

const RANGOS_EDAD: { etiqueta: string; min: number; max: number }[] = [
  { etiqueta: "Hasta 20", min: 0, max: 20 },
  { etiqueta: "21-30", min: 21, max: 30 },
  { etiqueta: "31-40", min: 31, max: 40 },
  { etiqueta: "41-50", min: 41, max: 50 },
  { etiqueta: "51-60", min: 51, max: 60 },
  { etiqueta: "61 o más", min: 61, max: Infinity },
];

/** Cuántas entradas se pintan en el gráfico de adscripción. */
const TOPE_ADSCRIPCIONES = 15;

function calcularMetricas(registros: RegistroParticipacion[]) {
  const porRolMapa = new Map<string, number>();
  const porUnidadMapa = new Map<string, number>();
  const porAdscripcionMapa = new Map<string, number>();
  const porFechaMapa = new Map<string, number>();
  const porRangoEdadMapa = new Map<string, number>();
  let conEdad = 0;

  for (const r of registros) {
    // Se cuentan TODAS las filas, también las que no traen el dato: si se
    // saltaran, las barras sumarían menos que los asistentes registrados y
    // nadie sabría a qué se debe la diferencia.
    const rol = r.rol?.trim() || SIN_ESPECIFICAR;
    porRolMapa.set(rol, (porRolMapa.get(rol) ?? 0) + 1);

    const unidad = unidadRegionalDe(r);
    porUnidadMapa.set(unidad, (porUnidadMapa.get(unidad) ?? 0) + 1);

    // Una persona puede aportar a varias (un docente trae facultad Y
    // coordinación), así que estos conteos suman más que el total de filas:
    // es un conteo de menciones, no de personas.
    for (const adscripcion of adscripcionesDe(r)) {
      porAdscripcionMapa.set(adscripcion, (porAdscripcionMapa.get(adscripcion) ?? 0) + 1);
    }

    if (r.fechaInicio) porFechaMapa.set(r.fechaInicio, (porFechaMapa.get(r.fechaInicio) ?? 0) + 1);

    if (r.edad !== null) {
      conEdad += 1;
      const rango = RANGOS_EDAD.find((rg) => r.edad! >= rg.min && r.edad! <= rg.max);
      if (rango) porRangoEdadMapa.set(rango.etiqueta, (porRangoEdadMapa.get(rango.etiqueta) ?? 0) + 1);
    }
  }

  const total = registros.length;

  const porRol = aDatosBarra(porRolMapa, total);
  const rolMayoritario = [...porRol].sort((a, b) => b.conteo - a.conteo)[0] ?? null;

  const serieFechas: PuntoSerie[] = [...porFechaMapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, valor]) => ({
      fecha,
      etiqueta: formatoDiaCorto.format(new Date(`${fecha}T12:00:00`)),
      valor,
    }));

  // Las tarjetas cuentan solo lo que existe de verdad: "Sin especificar"
  // agrupa a quienes no lo dijeron, y sumarlo daría una sede o una dependencia
  // de más de las que hay. En los gráficos sí aparece, porque ahí lo que
  // importa es que las barras sumen el total de asistentes.
  const cuantosReales = (mapa: Map<string, number>) =>
    mapa.size - (mapa.has(SIN_ESPECIFICAR) ? 1 : 0);

  return {
    jornadas: porFechaMapa.size,
    unidadesRegionales: cuantosReales(porUnidadMapa),
    adscripciones: cuantosReales(porAdscripcionMapa),
    rolMayoritario,
    serieFechas,
    porRol,
    porUnidadRegional: aDatosBarra(porUnidadMapa, total),
    // Se recortan las más numerosas: con muchas dependencias el gráfico
    // completo se vuelve ilegible y lo que interesa de un vistazo son las que
    // más pesan. El desplegable sigue ofreciéndolas todas.
    porAdscripcion: [...porAdscripcionMapa.entries()]
      .map(([etiqueta, conteo]) => ({
        etiqueta,
        conteo,
        porcentaje: total > 0 ? (conteo / total) * 100 : 0,
      }))
      .sort((a, b) => b.conteo - a.conteo)
      .slice(0, TOPE_ADSCRIPCIONES),
    porRangoEdad: RANGOS_EDAD.map((rg) => ({
      etiqueta: rg.etiqueta,
      conteo: porRangoEdadMapa.get(rg.etiqueta) ?? 0,
      porcentaje: conEdad > 0 ? ((porRangoEdadMapa.get(rg.etiqueta) ?? 0) / conEdad) * 100 : 0,
    })).filter((r) => r.conteo > 0),
  };
}

function aDatosBarra(conteos: Map<string, number>, total: number) {
  return [...conteos.entries()].map(([etiqueta, conteo]) => ({
    etiqueta,
    conteo,
    porcentaje: total > 0 ? (conteo / total) * 100 : 0,
  }));
}
