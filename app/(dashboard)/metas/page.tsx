import { DescargaExcel } from "@/components/layout/descarga-excel";
import type { Metadata } from "next";
import { TablaMetaCard } from "@/components/metas/tabla-meta";
import { GraficoMetas } from "@/components/metas/grafico-metas";
import { getTablasMetas } from "@/repositories/metasRepository";

export const metadata: Metadata = { title: "Metas — Diagnóstico: Tu Voz Fundamental" };

export default function MetasPage() {
  const tablas = getTablasMetas();
  const [gca, administrativosContrato, administrativosSede, estudiantes, graduados] = tablas;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Metas — Diagnóstico: Tu Voz Fundamental
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cumplimiento de metas por categoría — Sí: completó el diagnóstico; No: no registra participación
            en el diagnóstico.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TablaMetaCard tabla={gca} />
        <TablaMetaCard tabla={administrativosContrato} />
        <TablaMetaCard tabla={administrativosSede} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TablaMetaCard tabla={estudiantes} />
        <TablaMetaCard tabla={graduados} />
      </div>

      <GraficoMetas tablas={tablas} />

      <DescargaExcel ruta="/metas" />
    </div>
  );
}
