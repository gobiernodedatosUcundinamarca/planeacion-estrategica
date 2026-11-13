import {TextoEditorial} from "@/components/editorial/texto-editorial";
import Link from "next/link";
import { ArrowUpRight, ListChecks, MessagesSquare, MessageSquareText, Star, ThumbsUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NubePalabras } from "@/components/charts/nube-palabras";
import { FrecuenciaPorTipo } from "@/components/analitica-momentos/frecuencia-por-tipo";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import type { ResumenAnaliticaMomentos } from "@/types/analitica-momentos";

function formatValoracion(n: number): string {
  return n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function colorValoracion(promedio: number): string {
  const paso = Math.min(Math.max(Math.round(promedio), 1), 5);
  return `var(--valoracion-${paso})`;
}

/** "Momento 3 · Actividad 3.1 y 3.2" → ["Momento 3", "Actividad 3.1 y 3.2"] para etiquetas de dos líneas. */
function partesEtiqueta(tituloCorto: string): [string | null, string] {
  const separador = tituloCorto.indexOf(" · ");
  if (separador === -1) return [null, tituloCorto];
  return [tituloCorto.slice(0, separador), tituloCorto.slice(separador + 3)];
}

function EtiquetaActividad({ tituloCorto }: { tituloCorto: string }) {
  const [grupo, nombre] = partesEtiqueta(tituloCorto);
  return (
    <span className="flex w-32 shrink-0 flex-col justify-center leading-tight">
      {grupo ? <span className="truncate text-[10px] text-muted-foreground">{grupo}</span> : null}
      <span className="truncate text-foreground group-hover:text-accent-foreground">{nombre}</span>
    </span>
  );
}

/**
 * Panel-resumen de la sección "Analítica actividades momentos": métricas de
 * valor, destacados y comparativos por actividad. Todo es navegable — cada
 * elemento enlaza a la tarjeta de detalle correspondiente.
 */
export function ResumenAnaliticaMomentos({ resumen }: { resumen: ResumenAnaliticaMomentos }) {
  const tiles = [
    {
      etiqueta: "Actividades del Momento 3",
      valor: formatNumero(resumen.numActividades),
      pie: "con valoración",
      icono: ListChecks,
    },
    {
      etiqueta: "Valoración promedio",
      valor: resumen.promedioValoracion != null ? `${formatValoracion(resumen.promedioValoracion)}/5` : "—",
      pie: "en escala 1 a 5",
      icono: Star,
    },
    {
      etiqueta: "Satisfacción (4–5)",
      valor: resumen.porcentajeSatisfaccion != null ? formatPorcentaje(resumen.porcentajeSatisfaccion) : "—",
      pie: "valoraciones altas",
      icono: ThumbsUp,
    },
    {
      etiqueta: "Aportes cualitativos",
      valor: formatNumero(resumen.totalAportes),
      pie: "aprendizajes y mejoras",
      icono: MessageSquareText,
    },
  ];

  const maxParticipacion = Math.max(1, ...resumen.actividades.map((a) => a.respondieron));

  return (
    <section className="flex flex-col gap-4" aria-label="Resumen general">
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground"><TextoEditorial id="dd413aefa2b667b4db2b" original={"Resumen general"}/></h2>
        <p className="text-xs text-muted-foreground">
          <TextoEditorial id="c405ff4e70099f68ee67" original={"Lo más relevante de las"}/>{formatNumero(resumen.numActividades)} <TextoEditorial id="ce5613fec9ac94c05f3d" original={"actividades valoradas (Momentos 1 y 2, y Momento 3), la conversación del foro y las reflexiones. Toca cualquier tarjeta para ver el detalle."}/></p>
      </div>

      {/* Métricas de valor */}
      <div className="grid grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icono = t.icono;
          return (
            <Card key={t.etiqueta} className="gap-0 py-0">
              <CardContent className="flex min-h-24 flex-col justify-between gap-2 px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium leading-tight text-muted-foreground">{t.etiqueta}</span>
                  <Icono className="size-4 shrink-0 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold leading-none tabular-nums text-foreground">{t.valor}</p>
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{t.pie}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Destacados */}
      <div className="grid grid-cols-3 gap-3">
        {resumen.destacados.mejorValorada ? (
          <Destacado
            slug={resumen.destacados.mejorValorada.slug}
            icono={Star}
            titulo="Mejor valorada"
            principal={resumen.destacados.mejorValorada.tituloCorto}
            metrica={`${formatValoracion(resumen.destacados.mejorValorada.promedio)} / 5`}
          />
        ) : null}
        {resumen.destacados.mayorParticipacion ? (
          <Destacado
            slug={resumen.destacados.mayorParticipacion.slug}
            icono={Users}
            titulo="Mayor participación"
            principal={resumen.destacados.mayorParticipacion.tituloCorto}
            metrica={`${formatNumero(resumen.destacados.mayorParticipacion.respondieron)} personas${
              resumen.destacados.mayorParticipacion.porcentaje != null
                ? ` · ${formatPorcentaje(resumen.destacados.mayorParticipacion.porcentaje)}`
                : ""
            }`}
          />
        ) : null}
        {resumen.destacados.masAportes ? (
          <Destacado
            slug={resumen.destacados.masAportes.slug}
            icono={MessageSquareText}
            titulo="Más aportes escritos"
            principal={resumen.destacados.masAportes.tituloCorto}
            metrica={`${formatNumero(resumen.destacados.masAportes.aportes)} aportes`}
          />
        ) : null}
      </div>

      {/* Comparativos por actividad */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h3 className="text-[13px] font-semibold text-foreground"><TextoEditorial id="1882ca3e7f2faf824fe3" original={"Participación por actividad"}/></h3>
            <ul className="flex flex-col gap-2">
              {[...resumen.actividades]
                .sort((a, b) => b.respondieron - a.respondieron)
                .map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/analitica-momentos/${a.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-1 py-1 text-xs transition-colors hover:bg-accent"
                    >
                      <EtiquetaActividad tituloCorto={a.tituloCorto} />
                      <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-primary"
                          style={{ width: `${(a.respondieron / maxParticipacion) * 100}%` }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-foreground">
                        {formatNumero(a.respondieron)}
                        {a.porcentaje != null ? (
                          <span className="ml-1 font-normal text-muted-foreground">
                            {formatPorcentaje(a.porcentaje)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <h3 className="text-[13px] font-semibold text-foreground"><TextoEditorial id="48ece3cb5147afb724af" original={"Valoración promedio por actividad"}/></h3>
            <ul className="flex flex-col gap-2">
              {[...resumen.actividades]
                .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0))
                .map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/analitica-momentos/${a.slug}`}
                      className="group flex items-center gap-2.5 rounded-md px-1 py-1 text-xs transition-colors hover:bg-accent"
                    >
                      <EtiquetaActividad tituloCorto={a.tituloCorto} />
                      <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${((a.promedio ?? 0) / 5) * 100}%`,
                            background: a.promedio != null ? colorValoracion(a.promedio) : "var(--muted-foreground)",
                          }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right font-semibold tabular-nums text-foreground">
                        {a.promedio != null ? `${formatValoracion(a.promedio)}/5` : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <NubePalabras palabras={resumen.palabrasFrecuentes} totalRespuestas={resumen.totalRespuestasAbiertas} />

      <FrecuenciaPorTipo
        palabrasMejoras={resumen.palabrasMejoras}
        totalRespuestasMejoras={resumen.totalRespuestasMejoras}
        palabrasAprendizaje={resumen.palabrasAprendizaje}
        totalRespuestasAprendizaje={resumen.totalRespuestasAprendizaje}
      />

      {/* Conversación */}
      {resumen.conversaciones.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {resumen.conversaciones.map((c) => (
            <Destacado
              key={c.slug}
              slug={c.slug}
              icono={MessagesSquare}
              titulo={c.tituloCorto}
              principal={`${formatNumero(c.publicaciones)} publicaciones`}
              metrica={`${formatNumero(c.participantes)} participantes`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Destacado({
  slug,
  icono: Icono,
  titulo,
  principal,
  metrica,
}: {
  slug: string;
  icono: typeof Star;
  titulo: string;
  principal: string;
  metrica: string;
}) {
  return (
    <Link href={`/analitica-momentos/${slug}`} className="group">
      <Card className="gap-0 py-0 transition-colors group-hover:bg-accent">
        <CardContent className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icono className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {titulo}
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">{principal}</span>
            <span className="block truncate text-xs text-muted-foreground">{metrica}</span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </CardContent>
      </Card>
    </Link>
  );
}
