import {ParticipacionActualizada} from "@/components/participacion-narrativa/actualizada";
import {getVistaParticipacion} from "@/repositories/participacionVistaRepository";
import "@/components/participacion-narrativa/integrada.css";
import {TextoEditorial} from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { SECCION_PARTICIPACION } from "@/constants/secciones";

export const metadata: Metadata = {
  title: "Trabajo en territorio con la comunidad universitaria - Participación",
};

/** Sin prerenderizado: mismo motivo que la sección del Momento 4 (ver ahí). */
export const dynamic = "force-dynamic";

/**
 * Participación (asistencia a las actividades en territorio). Vive en
 * Postgres igual que el Momento 4 —única excepción del proyecto—: cada tanda
 * de asistencia se sube desde /admin y aquí solo se muestra el acumulado.
 */
export default async function TransformacionesParticipacionPage() {
  if (!(await estaSeccionPublicada(SECCION_PARTICIPACION))) {
    return <SeccionNoDisponible />;
  }

  let datos: Awaited<ReturnType<typeof getVistaParticipacion>> | null = null;
  let error: string | null = null;
  try {
    datos = await getVistaParticipacion();
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo consultar la base de datos.";
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground"><TextoEditorial id="d1135eda5eef64db5238" original={"No se pudieron cargar los registros."}/></p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : datos ? (
        <div className="participacion-integrada"><ParticipacionActualizada inicial={datos}/></div>
      ) : null}

      <DescargaExcel ruta="/transformaciones-participacion" />
    </div>
  );
}

/** Igual criterio que `SeccionNoDisponible` de la página del Momento 4. */
function SeccionNoDisponible() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground"><TextoEditorial id="7492ba524981089ee25b" original={"Trabajo en territorio con la comunidad universitaria: Experiencia \"Transformaciones que nos conectan\" - Participación"}/></h1>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-background text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="font-heading text-base font-medium text-foreground">
          <TextoEditorial id="c3ebcb41ef889c3d2bf2" original={"Esta sección no está disponible por ahora"}/></p>
        <p className="max-w-md text-sm text-muted-foreground">
          <TextoEditorial id="050f07009e055fd05eac" original={"Se retiró temporalmente del sitio. La información no se ha perdido: volverá a verse cuando se publique de nuevo."}/></p>
        <Link
          href="/encuesta"
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
