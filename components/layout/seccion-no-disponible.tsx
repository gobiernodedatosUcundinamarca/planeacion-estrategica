import {TextoEditorial} from "@/components/editorial/texto-editorial";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

/**
 * Lo que se ve si una sección publicable está retirada y aun así se llega a su
 * dirección —por el botón "atrás", un enlace guardado o un menú que todavía no
 * se refrescó—. No revela ningún dato: dice que la sección no está disponible y
 * ofrece la salida. Mismo criterio que la página de las transformaciones.
 */
export function SeccionNoDisponible({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold text-foreground">{titulo}</h1>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-background text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </span>
        <p className="font-heading text-base font-medium text-foreground"><TextoEditorial id="4c4b71657bc53d969446" original={"Esta sección no está disponible por ahora"}/></p>
        <p className="max-w-md text-sm text-muted-foreground">
          <TextoEditorial id="a56930bd07cad3ed2795" original={"Se retiró temporalmente del sitio. La información no se ha perdido: volverá a verse cuando se publique de nuevo."}/></p>
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
