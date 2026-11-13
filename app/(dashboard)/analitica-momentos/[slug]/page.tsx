import {TextoEditorial} from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DistribucionValoracion } from "@/components/analitica-momentos/distribucion-valoracion";
import { esDistribucionLikert } from "@/lib/valoracion";
import { RespuestasAbiertas } from "@/components/analitica-momentos/respuestas-abiertas";
import { FeedForo } from "@/components/analitica-momentos/feed-foro";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import {
  getArchivoAnaliticaMomentosPorSlug,
  getDetalleAnaliticaMomento,
} from "@/repositories/analiticaMomentosRepository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getArchivoAnaliticaMomentosPorSlug(slug);
  return { title: item ? item.titulo : "Analítica actividades momentos" };
}

export default async function AnaliticaMomentoDetallePage({ params }: PageProps) {
  const { slug } = await params;
  const item = getArchivoAnaliticaMomentosPorSlug(slug);
  if (!item) notFound();

  const datos = getDetalleAnaliticaMomento(item.archivo);
  if (!datos) notFound();

  const kpis =
    datos.tipo === "foro"
      ? [{ etiqueta: "Personas que participaron", valor: datos.totalParticipantes }]
      : datos.tipo === "roster"
        ? [
            { etiqueta: "Número total de participantes", valor: datos.totalParticipantes },
            ...datos.preguntasValoracion.map((p) => ({
              etiqueta: `Valoraron: ${p.pregunta}`,
              valor: p.distribucion.reduce((suma, op) => suma + op.cantidad, 0),
            })),
          ]
        : [
            { etiqueta: "Número total de participantes", valor: datos.totalParticipantes },
            { etiqueta: "Personas que valoraron", valor: datos.totalRespondieron },
            {
              etiqueta: "% que valoraron",
              valor: datos.porcentajeRespondieron != null ? formatPorcentaje(datos.porcentajeRespondieron) : "—",
            },
          ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/analitica-momentos"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Volver a Analítica actividades momentos
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">{item.titulo}</h1>
      </div>

      <section className="grid grid-cols-4 gap-3" aria-label="Indicadores principales">
        {kpis.map((kpi) => (
          <Card key={kpi.etiqueta} className="gap-0 py-0">
            <CardContent className="flex min-h-24 flex-col justify-center gap-1 px-4 py-4">
              <p className="text-xs font-medium leading-tight text-muted-foreground">{kpi.etiqueta}</p>
              <p className="font-heading text-2xl font-bold leading-none tabular-nums">
                {typeof kpi.valor === "number" ? formatNumero(kpi.valor) : kpi.valor}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {datos.preguntasValoracion.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Distribución de valoración por pregunta">
          <p className="text-xs text-muted-foreground">
            {datos.preguntasValoracion.every((p) => esDistribucionLikert(p.distribucion)) ? (
              <>
                <TextoEditorial id="58eceb689fbf8c3ad8ee" original={"Cada gráfico resume las respuestas en una escala de valoración de"}/>{" "}
                <span className="font-medium text-foreground"><TextoEditorial id="833f95bca89a0074866c" original={"1 (Muy bajo)"}/></span> a{" "}
                <span className="font-medium text-foreground"><TextoEditorial id="6fa6ad75971ac5996b7f" original={"5 (Muy alto)"}/></span>.
              </>
            ) : (
              <>
                <TextoEditorial id="d5c57b0c1504b3894a43" original={"Valoraciones en una escala de"}/> <span className="font-medium text-foreground"><TextoEditorial id="a6d692e4a67e801c6ebd" original={"1 a 5"}/></span> <TextoEditorial id="3f5803049e0961d382b4" original={"(5 = máximo); los promedios se muestran como puntaje sobre 5."}/>
              </>
            )}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {datos.preguntasValoracion.map((pregunta) => (
              <Card key={pregunta.pregunta}>
                <CardContent>
                  <DistribucionValoracion pregunta={pregunta} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {datos.preguntasAbiertas.length > 0 ? (
        <section className="grid grid-cols-2 gap-4" aria-label="Respuestas abiertas">
          {datos.preguntasAbiertas.map((pregunta) => (
            <RespuestasAbiertas key={pregunta.pregunta} pregunta={pregunta} />
          ))}
        </section>
      ) : null}

      {datos.publicacionesForo.length > 0 ? (
        <section aria-label="Publicaciones del foro">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <Users className="size-4 text-primary" aria-hidden />
            <TextoEditorial id="6c75dbe62805e46e1f82" original={"Publicaciones"}/></h2>
          <FeedForo publicaciones={datos.publicacionesForo} />
        </section>
      ) : null}
    </div>
  );
}
