import { DescargaExcel } from "@/components/layout/descarga-excel";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, MessagesSquare, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ResumenAnaliticaMomentos } from "@/components/analitica-momentos/resumen-analitica";
import {
  getArchivosAnaliticaMomentos,
  getResumenAnaliticaMomentos,
} from "@/repositories/analiticaMomentosRepository";
import type { ArchivoAnaliticaMomentos } from "@/types/analitica-momentos";

export const metadata: Metadata = {
  title: "Analítica actividades momentos",
};

export default function AnaliticaMomentosPage() {
  const archivos = getArchivosAnaliticaMomentos();
  const resumen = getResumenAnaliticaMomentos();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Analítica actividades momentos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Valoración por actividad y momento. Selecciona una tarjeta para ver su análisis.
        </p>
      </header>

      <ResumenAnaliticaMomentos resumen={resumen} />

      <section className="flex flex-col gap-3" aria-label="Actividades y momentos">
        <h2 className="font-heading text-lg font-semibold text-foreground">Explora cada actividad</h2>
        <div className="grid grid-cols-3 gap-3">
          {archivos.map((item) => (
            <TarjetaActividad key={item.archivo} item={item} />
          ))}
        </div>
      </section>

      <DescargaExcel ruta="/analitica-momentos" />
    </div>
  );
}

/** El ícono refleja el tipo de contenido (encuesta/valoración, foro o reflexiones abiertas), no un mismo genérico para todo. */
function iconoPorTitulo(titulo: string): LucideIcon {
  if (/^foro/i.test(titulo)) return MessagesSquare;
  if (/^reflexiones/i.test(titulo)) return BookOpen;
  return ClipboardCheck;
}

function TarjetaActividad({ item }: { item: ArchivoAnaliticaMomentos }) {
  const Icono = iconoPorTitulo(item.titulo);
  return (
    <Link href={`/analitica-momentos/${item.slug}`}>
      <Card className="gap-0 py-0 transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3.5 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <Icono className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{item.titulo}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
