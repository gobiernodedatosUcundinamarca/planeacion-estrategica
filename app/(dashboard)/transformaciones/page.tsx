import {TextoEditorial} from "@/components/editorial/texto-editorial";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { TransformacionesActualizadas } from "@/components/transformaciones/actualizada";
import { getVistaTransformaciones } from "@/repositories/transformacionesVistaRepository";
import { DescargaExcel } from "@/components/layout/descarga-excel";
import { estaSeccionPublicada } from "@/repositories/seccionesRepository";
import { SECCION_TRANSFORMACIONES } from "@/constants/secciones";

export const metadata: Metadata = {
  title: "Trabajo en territorio con la comunidad universitaria",
};

/**
 * Sin prerenderizado: los datos se consultan en cada visita.
 *
 * Por defecto Next generaba esta página en el build, con dos consecuencias
 * malas: las respuestas quedaban congeladas en la versión desplegada —subir un
 * documento nuevo en /admin no cambiaría nada hasta el siguiente despliegue— y
 * el build pasaba a depender de que la base estuviera accesible y configurada,
 * así que un despliegue sin DATABASE_URL fallaría al compilar en vez de avisar
 * en pantalla. Es el mismo criterio que el resto del sitio con sus Excel: el
 * dato es siempre el de la siguiente petición.
 */
export const dynamic = "force-dynamic";

/**
 * Momento 4. A diferencia del resto de secciones, sus datos no salen de un
 * Excel en vivo sino de Postgres —única excepción a la regla del proyecto,
 * explicada en las reglas de la raíz—: se actualizan subiendo los documentos
 * desde la vista de administración, y aquí solo se leen.
 */
export default async function TransformacionesPage() {
  // La puerta real está aquí y no en el menú: deshabilitar el enlace sin cerrar
  // la ruta dejaría la sección accesible a quien tenga la URL guardada o pulse
  // "atrás". Se muestra un aviso dentro del panel en vez de un 404: al volver
  // atrás desde la sección, una pantalla de error parece que algo se rompió,
  // cuando en realidad la sección se retiró a propósito.
  if (!(await estaSeccionPublicada(SECCION_TRANSFORMACIONES))) {
    return <SeccionNoDisponible />;
  }

  let datos: Awaited<ReturnType<typeof getVistaTransformaciones>> | null = null;
  let error: string | null = null;
  try {
    datos = await getVistaTransformaciones();
  } catch (fallo) {
    error = fallo instanceof Error ? fallo.message : "No se pudo consultar la base de datos.";
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground"><TextoEditorial id="8b29420b7bee492f88cf" original={"Trabajo en territorio con la comunidad universitaria: Experiencia \"Transformaciones que nos conectan\" — Resultados de encuestas"}/></h1>
        <p className="text-sm text-muted-foreground">
          <TextoEditorial id="f7751788a98e7bcc4f6a" original={"Valoración de las cinco transformaciones por parte de la comunidad universitaria: quién participó, qué tanto respalda cada transformación y qué ajustes propone."}/></p>
      </header>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-medium text-foreground"><TextoEditorial id="c642ffc95e6f5596e74b" original={"No se pudieron cargar las respuestas."}/></p>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : datos ? <TransformacionesActualizadas inicial={datos}/> : null}

      <DescargaExcel ruta="/transformaciones" />
    </div>
  );
}

/**
 * Lo que se ve si la sección está retirada y aun así se llega a su dirección
 * —por el botón "atrás", un enlace guardado o un menú que todavía no se ha
 * refrescado—. Deliberadamente no revela ningún dato: solo dice que la sección
 * no está disponible y ofrece la salida.
 */
function SeccionNoDisponible() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground"><TextoEditorial id="8b29420b7bee492f88cf" original={"Trabajo en territorio con la comunidad universitaria: Experiencia \"Transformaciones que nos conectan\" — Resultados de encuestas"}/></h1>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-background text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="font-heading text-base font-medium text-foreground">
          <TextoEditorial id="f13572e21ee4b66c9345" original={"Esta sección no está disponible por ahora"}/></p>
        <p className="max-w-md text-sm text-muted-foreground">
          <TextoEditorial id="2b95aa2c5180b7db73c4" original={"Se retiró temporalmente del sitio. La información no se ha perdido: volverá a verse cuando se publique de nuevo."}/></p>
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
