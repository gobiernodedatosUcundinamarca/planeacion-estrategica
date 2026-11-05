import { DescargaExcel } from "@/components/layout/descarga-excel";
import type { Metadata } from "next";
import { ConferencistasExplorador } from "@/components/conferencistas/conferencistas-explorador";
import { getConferencias } from "@/repositories/conferencistasRepository";
import { getValoracion } from "@/repositories/valoracionesRepository";
import type { ConferenciaConValoracion } from "@/types/conferencistas";

export const metadata: Metadata = { title: "Ciclos de Diálogo Estratégico — Diagnóstico: Tu Voz Fundamental" };

export default function ConferencistasPage() {
  const conferencias: ConferenciaConValoracion[] = getConferencias().map((c) => ({
    ...c,
    valoracion: getValoracion(c.slug),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Ciclos de Diálogo Estratégico</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Jornadas y conversatorios del Plan Estratégico 2027–2037 — {conferencias.length} en total.
        </p>
      </div>

      {conferencias.length > 0 ? (
        <ConferencistasExplorador conferencias={conferencias} />
      ) : (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aún no hay conferencistas publicados.
        </p>
      )}

      <DescargaExcel ruta="/conferencistas" />
    </div>
  );
}
