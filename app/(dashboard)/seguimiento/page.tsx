import { DescargaExcel } from "@/components/layout/descarga-excel";
import { PanelSeguimiento } from "@/components/seguimiento/panel-seguimiento";
import { getCaiData } from "@/repositories/caiRepository";

export default function SeguimientoActividadesPage() {
  const datos = getCaiData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Valoración de momentos
        </h1>
      </div>
      <PanelSeguimiento datos={datos} />
      <DescargaExcel ruta="/seguimiento" />
    </div>
  );
}
