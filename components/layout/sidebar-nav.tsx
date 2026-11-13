"use client";

import {EtiquetaEditorial,LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVEGACION, type ItemNavegacion } from "@/constants/navegacion";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navegacion = useRef<HTMLElement>(null);

  // Qué secciones condicionales están publicadas. Se pide desde el cliente y no
  // desde el layout porque el layout es compartido por todo el panel: leer la
  // base ahí convertiría en dinámicas todas las páginas, hoy estáticas.
  const { data: publicadas, isPending } = useQuery({
    queryKey: ["secciones-publicadas"],
    queryFn: async () => {
      const res = await fetch("/api/secciones");
      if (!res.ok) throw new Error("No se pudo consultar la publicación de las secciones");
      return res.json() as Promise<Record<string, boolean>>;
    },
    staleTime: 30_000,
  });

  /**
   * Una sección despublicada NO se quita del menú: se deja a la vista pero sin
   * enlace. Quitarla haría que el menú cambiara de forma según el estado de la
   * base, y quien conoce el sitio pensaría que la sección desapareció. Mientras
   * no se sepa el estado se muestra deshabilitada, para no ofrecer un clic que
   * no va a llevar a ninguna parte.
   */
  const estaHabilitado = (item: ItemNavegacion) =>
    !item.seccion || publicadas?.[item.seccion] === true;

  // Ítem activo = el href más específico que coincide con la ruta actual
  // (exacto o prefijo de subruta), para que las páginas de detalle
  // ("/analitica-momentos/[slug]") resalten a su padre sin activar a la vez
  // otros ítems de nivel superior que comparten prefijo (p. ej. "/encuesta").
  const hrefActivo = [...NAVEGACION]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    const menu = navegacion.current;
    const contenedor = menu?.closest<HTMLElement>('[data-scroll-navegacion]');
    if (!menu || !contenedor || isPending || !hrefActivo) return;
    let vigente = true;
    let pendiente: number | null = null;

    function mostrarSeleccion() {
      if (!menu || !contenedor || !contenedor.clientHeight) return;
      const seleccionado = menu.querySelector<HTMLElement>('[aria-current="page"]');
      if (!seleccionado) return;
      const limite = contenedor.getBoundingClientRect();
      const tarjeta = seleccionado.getBoundingClientRect();
      // Los teléfonos escalan el escritorio; scrollTop sigue usando píxeles sin escalar.
      const escala = limite.height / contenedor.clientHeight;
      if (!escala) return;
      if (tarjeta.top >= limite.top + 12 * escala && tarjeta.bottom <= limite.bottom - 12 * escala) return;
      const altura = tarjeta.height / escala;
      const espacio = altura + 24 < contenedor.clientHeight ? (contenedor.clientHeight - altura) / 2 : 12;
      const destino = contenedor.scrollTop + (tarjeta.top - limite.top) / escala - espacio;
      contenedor.scrollTo({
        top: Math.max(0, Math.min(destino, contenedor.scrollHeight - contenedor.clientHeight)),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }

    function programar() {
      if (!vigente || pendiente !== null) return;
      pendiente = requestAnimationFrame(() => { pendiente = null; mostrarSeleccion(); });
    }

    programar();
    void document.fonts?.ready.then(programar);
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(programar);
    observador?.observe(menu);
    observador?.observe(contenedor);
    return () => {
      vigente = false;
      if (pendiente !== null) cancelAnimationFrame(pendiente);
      observador?.disconnect();
    };
  }, [hrefActivo, isPending, publicadas]);

  return (
    <nav ref={navegacion} className="flex flex-col gap-1 px-3" aria-label="Navegación principal">
      {NAVEGACION.map((item) => {
        const habilitado = estaHabilitado(item);
        const activo = habilitado && item.href === hrefActivo;
        const Icono = item.icono;

        const contenido = (
          <>
            {habilitado ? (
              <Icono className="size-[18px] shrink-0" aria-hidden />
            ) : (
              <Lock className="size-[18px] shrink-0" aria-hidden />
            )}
            <span className="flex flex-col leading-tight">
              <span><EtiquetaEditorial texto={item.etiqueta}/></span>
              <span
                className={cn(
                  "text-xs font-normal",
                  activo ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {habilitado ? <EtiquetaEditorial texto={item.descripcion}/> : "No disponible por ahora"}
              </span>
            </span>
          </>
        );

        const clases = cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          !habilitado
            ? "cursor-not-allowed text-muted-foreground/60"
            : activo
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-foreground/75 hover:bg-accent hover:text-accent-foreground"
        );

        // Sin <Link> cuando está deshabilitado: un enlace con el clic anulado
        // seguiría siendo navegable con el teclado o abriéndolo en otra pestaña.
        if (!habilitado) {
          return (
            <div
              key={item.href}
              className={clases}
              aria-disabled="true"
              title="Esta sección no está disponible por ahora"
            >
              {contenido}
            </div>
          );
        }

        return (
          <div className="nav-editorial" key={item.href}><Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={activo ? "page" : undefined}
            className={clases}
          >
            {contenido}
          </Link><div className="nav-lapices"><LapizDeCatalogo texto={item.etiqueta}/><LapizDeCatalogo texto={item.descripcion}/></div></div>
        );
      })}
    </nav>
  );
}
