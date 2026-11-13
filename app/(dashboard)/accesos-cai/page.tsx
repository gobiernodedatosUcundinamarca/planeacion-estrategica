import {TextoEditorial} from "@/components/editorial/texto-editorial";
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
          <TextoEditorial id="b0cf7cfa2bf9f64b866d" original={"Accesos a CAI Planeación estratégica"}/></h1>
      </header>
      <PanelAccesosCai datos={datos} />
      <DescargaExcel ruta="/accesos-cai" />
    </div>
  );
}
