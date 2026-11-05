import { DescargaExcel } from "@/components/layout/descarga-excel";
import type { Metadata } from "next";
import { PanelAccesosCai } from "@/components/accesos/panel-accesos-cai";
import { getAccesosCaiData } from "@/repositories/accesosCaiRepository";

export const metadata: Metadata = {
  title: "Accesos a CAI Planeación estratégica",
};

export default function AccesosCaiPage() {
  const datos = getAccesosCaiData();

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Accesos a CAI Planeación estratégica
        </h1>
      </header>
      <PanelAccesosCai datos={datos} />
      <DescargaExcel ruta="/accesos-cai" />
    </div>
  );
}
