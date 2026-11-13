"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TODOS_LOS_CORTES,
  UMBRAL_ATENCION_DIAS,
  consolidarCortes,
  personasQueRequierenAtencion,
} from "@/lib/reglas/accesos";
import type { AccesosCaiData } from "@/types/accesos-cai";

const formatoDecimal = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function PanelAccesosCai({ datos }: { datos: AccesosCaiData }) {
  const ultimo = datos.cortes.at(-1)!;
  const todosLosCortes = useMemo(() => consolidarCortes(datos), [datos]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(TODOS_LOS_CORTES);
  const corte =
    fechaSeleccionada === TODOS_LOS_CORTES
      ? todosLosCortes
      : (datos.cortes.find((item) => item.fecha === fechaSeleccionada) ?? ultimo);
  const mostrandoTodos = fechaSeleccionada === TODOS_LOS_CORTES;
  /** Clic en una barra: filtra por su fecha, o quita el filtro si ya estaba activa. */
  const alternarFecha = (fecha: string) =>
    setFechaSeleccionada((actual) => (actual === fecha ? TODOS_LOS_CORTES : fecha));
  const requierenAtencion = useMemo(
    () => personasQueRequierenAtencion(corte.personas),
    [corte]
  );
  const maximoRango = Math.max(...corte.rangos.map((rango) => rango.cantidad), 1);

  // Memoizado: sin esto el array se recrea en cada render y recharts reinicia
  // la animación completa del gráfico en cada cambio de filtro.
  const evolucion = useMemo(
    () => datos.cortes.map((item) => ({ ...item, etiqueta: fechaCorta(item.fecha) })),
    [datos]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground"><TextoEditorial id="e0acebd865af49dc3ca1" original={"Corte de información"}/></p>
          <p className="text-xs text-muted-foreground"><TextoEditorial id="7730e1f80fe05e27991b" original={"Selecciona una fecha para explorar sus accesos."}/></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            <span className="sr-only"><TextoEditorial id="c0aece8db5b7e83432a8" original={"Fecha de acceso"}/></span>
            <Select
              value={fechaSeleccionada}
              onValueChange={(valor) => setFechaSeleccionada(valor ?? TODOS_LOS_CORTES)}
            >
              <SelectTrigger aria-label="Fecha de acceso" className="min-w-48"><SelectValue>{() => fechaSeleccionada === TODOS_LOS_CORTES ? 'Todas' : fechaLarga(fechaSeleccionada)}</SelectValue></SelectTrigger>
              <SelectContent>
              <SelectItem value={TODOS_LOS_CORTES}>Todas</SelectItem>
              {datos.cortes.map((item) => (
                <SelectItem key={item.fecha} value={item.fecha}>
                  {fechaLarga(item.fecha)}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFechaSeleccionada(TODOS_LOS_CORTES)}
            disabled={mostrandoTodos}
          >
            <RotateCcw className="size-4" aria-hidden />
            Limpiar filtros
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-4 gap-3" aria-label="Indicadores principales">
        <Indicador
          etiqueta="Personas que acceden"
          valor={String(corte.personasUnicas)}
          detalle={mostrandoTodos ? "Correos únicos en todas las fechas" : "Correos únicos del corte"}
          icono={UsersRound}
        />
        <Indicador
          etiqueta="Promedio desde último acceso"
          valor={`${formatoDecimal.format(corte.promedioDias)} días`}
          detalle={mostrandoTodos ? "Última medición de cada persona" : fechaLarga(corte.fecha)}
          icono={Clock3}
        />
        <Indicador
          etiqueta="Registros analizados"
          valor={String(corte.registros)}
          detalle={mostrandoTodos ? "Suma de todas las mediciones" : corte.registros === corte.personasUnicas ? "Sin duplicados" : "Incluye registros repetidos"}
          icono={Database}
        />
        <Indicador
          etiqueta="Promedio global"
          valor={`${formatoDecimal.format(datos.promedioGlobal)} días`}
          detalle={`${datos.cortes.length} fechas de medición`}
          icono={CalendarDays}
        />
      </section>

      <section className="grid grid-cols-[1.45fr_1fr] gap-5">
        <Card>
          <CardHeader>
            <CardTitle><TextoEditorial id="9c7ddfad45667571940b" original={"Evolución del promedio por fecha de acceso"}/></CardTitle>
            <p className="text-xs text-muted-foreground">
              <TextoEditorial id="6ccfe68d3e4ee392d301" original={"Menos días indican una participación más reciente. Referencia global:"}/>{formatoDecimal.format(datos.promedioGlobal)} <TextoEditorial id="2faf25b473cfe00f000f" original={"días."}/>{mostrandoTodos ? " Clic en una barra para filtrar por esa fecha." : " Clic en la barra activa para quitar el filtro."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] min-w-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
                initialDimension={{ width: 800, height: 300 }}
              >
                <BarChart data={evolucion} margin={{ top: 24, right: 12, left: -18, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, "dataMax + 1"]} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                    formatter={(valor) => [`${formatoDecimal.format(Number(valor))} días`, "Promedio"]}
                    labelFormatter={(_, payload) => payload[0] ? fechaLarga(payload[0].payload.fecha) : ""}
                    contentStyle={{ borderRadius: 10, borderColor: "var(--border)" }}
                  />
                  <ReferenceLine
                    y={datos.promedioGlobal}
                    stroke="var(--brand-accent)"
                    strokeDasharray="5 4"
                  />
                  <Bar
                    dataKey="promedioDias"
                    fill="var(--primary)"
                    radius={[7, 7, 2, 2]}
                    maxBarSize={64}
                    isAnimationActive={false}
                    className="cursor-pointer"
                    onClick={(_, indice) => alternarFecha(evolucion[indice].fecha)}
                  >
                    {evolucion.map((item) => (
                      <Cell
                        key={item.fecha}
                        // En "Todas" ninguna barra está seleccionada: todas se ven
                        // activas. Al filtrar, solo la elegida conserva el color.
                        fillOpacity={mostrandoTodos || item.fecha === corte.fecha ? 1 : 0.28}
                      />
                    ))}
                    <LabelList
                      dataKey="promedioDias"
                      position="top"
                      formatter={(valor: unknown) => formatoDecimal.format(Number(valor))}
                      className="fill-foreground text-xs font-semibold"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><TextoEditorial id="89b905a5c8543f0775c6" original={"Tiempo desde el último acceso"}/></CardTitle>
            <p className="text-xs text-muted-foreground"><TextoEditorial id="3b49628c77c9392168ce" original={"Personas únicas agrupadas por días desde su último acceso."}/></p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {corte.rangos.map((rango, indice) => (
              <div key={rango.etiqueta} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{rango.etiqueta}</span>
                  <span className="font-heading font-bold tabular-nums">{rango.cantidad}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      indice < 2 ? "bg-primary" : indice === 2 ? "bg-brand-accent" : "bg-amber-500"
                    )}
                    style={{ width: `${(rango.cantidad / maximoRango) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/65 p-3 text-xs text-muted-foreground">
              {requierenAtencion.length ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              )}
              <span>
                {requierenAtencion.length
                  ? `${requierenAtencion.length} personas registran ${UMBRAL_ATENCION_DIAS} o más días desde su último acceso.`
                  : `No hay personas con ${UMBRAL_ATENCION_DIAS} o más días desde su último acceso.`}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-4 gap-3" aria-label="Comparación entre mediciones">
        {datos.cortes.map((item) => (
          <TarjetaCorte
            key={item.fecha}
            corte={item}
            activa={!mostrandoTodos && item.fecha === corte.fecha}
            onSeleccionar={() => alternarFecha(item.fecha)}
          />
        ))}
      </section>
    </div>
  );
}

function Indicador({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  icono: typeof UsersRound;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex min-h-28 items-start gap-3 px-4 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icono className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight text-muted-foreground">{etiqueta}</p>
          <p className="mt-1 font-heading text-2xl font-bold leading-none tabular-nums">{valor}</p>
          <p className="mt-2 text-[11px] leading-tight text-muted-foreground">{detalle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TarjetaCorte({
  corte,
  activa,
  onSeleccionar,
}: {
  corte: AccesosCaiData["cortes"][number];
  activa: boolean;
  onSeleccionar: () => void;
}) {
  const mejora = corte.variacionDias != null && corte.variacionDias <= 0;
  const Icono = mejora ? TrendingDown : TrendingUp;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={activa}
      onClick={onSeleccionar}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          onSeleccionar();
        }
      }}
      className={cn(
        "gap-0 border-t-4 py-0 cursor-pointer transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        activa ? "border-t-primary ring-2 ring-primary/20" : "border-t-primary/55"
      )}
    >
      <CardContent className="px-4 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{fechaCorta(corte.fecha)}</p>
        <p className="mt-3 font-heading text-3xl font-bold tabular-nums">{formatoDecimal.format(corte.promedioDias)}</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"><TextoEditorial id="d348c4a2a4337b6cc7f9" original={"días promedio"}/></p>
        <div className="mt-3 border-t border-dashed pt-2 text-xs">
          {corte.variacionDias == null ? (
            <span className="text-muted-foreground"><TextoEditorial id="41482cf888c6bf8f581d" original={"Primera medición"}/></span>
          ) : (
            <span className={cn("inline-flex items-center gap-1 font-semibold", mejora ? "text-primary" : "text-amber-700")}>
              <Icono className="size-3.5" aria-hidden />
              {corte.variacionDias > 0 ? "+" : ""}{formatoDecimal.format(corte.variacionDias)} <TextoEditorial id="ac20320a51233f2e0898" original={"días"}/>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`))
    .replaceAll(".", "");
}

function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}
