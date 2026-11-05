import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Blocks, LayoutDashboard, MapPinned, Network, Users, UserCheck, Compass, Target, Mic2, ThumbsUp, Sparkles } from "lucide-react";
import {
  SECCION_IA_ADMINISTRATIVOS,
  SECCION_PARTICIPACION,
  SECCION_TRANSFORMACIONES,
  SECCION_VALORACION_TERRITORIO,
} from "@/constants/secciones";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
  /**
   * Id de la sección cuya publicación se controla desde la vista de
   * administración. Si está presente, el enlace solo aparece cuando esa sección
   * está publicada. Los ítems sin este campo se muestran siempre.
   */
  seccion?: string;
}

export const NAVEGACION: ItemNavegacion[] = [
  {
    href: "/encuesta",
    etiqueta: "Diagnóstico: Tu Voz Fundamental",
    descripcion: "Panorama general de la participación",
    icono: LayoutDashboard,
  },
  {
    href: "/encuesta/participacion",
    etiqueta: "Quién participó — Diagnóstico: Tu Voz Fundamental",
    descripcion: "Rol, sede, facultad y programa",
    icono: Users,
  },
  {
    href: "/encuesta/fundamentos-planeacion",
    etiqueta: "Fundamentos de planeación — Diagnóstico: Tu Voz Fundamental",
    descripcion: "Qué debe definir y cómo construir la planeación",
    icono: Blocks,
  },
  {
    href: "/encuesta/vision-estrategica",
    etiqueta: "Visión estratégica — Diagnóstico: Tu Voz Fundamental",
    descripcion: "Decisiones a futuro y visión a 10 años",
    icono: Compass,
  },
  {
    href: "/metas",
    etiqueta: "Metas — Diagnóstico: Tu Voz Fundamental",
    descripcion: "Cumplimiento de metas por categoría",
    icono: Target,
  },
  {
    href: "/seguimiento",
    etiqueta: "Valoración momentos",
    descripcion: "Seguimiento y avance por actividad",
    icono: Activity,
  },
  {
    href: "/conferencistas",
    etiqueta: "Ciclos de Diálogo Estratégico",
    descripcion: "Jornadas y conferencias del Plan Estratégico",
    icono: Mic2,
  },
  {
    href: "/analitica-momentos",
    etiqueta: "Analítica actividades momentos",
    descripcion: "Valoración por actividad y momento",
    icono: BarChart3,
  },
  {
    href: "/accesos-cai",
    etiqueta: "Accesos a CAI",
    descripcion: "Evolución de accesos",
    icono: Network,
  },
  {
    href: "/transformaciones",
    etiqueta: "Trabajo en territorio con la comunidad universitaria",
    descripcion: "Experiencia “Transformaciones que nos conectan” — Resultados de encuestas",
    icono: MapPinned,
    seccion: SECCION_TRANSFORMACIONES,
  },
  {
    href: "/transformaciones-participacion",
    etiqueta: "Trabajo en territorio con la comunidad universitaria",
    descripcion: "Experiencia “Transformaciones que nos conectan” - Participación",
    icono: UserCheck,
    seccion: SECCION_PARTICIPACION,
  },
  {
    href: "/valoracion-territorio",
    etiqueta: "Valoración de la experiencia en territorio",
    descripcion: "Qué tanto ayudó la experiencia y qué mejorar",
    icono: ThumbsUp,
    seccion: SECCION_VALORACION_TERRITORIO,
  },
  {
    href: "/ia-administrativos",
    etiqueta: "Uso de IA en procesos administrativos",
    descripcion: "Diagnóstico del uso de inteligencia artificial",
    icono: Sparkles,
    seccion: SECCION_IA_ADMINISTRATIVOS,
  },
];
