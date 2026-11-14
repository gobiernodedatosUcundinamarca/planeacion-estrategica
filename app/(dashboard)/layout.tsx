import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// También los módulos basados en archivos deben leer su fuente al visitarse;
// prerenderizarlos dejaría sus resultados ligados a la fecha del build.
export const dynamic = 'force-dynamic';

/**
 * Layout único y compartido por los 5 módulos del panel (encuesta, metas,
 * seguimiento, accesos-cai, analitica-momentos) — agrupados aquí vía un route
 * group ("(dashboard)", no aparece en la URL) precisamente para que
 * compartan una sola instancia de <AppShell>. Antes cada módulo tenía su
 * propio layout.tsx con su propio <AppShell>: al navegar de un módulo a otro,
 * React desmontaba y volvía a montar el <aside> completo, perdiendo la
 * posición de scroll del menú lateral (visible sobre todo en pantallas
 * bajas, donde la nav tiene su propio scroll interno). Con un único layout
 * compartido, el <aside> es el mismo nodo del DOM durante toda la
 * navegación entre estos módulos — su scroll ya no se reinicia.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
