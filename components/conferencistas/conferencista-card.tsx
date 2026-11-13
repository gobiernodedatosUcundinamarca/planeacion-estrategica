"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, MapPin, Star, Users, Video, Eye, ExternalLink } from "lucide-react";
import { AvatarConferencista } from "@/components/conferencistas/avatar-conferencista";
import { formatNumero } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ConferenciaConValoracion } from "@/types/conferencistas";

const PALETA_ACENTO = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
] as const;

function colorAcento(semilla: string): string {
  let hash = 0;
  for (const char of semilla) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return PALETA_ACENTO[hash % PALETA_ACENTO.length];
}

const ICONO_MODALIDAD: Record<string, typeof MapPin> = {
  Virtual: Video,
  Presencial: MapPin,
};

export function ConferencistaCard({
  conferencia,
  onSeleccionar,
  resaltada = false,
  className,
}: {
  conferencia: ConferenciaConValoracion;
  onSeleccionar: (conferencia: ConferenciaConValoracion) => void;
  /** Pulso breve para "esta es la card que buscabas" (ver búsqueda rápida del carrusel). */
  resaltada?: boolean;
  className?: string;
}) {
  const prefiereReducido = useReducedMotion();
  const esGrupo = conferencia.tipo === "Grupo";
  const hayPerfilExtendido = conferencia.formacionAcademica.length > 0 || conferencia.trayectoriaDestacada.length > 0;
  const acento = colorAcento(conferencia.nombre);
  const IconoModalidad =
    Object.entries(ICONO_MODALIDAD).find(([clave]) => conferencia.modalidad.includes(clave))?.[1] ?? Video;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onSeleccionar(conferencia)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeleccionar(conferencia);
        }
      }}
      whileHover={prefiereReducido ? undefined : { y: -5 }}
      whileTap={prefiereReducido ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ ["--borde-color" as string]: acento }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl p-px text-left [box-shadow:0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:[box-shadow:0_16px_32px_-12px_rgba(0,0,0,0.18)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        resaltada && "resaltado-pulso",
        className
      )}
    >
      {/* Borde animado: un degradado cónico gigante detrás del contenido que
          gira y sólo asoma por el hueco de 1px que deja el padding del
          wrapper — apagado hasta el hover (ver .borde-animado en globals.css). */}
      <span className="borde-animado absolute inset-[-60%]" aria-hidden />

      <div className="@container/card relative flex flex-1 flex-col rounded-[15px] bg-card ring-1 ring-foreground/10">
        <div className="flex flex-col gap-2.5 p-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                title={conferencia.modalidad}
              >
                <IconoModalidad className="size-3" aria-hidden />
                {conferencia.modalidad}
              </span>
              {conferencia.valoracion ? (
                <span
                  className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                  title={`${conferencia.valoracion.totalRespuestas} valoraciones`}
                >
                  <Star className="size-3 fill-current" aria-hidden />
                  {conferencia.valoracion.promedio.toFixed(1)}
                </span>
              ) : null}
            </div>
            {esGrupo ? (
              <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
                <TextoEditorial id="135652dce24e13601d43" original={"Grupo"}/></span>
            ) : null}
          </div>
          {/* La card mide ~25% del carrusel (siempre 4 visibles, ver
              carousel-conferencistas.tsx) — a ese ancho el nombre completo no
              cabe junto a la foto de 72px en una fila. Se consulta el ancho
              real de la card vía container query (`@container/card` arriba)
              en vez de el tamaño de pantalla del dispositivo: este layout se
              renderiza igual en teléfono que en monitor (ver app/layout.tsx),
              así que lo que importa es el espacio disponible, no el device. */}
          <div className="flex flex-col items-center gap-2 text-center @min-[300px]/card:flex-row @min-[300px]/card:items-start @min-[300px]/card:gap-3.5 @min-[300px]/card:text-left">
            <AvatarConferencista conferencia={conferencia} tamaño={72} />
            <div className="flex w-full min-w-0 flex-col items-center gap-1.5 @min-[300px]/card:w-auto @min-[300px]/card:flex-1 @min-[300px]/card:items-start @min-[300px]/card:pt-1">
              <h3 className="text-[15.5px] leading-tight font-semibold text-foreground">{conferencia.nombre}</h3>
              {conferencia.tituloProfesional ? (
                <p className="text-[12px] leading-snug font-medium" style={{ color: acento }}>
                  {conferencia.tituloProfesional}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4">
          <p className="text-[13px] leading-snug font-medium text-foreground">{conferencia.titulo}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
              {conferencia.fecha}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
              {conferencia.ubicacion}
            </span>
          </div>

          {conferencia.descripcion ? (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{conferencia.descripcion}</p>
          ) : null}

          {hayPerfilExtendido ? (
            <p
              className="text-[11.5px] font-semibold tracking-wide uppercase opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ color: acento }}
            >
              <TextoEditorial id="b5c837186f2c8d418595" original={"Ver perfil completo →"}/></p>
          ) : null}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {conferencia.asistentesPresenciales != null ? (
                <span className="inline-flex items-center gap-1" title="Asistentes presenciales">
                  <Users className="size-3.5" aria-hidden />
                  {formatNumero(conferencia.asistentesPresenciales)}
                </span>
              ) : null}
              {conferencia.vistasRedesSociales != null ? (
                <span className="inline-flex items-center gap-1" title="Vistas en redes sociales">
                  <Eye className="size-3.5" aria-hidden />
                  {formatNumero(conferencia.vistasRedesSociales)}
                </span>
              ) : null}
            </div>

            {conferencia.enlace ? (
              <a
                href={conferencia.enlace}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
              >
                Ver grabación
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
