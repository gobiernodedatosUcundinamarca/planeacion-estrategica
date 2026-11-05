import { ResumenEjecutivoClient } from "@/components/dashboard/resumen-ejecutivo-client";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import {
  getKpisEjecutivos,
  getDistribucionRolPreagregada,
  getDistribucionSedePreagregada,
  getRankingPreguntasPreagregado,
  getSerieTiempoPreagregada,
} from "@/repositories/encuestaRepository";

export default function ResumenEjecutivoPage() {
  const inicial = {
    kpis: getKpisEjecutivos(),
    distribucionRol: getDistribucionRolPreagregada(),
    distribucionSede: getDistribucionSedePreagregada(),
    rankingPreguntas: getRankingPreguntasPreagregado(),
    serieTiempo: getSerieTiempoPreagregada(),
  };

  return (
    <div className="flex flex-col gap-6">
      <ResumenEjecutivoClient inicial={inicial} />
      <DescargaExcel ruta="/encuesta" />
    </div>
  );
}
