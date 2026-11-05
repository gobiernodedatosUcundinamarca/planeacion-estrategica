import { DescargaExcel } from "@/components/layout/descarga-excel";
import type { Metadata } from "next";
import { PreguntasEstrategicasClient } from "@/components/dashboard/preguntas-estrategicas-client";
import {
  getKpisEjecutivos,
  getDistribucionRolPreagregada,
  getDistribucionSedePreagregada,
  getRankingPreguntasPreagregado,
  getSerieTiempoPreagregada,
  getRespuestasOtroPreagregadas,
} from "@/repositories/encuestaRepository";

export const metadata: Metadata = { title: "Fundamentos de planeación — Diagnóstico: Tu Voz Fundamental" };

export default function FundamentosPlaneacionPage() {
  const inicial = {
    kpis: getKpisEjecutivos(),
    distribucionRol: getDistribucionRolPreagregada(),
    distribucionSede: getDistribucionSedePreagregada(),
    rankingPreguntas: getRankingPreguntasPreagregado(),
    serieTiempo: getSerieTiempoPreagregada(),
  };

  return (
    <div className="flex flex-col gap-6">
      <PreguntasEstrategicasClient
        titulo="Fundamentos de planeación — Diagnóstico: Tu Voz Fundamental"
        descripcion="Qué debe definir un Plan Estratégico y cómo debe construirse la planeación institucional"
        preguntasIds={["P1", "P2"]}
        inicial={inicial}
        respuestasOtro={getRespuestasOtroPreagregadas()}
      />
      <DescargaExcel ruta="/encuesta/fundamentos-planeacion" />
    </div>
  );
}
