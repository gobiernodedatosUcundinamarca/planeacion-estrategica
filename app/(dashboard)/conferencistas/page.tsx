import {TextoEditorial} from "@/components/editorial/texto-editorial";
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
        <h1 className="font-heading text-2xl font-bold text-foreground"><TextoEditorial id="748775bf88f999b6d973" original={"Ciclos de Diálogo Estratégico"}/></h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <TextoEditorial id="bbca320ecad0da0b9151" original={"Jornadas y conversatorios del Plan Estratégico 2027–2037 —"}/>{conferencias.length} <TextoEditorial id="7132670d631c3c6090ca" original={"en total."}/></p>
      </div>

      {conferencias.length > 0 ? (
        <ConferencistasExplorador conferencias={conferencias} />
      ) : (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          <TextoEditorial id="6cb7a3580724ec2769b2" original={"Aún no hay conferencistas publicados."}/></p>
      )}

      <DescargaExcel ruta="/conferencistas" />
    </div>
  );
}
