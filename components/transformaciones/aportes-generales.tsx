"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useMemo, useState } from "react";
import { MessageSquareQuote, Users2, X } from "lucide-react";
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
import { NubePalabras } from "@/components/charts/nube-palabras";
import { formatNumero } from "@/lib/formatters";
import { calcularFrecuenciaPalabras } from "@/lib/frecuencia-palabras";
import { TITULO_APORTES } from "@/lib/reglas/aportes";
import type { RespuestaAporte } from "@/types/aportes";

const TODAS = "__todas__";
const SIN_ESPECIFICAR = "Sin especificar";

const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", { dateStyle: "long" });

interface Filtros {
  fechas: string[];
  tipoActor: string;
  unidadRegional: string;
}

const SIN_FILTROS: Filtros = { fechas: [], tipoActor: TODAS, unidadRegional: TODAS };

/**
 * Los aportes del formulario general del Plan.
 *
 * Va en su propia tarjeta, con sus propias cifras, porque es otro
 * cuestionario: sus respuestas no dicen si una transformación responde a lo
 * que se necesita, así que mezclarlas con las de arriba haría que el respaldo
 * y los porcentajes contaran gente que nunca respondió esa pregunta.
 */
export function AportesGenerales({ aportes }: { aportes: RespuestaAporte[] }) {
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);

  const opciones = useMemo(
    () => ({
      fechas: [
        ...new Set(aportes.map((a) => a.fechaInicio).filter((f): f is string => Boolean(f))),
      ].sort((a, b) => b.localeCompare(a)),
      tiposActor: valoresUnicos(aportes.map((a) => a.tipoActor?.trim() || SIN_ESPECIFICAR)),
      unidadesRegionales: valoresUnicos(
        aportes.map((a) => a.unidadRegional?.trim() || SIN_ESPECIFICAR)
      ),
    }),
    [aportes]
  );

  const filtrados = useMemo(
    () =>
      aportes.filter((a) => {
        if (
          filtros.fechas.length > 0 &&
          (a.fechaInicio === null || !filtros.fechas.includes(a.fechaInicio))
        ) {
          return false;
        }
        if (
          filtros.tipoActor !== TODAS &&
          (a.tipoActor?.trim() || SIN_ESPECIFICAR) !== filtros.tipoActor
        ) {
          return false;
        }
        if (
          filtros.unidadRegional !== TODAS &&
          (a.unidadRegional?.trim() || SIN_ESPECIFICAR) !== filtros.unidadRegional
        ) {
          return false;
        }
        return true;
      }),
    [aportes, filtros]
  );

  const metricas = useMemo(() => {
    const porActor = new Map<string, number>();
    const porUnidad = new Map<string, number>();
    for (const a of filtrados) {
      const actor = a.tipoActor?.trim() || SIN_ESPECIFICAR;
      porActor.set(actor, (porActor.get(actor) ?? 0) + 1);
      const unidad = a.unidadRegional?.trim() || SIN_ESPECIFICAR;
      porUnidad.set(unidad, (porUnidad.get(unidad) ?? 0) + 1);
    }
    const total = filtrados.length;
    const aBarras = (m: Map<string, number>) =>
      [...m.entries()].map(([etiqueta, conteo]) => ({
        etiqueta,
        conteo,
        porcentaje: total > 0 ? (conteo / total) * 100 : 0,
      }));

    return {
      porActor: aBarras(porActor),
      porUnidad: aBarras(porUnidad),
      unidades: [...porUnidad.keys()].filter((u) => u !== SIN_ESPECIFICAR).length,
      // Con pocos aportes, exigir que una palabra se repita deja la nube vacía.
      palabras: calcularFrecuenciaPalabras(
        filtrados.map((a) => a.aporte),
        { maxPalabras: 45, frecuenciaMinima: filtrados.length >= 15 ? 2 : 1 }
      ),
    };
  }, [filtrados]);

  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(SIN_FILTROS);

  return (
    <Card className="border-border/70">
      <CardHeader>
        {/* Un punto más grande y en negrilla que el resto de tarjetas: este
            bloque es de otro formulario, y el título es lo que separa sus
            cifras de las de las cinco transformaciones. */}
        <CardTitle className="text-lg font-bold">{TITULO_APORTES}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          {/* Se muestra aunque hoy haya un solo día: es un filtro previsto
              para cuando lleguen más jornadas, y esconderlo hasta entonces
              haría que apareciera y desapareciera según el cargue. */}
          {opciones.fechas.length > 0 ? (
            <Campo etiqueta="Fecha">
              <Select
                multiple
                value={filtros.fechas}
                onValueChange={(v) => setFiltros((p) => ({ ...p, fechas: v ?? [] }))}
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

          <Campo etiqueta="Tipo de actor">
            <Select
              value={filtros.tipoActor}
              onValueChange={(v) => setFiltros((p) => ({ ...p, tipoActor: v ?? TODAS }))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todos">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{!v || v === TODAS ? "Todos" : v}</span>
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
              onValueChange={(v) => setFiltros((p) => ({ ...p, unidadRegional: v ?? TODAS }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas">
                  {(v: string | null) => (
                    <span className="min-w-0 truncate">{!v || v === TODAS ? "Todas" : v}</span>
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

          {hayFiltros ? (
            <Button variant="ghost" size="sm" onClick={() => setFiltros(SIN_FILTROS)}>
              <X className="size-3.5" aria-hidden />
              Limpiar
            </Button>
          ) : null}

          <Badge variant="secondary" className="ml-auto">
            {formatNumero(filtrados.length)} de {formatNumero(aportes.length)} aportes
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KpiCard
            etiqueta="Aportes recibidos"
            valor={formatNumero(filtrados.length)}
            detalle="Respuestas con texto escrito"
            icono={MessageSquareQuote}
          />
          <KpiCard
            etiqueta="Tipos de actor"
            valor={formatNumero(metricas.porActor.length)}
            detalle="Quiénes aportaron"
            icono={Users2}
          />
          <KpiCard
            etiqueta="Unidades regionales"
            valor={formatNumero(metricas.unidades)}
            detalle="Sedes, seccionales y extensiones"
            icono={Users2}
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <TextoEditorial id="4df15467a7bd576bbbde" original={"Ningún aporte coincide con los filtros elegidos."}/></p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/70">
                <CardContent>
                  <RankedBarChart
                    titulo="Aportes por tipo de actor"
                    datos={metricas.porActor}
                    truncarEn={34}
                    ocultarAccion
                  />
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardContent>
                  <RankedBarChart
                    titulo="Aportes por Unidad Regional"
                    datos={metricas.porUnidad}
                    truncarEn={28}
                    ocultarAccion
                  />
                </CardContent>
              </Card>
            </div>

            {metricas.palabras.length > 0 ? (
              <NubePalabras
                palabras={metricas.palabras}
                totalRespuestas={filtrados.length}
                titulo="Lo que más se repite en los aportes"
                descripcion={`Palabras más frecuentes en los ${formatNumero(filtrados.length)} aportes del recorte seleccionado.`}
              />
            ) : null}

            <ListaAportes aportes={filtrados} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Cuántos aportes se muestran antes de pedir "ver más". */
const PASO = 5;

function ListaAportes({ aportes }: { aportes: RespuestaAporte[] }) {
  const [visibles, setVisibles] = useState(PASO);
  const mostrados = aportes.slice(0, visibles);

  return (
    <div className="flex flex-col gap-2">
      {mostrados.map((a) => (
        <div key={a.id} className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
          <p className="whitespace-pre-line text-sm text-foreground">{a.aporte}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {[
              a.tipoActor,
              a.unidadRegional,
              a.fechaInicio
                ? formatoDiaLargo.format(new Date(`${a.fechaInicio}T12:00:00`))
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          <TextoEditorial id="007ea5bf776758965150" original={"Mostrando"}/>{formatNumero(mostrados.length)} de {formatNumero(aportes.length)} <TextoEditorial id="7cdbc961c88ac5fc6d6b" original={"aportes"}/></p>
        {visibles < aportes.length ? (
          <Button variant="outline" size="sm" onClick={() => setVisibles((v) => v + PASO * 2)}>
            Ver más aportes
          </Button>
        ) : null}
      </div>
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

function textoFechas(fechas: string[]): string {
  if (fechas.length === 0) return "Todas";
  if (fechas.length === 1) return formatoDiaLargo.format(new Date(`${fechas[0]}T12:00:00`));
  return `${fechas.length} fechas`;
}

function valoresUnicos(valores: string[]): string[] {
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, "es"));
}
