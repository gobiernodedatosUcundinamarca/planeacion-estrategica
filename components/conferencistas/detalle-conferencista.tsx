"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CalendarDays, ExternalLink, Eye, GraduationCap, MapPin, Milestone, Star, Users, Video, XIcon } from "lucide-react";
import { AvatarConferencista } from "@/components/conferencistas/avatar-conferencista";
import { ValoracionesConferencista } from "@/components/conferencistas/valoraciones-conferencista";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumero } from "@/lib/formatters";
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

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};

const seccion: Variants = {
  oculto: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

interface DetalleConferencistaProps {
  conferencia: ConferenciaConValoracion | null;
  onCerrar: () => void;
}

export function DetalleConferencista({ conferencia, onCerrar }: DetalleConferencistaProps) {
  return (
    <Dialog open={conferencia !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      {conferencia ? <ContenidoDetalle key={conferencia.id} conferencia={conferencia} /> : null}
    </Dialog>
  );
}

function ContenidoDetalle({ conferencia }: { conferencia: ConferenciaConValoracion }) {
  const prefiereReducido = useReducedMotion();
  const acento = colorAcento(conferencia.nombre);
  const variants = prefiereReducido ? undefined : seccion;

  return (
    <DialogContent className="max-w-2xl gap-0 p-0" showCloseButton={false}>
      <DialogTitle className="sr-only">{conferencia.nombre}</DialogTitle>
      <DialogDescription className="sr-only">{conferencia.titulo}</DialogDescription>

      <motion.div
        variants={prefiereReducido ? undefined : contenedor}
        initial={prefiereReducido ? undefined : "oculto"}
        animate={prefiereReducido ? undefined : "visible"}
        className="flex min-h-0 flex-1 flex-col"
      >
        <CabeceraHero conferencia={conferencia} acento={acento} variants={variants} />
        {conferencia.valoracion ? (
          <Tabs defaultValue="perfil" className="flex min-h-0 flex-1 flex-col gap-0">
            <motion.div variants={variants} className="border-b border-border px-6">
              <TabsList variant="line" className="h-9">
                <TabsTrigger value="perfil">Perfil</TabsTrigger>
                <TabsTrigger value="valoraciones" className="gap-1.5">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden />
                  Valoraciones
                </TabsTrigger>
              </TabsList>
            </motion.div>
            <TabsContent value="perfil" className="flex min-h-0 flex-1 flex-col">
              <CuerpoDetalle conferencia={conferencia} acento={acento} variants={variants} />
            </TabsContent>
            <TabsContent value="valoraciones" className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
                <div className="pt-5">
                  <ValoracionesConferencista valoracion={conferencia.valoracion} acento={acento} variants={variants} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <CuerpoDetalle conferencia={conferencia} acento={acento} variants={variants} />
        )}
      </motion.div>
    </DialogContent>
  );
}

function CuerpoDetalle({
  conferencia,
  acento,
  variants,
}: {
  conferencia: ConferenciaConValoracion;
  acento: string;
  variants: Variants | undefined;
}) {
  const hayEstadisticasOEnlace =
    conferencia.asistentesPresenciales != null || conferencia.vistasRedesSociales != null || conferencia.enlace != null;

  return (
    <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
      <div className="flex flex-col gap-5 pt-5">
        <motion.div variants={variants} className="flex flex-wrap items-center gap-2">
          <InsigniasEvento conferencia={conferencia} />
        </motion.div>

        {conferencia.descripcion ? (
          <motion.p variants={variants} className="text-sm leading-relaxed text-foreground">
            {conferencia.titulo !== conferencia.descripcion ? (
              <span className="mb-1 block font-semibold text-foreground">{conferencia.titulo}</span>
            ) : null}
            {conferencia.descripcion}
          </motion.p>
        ) : null}

        {conferencia.formacionAcademica.length > 0 ? (
          <motion.div variants={variants}>
            <SeccionBullets icono={GraduationCap} titulo="Formación académica" items={conferencia.formacionAcademica} acento={acento} />
          </motion.div>
        ) : null}

        {conferencia.trayectoriaDestacada.length > 0 ? (
          <motion.div variants={variants}>
            <SeccionBullets icono={Milestone} titulo="Trayectoria destacada" items={conferencia.trayectoriaDestacada} acento={acento} />
          </motion.div>
        ) : null}

        {hayEstadisticasOEnlace ? (
          <motion.div variants={variants}>
            <PiePagina conferencia={conferencia} />
          </motion.div>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function CabeceraHero({
  conferencia,
  acento,
  variants,
}: {
  conferencia: ConferenciaConValoracion;
  acento: string;
  variants: Variants | undefined;
}) {
  return (
    <motion.div
      variants={variants}
      className="relative flex shrink-0 flex-col items-center gap-3 overflow-hidden px-6 pt-9 pb-6 text-center"
      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${acento} 14%, var(--popover)), var(--popover) 85%)` }}
    >
      <DialogClose
        render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3 bg-popover/70 backdrop-blur-sm" />}
      >
        <XIcon />
        <span className="sr-only"><TextoEditorial id="d32b4703786ee0f6eb59" original={"Cerrar"}/></span>
      </DialogClose>

      <AvatarConferencista conferencia={conferencia} tamaño={132} animado prioridad />

      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl leading-tight font-bold text-foreground">{conferencia.nombre}</h2>
        {conferencia.tituloProfesional ? (
          <p className="mx-auto max-w-md text-sm leading-snug font-medium" style={{ color: acento }}>
            {conferencia.tituloProfesional}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

function InsigniasEvento({ conferencia }: { conferencia: ConferenciaConValoracion }) {
  const IconoModalidad = conferencia.modalidad.includes("Virtual") ? Video : MapPin;
  return (
    <>
      <Badge variant="outline" className="gap-1">
        <IconoModalidad className="size-3" aria-hidden />
        {conferencia.modalidad}
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <CalendarDays className="size-3" aria-hidden />
        {conferencia.fecha}
      </Badge>
      <Badge variant="secondary" className="gap-1">
        <MapPin className="size-3" aria-hidden />
        {conferencia.ubicacion}
      </Badge>
    </>
  );
}

function PiePagina({ conferencia }: { conferencia: ConferenciaConValoracion }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {conferencia.asistentesPresenciales != null ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {formatNumero(conferencia.asistentesPresenciales)} <TextoEditorial id="a49628b4667e699f9d9f" original={"asistentes presenciales"}/></span>
        ) : null}
        {conferencia.vistasRedesSociales != null ? (
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden />
            {formatNumero(conferencia.vistasRedesSociales)} <TextoEditorial id="5942bf1fb5fb876c90dc" original={"vistas en redes"}/></span>
        ) : null}
      </div>
      {conferencia.enlace ? (
        <a
          href={conferencia.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver grabación
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function SeccionBullets({
  icono: Icono,
  titulo,
  items,
  acento,
}: {
  icono: typeof GraduationCap;
  titulo: string;
  items: string[];
  acento: string;
}) {
  return (
    <section aria-label={titulo}>
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icono className="size-3.5" style={{ color: acento }} aria-hidden />
        {titulo}
      </h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span className="mt-2 size-1 shrink-0 rounded-full" style={{ backgroundColor: acento }} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
