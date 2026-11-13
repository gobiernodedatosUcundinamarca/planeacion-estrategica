"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { useState } from "react";
import { Activity, CalendarRange, Percent, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi/kpi-card";
import { formatNumero, formatPorcentaje } from "@/lib/formatters";
import { DonutAvance } from "@/components/seguimiento/donut-avance";
import { ListaActividades } from "@/components/seguimiento/lista-actividades";
import { DetalleActividad } from "@/components/seguimiento/detalle-actividad";
import { MatrizParticipantes } from "@/components/seguimiento/matriz-participantes";
import type { Actividad, CaiData } from "@/types/cai";

export function PanelSeguimiento({ datos }: { datos: CaiData }) {
  const [vista, setVista] = useState<"general" | "actividades">("general");
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {vista === "general" ? (
        <>
          {/* Franja de KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard etiqueta="Avance general" valor={formatPorcentaje(datos.avanceGeneral)} icono={Percent} />
            <KpiCard
              etiqueta="Actividades"
              valor={formatNumero(datos.totalActividades)}
              detalle="incluye Aceptación PAD"
              icono={Activity}
            />
            <KpiCard
              etiqueta="Momentos totales"
              valor={formatNumero(datos.totalMomentos)}
              icono={CalendarRange}
            />
            <KpiCard
              etiqueta="Participantes"
              valor={formatNumero(datos.totalParticipantes)}
              detalle={`${formatNumero(datos.participantesCompletos)} con todo finalizado`}
              icono={Users}
            />
          </div>

          {/* Anillo de avance general */}
          <Card>
            <CardHeader className="items-center text-center">
              <CardTitle className="text-base"><TextoEditorial id="cd5463d981e41240028d" original={"Avance general de participación"}/></CardTitle>
              <p className="text-xs text-muted-foreground">
                <TextoEditorial id="a84cccccd9c171d355e7" original={"Porcentaje de actividades finalizadas sobre el total de registros persona × actividad"}/></p>
            </CardHeader>
            <CardContent className="pb-8">
              <DonutAvance
                avanceGeneral={datos.avanceGeneral}
                totalFinalizados={datos.totalFinalizados}
                totalNoFinalizados={datos.totalNoFinalizados}
                onVerDetalle={() => setVista("actividades")}
              />
            </CardContent>
          </Card>

          {/* Matriz participante × actividad con reincidencia */}
          <MatrizParticipantes datos={datos} />
        </>
      ) : (
        <ListaActividades
          actividades={datos.actividades}
          totalParticipantes={datos.totalParticipantes}
          onVolver={() => setVista("general")}
          onSeleccionar={setActividadSeleccionada}
        />
      )}

      <DetalleActividad actividad={actividadSeleccionada} onCerrar={() => setActividadSeleccionada(null)} />
    </div>
  );
}
