import type { Metadata } from "next";
import { ParticipacionClient } from "@/components/dashboard/participacion-client";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import {
  getKpisEjecutivos,
  getDistribucionRolPreagregada,
  getDistribucionSedePreagregada,
  getRankingPreguntasPreagregado,
  getSerieTiempoPreagregada,
  getCombinacionesRolPreagregadas,
  getConteoPorFacultad,
} from "@/repositories/encuestaRepository";

export const metadata: Metadata = { title: "Quién participó — Diagnóstico: Tu Voz Fundamental" };

export default function ParticipacionPage() {
  const inicial = {
    kpis: getKpisEjecutivos(),
    distribucionRol: getDistribucionRolPreagregada(),
    distribucionSede: getDistribucionSedePreagregada(),
    rankingPreguntas: getRankingPreguntasPreagregado(),
    serieTiempo: getSerieTiempoPreagregada(),
  };
  const estatico = {
    combinaciones: getCombinacionesRolPreagregadas(),
    conteoFacultad: getConteoPorFacultad(),
  };

  return (
    <div className="flex flex-col gap-6">
      <ParticipacionClient inicial={inicial} estatico={estatico} />
      <DescargaExcel ruta="/encuesta/participacion" />
    </div>
  );
}
