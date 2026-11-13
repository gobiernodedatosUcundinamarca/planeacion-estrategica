
import {ControlTipografia} from "@/components/editorial/preferencias-tipograficas";
import {TextoEditorial,ControlEdicion,EtiquetaEditorial,LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import logoPrincipal from "@/public/assets/logos/extended-logo-3.png";

/**
 * Layout único, sin variante móvil: el proyecto no usa breakpoints
 * responsivos (ver AGENTS.md) — la app siempre se ve como escritorio,
 * incluida esta barra lateral, que nunca colapsa a menú hamburguesa.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell mx-auto flex min-h-screen w-full">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar py-5">
        <Logo className="shrink-0 px-5 pb-6" />
        <div data-scroll-navegacion className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-5 pt-6">
          <div className="acciones-pie-lateral"><div className="enlace-inicio"><Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            <EtiquetaEditorial texto="Volver al inicio"/>
          </Link><LapizDeCatalogo texto="Volver al inicio"/></div>
          <div className="herramientas-pie" role="group" aria-label="Preferencias de texto y edición">
            <ControlTipografia/><ControlEdicion />
          </div></div>
          <p className="text-xs text-muted-foreground">
            <TextoEditorial id="a97043b177737b38ac32" original={"Plan Estratégico"}/><br />
            <TextoEditorial id="cc678dffe3e05dc970ac" original={"2027 – 2037"}/></p>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-border bg-background px-8">
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span><TextoEditorial id="17d7345597070d7afdf9" original={"Universidad de Cundinamarca"}/></span>
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <div className={className}><Link href="/">
      <Image
        src={logoPrincipal}
        alt="Universidad de Cundinamarca"
        sizes="216px"
        priority
        unoptimized
        className="h-auto w-full object-contain"
      />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <EtiquetaEditorial texto="Planeación estratégica 2027 – 2037"/></p>
    </Link><LapizDeCatalogo texto="Planeación estratégica 2027 – 2037"/></div>
  );
}
