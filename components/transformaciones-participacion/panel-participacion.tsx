"use client";


import {TextoEditorial,TextoDeCatalogo} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { GraduationCap, MapPinned, UserCheck, X } from "lucide-react";
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
  SIN_ESPECIFICAR,
  adscripcionesDe,
  etiquetaRol,
  unidadRegionalDe,
} from "@/lib/reglas/participacion";
import type { RegistroParticipacion } from "@/types/participacion";

const TODAS = "__todas__";

interface Filtros {
  /**
   * Jornadas elegidas, en ISO. Lista vacía = todas: se prefiere a una opción
   * "Todas" dentro del desplegable porque, pudiendo marcar varias, "Todas"
   * junto a dos fechas señaladas no querría decir nada.
   */
  fechas: string[];
  rol: string[];
  unidadRegional: string;
  /** Programa, facultad, coordinación o área: un solo valor entre los cuatro. */
  adscripcion: string;
  /** Ciudad donde se hizo el evento (Ubaté, Zipaquirá, Girardot, Soacha…). */
  lugarDesarrollo: string;
}

const SIN_FILTROS: Filtros = {
  fechas: [],
  rol: [],
  unidadRegional: TODAS,
  adscripcion: TODAS,
  lugarDesarrollo: TODAS,
};

const formatoDiaCorto = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" });
const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" });

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
      roles: valoresUnicos(registros.map((r) => etiquetaRol(r.rol))),
      unidadesRegionales: valoresUnicos(registros.map(unidadRegionalDe)),
      adscripciones: valoresUnicos(registros.flatMap(adscripcionesDe)),
      lugares: valoresUnicos(registros.map((r) => r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR)),
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
      if (filtros.rol.length && !filtros.rol.includes(etiquetaRol(r.rol))) return false;
      if (filtros.unidadRegional !== TODAS && unidadRegionalDe(r) !== filtros.unidadRegional) {
        return false;
      }
      if (filtros.adscripcion !== TODAS && !adscripcionesDe(r).includes(filtros.adscripcion)) {
        return false;
      }
      if (
        filtros.lugarDesarrollo !== TODAS &&
        (r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR) !== filtros.lugarDesarrollo
      ) {
        return false;
      }
      return true;
    });
  }, [registros, filtros]);

  const metricas = useMemo(() => calcularMetricas(filtrados), [filtrados]);
  const [consulta, setConsulta] = useState("");
  const [limite, setLimite] = useState(25);
  const detalle = filtrados.filter(r => JSON.stringify([r.fechaInicio,r.lugarDesarrollo,etiquetaRol(r.rol),unidadRegionalDe(r),...adscripcionesDe(r)]).toLocaleLowerCase().includes(consulta.toLocaleLowerCase()));
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  // Fechas y roles guardan listas; los otros filtros conservan un único valor.
  type CampoSimple = Exclude<keyof Filtros, "fechas" | "rol">;

  function actualizar(campo: CampoSimple, valor: string) {
    setFiltros((previos) => ({ ...previos, [campo]: valor }));
  }

  /** Click en una barra: alterna ese valor como filtro. */
  function alternar(campo: CampoSimple | 'rol', valor: string) {
    if (campo === 'rol') {
      setFiltros(previos => ({ ...previos, rol: previos.rol.includes(valor)
        ? previos.rol.filter(rol => rol !== valor) : [...previos.rol, valor] }));
      return;
    }
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

          {/* Solo si hay más de un lugar: con uno solo el desplegable no
              recortaría nada. */}
          {opciones.lugares.length > 1 ? (
            <Campo etiqueta="Lugar de desarrollo">
              <Select
                value={filtros.lugarDesarrollo}
                onValueChange={(v) => actualizar("lugarDesarrollo", v ?? TODAS)}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos">
                    {(v: string | null) => (
                      <span className="min-w-0 truncate">{textoSeleccion(v, "Todos")}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODAS}>Todos</SelectItem>
                  {opciones.lugares.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {valor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          ) : null}

          <Campo etiqueta="Rol">
            <Select multiple value={filtros.rol} onValueChange={(v) => setFiltros(previos => ({ ...previos, rol: v ?? [] }))}>
              <SelectTrigger className="w-52" aria-label="Rol">
                <SelectValue placeholder="Todos">
                  {(v: string[] | null) => (
                    <span className="min-w-0 truncate">{!v?.length ? 'Todos' : v.length === 1 ? v[0] : `${v.length} roles seleccionados`}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
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

      <div className="grid grid-cols-3 gap-4">
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

      <div className="titulo-seccion"><div><p className="eyebrow"><TextoEditorial id="971c530ca34fc252c6ce" original={"DISTRIBUCIÓN Y EVOLUCIÓN"}/></p><h2><TextoEditorial id="124dc9df5124dc9841d5" original={"Las voces que estuvieron presentes"}/></h2></div></div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle><TextoDeCatalogo texto="Asistencia en el tiempo"/></CardTitle>
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
                  <TextoEditorial id="029cbe1c8c4dd03b7eb9" original={"asistentes el"}/>{" "}
                  {formatoDiaLargo.format(new Date(`${metricas.serieFechas[0].fecha}T12:00:00`))}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                <TextoEditorial id="6fde8adb2d92f9b64ed5" original={"No hay fechas de inicio disponibles para los registros seleccionados."}/>
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
              etiquetaSeleccionada={filtros.rol.length === 1 ? filtros.rol[0] : null}
              // Con el default (26) el eje reserva 156 px y "CREADORES DE
              // OPORTUNIDADES" en mayúsculas ocupa ~185: se cortaba por la
              // izquierda. 38 reserva 228 px y deja "GESTORES DEL CONOCIMIENTO
              // Y EL" (la línea más larga de su nombre) completa.
              truncarEn={38}
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
            <RankedBarChart titulo="Distribución por edad" datos={metricas.porRangoEdad} />
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
      <Card><CardHeader><CardTitle><TextoDeCatalogo texto="Detalle de los registros de asistencia"/></CardTitle></CardHeader><CardContent>
        <label><TextoEditorial id="e66ed419a50cc1e2f98d" original={"Buscar por fecha, lugar, rol, unidad o dependencia"}/><input value={consulta} onChange={e=>{setConsulta(e.target.value);setLimite(25)}} placeholder="Buscar en los registros seleccionados" className="my-3 w-full rounded-lg border p-3"/></label>
        <p className="text-xs text-muted-foreground">{detalle.length.toLocaleString('es-CO')} <TextoEditorial id="cd8ea56d370f1c9ed70b" original={"registros coincidentes. Una persona puede registrar asistencia en varias jornadas."}/></p>
        <div className="overflow-auto" tabIndex={0} role="region" aria-label="Registros de asistencia con desplazamiento horizontal"><table><thead><tr><th><TextoEditorial id="597e92baa6160630e71d" original={"Registro"}/></th><th><TextoEditorial id="9a73d3b22d84337c1a10" original={"Fecha"}/></th><th><TextoEditorial id="cf2816548472b9eacdab" original={"Lugar"}/></th><th><TextoEditorial id="f9940728b543cca2165d" original={"Rol"}/></th><th><TextoEditorial id="6248800ec7813ceac6e3" original={"Edad"}/></th><th><TextoEditorial id="875a9acc40b6ae440ef5" original={"Unidad regional"}/></th><th><TextoEditorial id="f553b4b8e5394a40059e" original={"Programa / facultad / coordinación / área"}/></th></tr></thead><tbody>{detalle.slice(0,limite).map(r=><tr key={r.id}><td>{r.id}</td><td>{r.fechaInicio||'Sin especificar'}</td><td>{r.lugarDesarrollo||'Sin especificar'}</td><td>{etiquetaRol(r.rol)}</td><td>{r.edad??'Sin especificar'}</td><td>{unidadRegionalDe(r)}</td><td>{adscripcionesDe(r).join('; ')}</td></tr>)}</tbody></table></div>
        {limite<detalle.length?<Button className="mt-4" onClick={()=>setLimite(n=>n+100)}>Mostrar más registros</Button>:null}
      </CardContent></Card>
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

function sumar(mapa: Map<string, Map<string, number>>, fecha: string, clave: string) {
  const conteo = mapa.get(fecha) ?? new Map<string, number>();
  conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  mapa.set(fecha, conteo);
}

/**
 * Los lugares de una fecha para el tooltip, de mayor a menor. Un solo lugar va
 * sin cifra: es la ciudad de la jornada, y "Facatativá (397)" repetiría el
 * total de arriba. Si un mismo día hubo asistencia en varios lugares, cada uno
 * lleva su cifra para que se vea cómo se repartió.
 */
function lineasLugares(conteo: Map<string, number> | undefined, total: number): string[] {
  const ordenado = [...(conteo ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
  if (ordenado.length <= 1) return ordenado.map(([lugar]) => lugar);
  return ordenado.map(([lugar, n]) => `${lugar}: ${formatNumero(n)} (${formatPorcentaje((n / total) * 100)})`);
}

function calcularMetricas(registros: RegistroParticipacion[]) {
  const porRolMapa = new Map<string, number>();
  const porUnidadMapa = new Map<string, number>();
  const porAdscripcionMapa = new Map<string, number>();
  const porFechaMapa = new Map<string, number>();
  // Por cada día de jornada, dónde se hizo: para el tooltip de "Asistencia en
  // el tiempo".
  const lugaresPorFecha = new Map<string, Map<string, number>>();
  const porRangoEdadMapa = new Map<string, number>();
  let conEdad = 0;

  for (const r of registros) {
    // Se cuentan TODAS las filas, también las que no traen el dato: si se
    // saltaran, las barras sumarían menos que los asistentes registrados y
    // nadie sabría a qué se debe la diferencia.
    const rol = etiquetaRol(r.rol);
    porRolMapa.set(rol, (porRolMapa.get(rol) ?? 0) + 1);

    const unidad = unidadRegionalDe(r);
    porUnidadMapa.set(unidad, (porUnidadMapa.get(unidad) ?? 0) + 1);

    // Una persona puede aportar a varias (un docente trae facultad Y
    // coordinación), así que estos conteos suman más que el total de filas:
    // es un conteo de menciones, no de personas.
    for (const adscripcion of adscripcionesDe(r)) {
      porAdscripcionMapa.set(adscripcion, (porAdscripcionMapa.get(adscripcion) ?? 0) + 1);
    }

    if (r.fechaInicio) {
      porFechaMapa.set(r.fechaInicio, (porFechaMapa.get(r.fechaInicio) ?? 0) + 1);
      sumar(lugaresPorFecha, r.fechaInicio, r.lugarDesarrollo?.trim() || SIN_ESPECIFICAR);
    }

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
      detalles: [{ titulo: "Lugar de desarrollo", lineas: lineasLugares(lugaresPorFecha.get(fecha), valor) }],
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
