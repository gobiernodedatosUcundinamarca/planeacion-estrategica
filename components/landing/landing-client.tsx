"use client";
import {ControlTipografia} from "@/components/editorial/preferencias-tipograficas";
import logoPrincipal from "@/public/assets/logos/extended-logo-3.png";


import {TextoEditorial,ControlEdicion,EtiquetaEditorial,LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Network, Target, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemaPlan {
  titulo: string;
  descripcion?: string;
  icono: typeof Users2;
  href: string | null;
}

const TEMAS: TemaPlan[] = [
  {
    titulo: "Diagnóstico: Tu Voz Fundamental",
    icono: Users2,
    href: "/encuesta",
  },
  {
    titulo: "Valoración momentos",
    icono: Target,
    href: "/seguimiento",
  },
  {
    titulo: "Accesos a CAI Planeación estratégica 2027 – 2037",
    icono: Network,
    href: "/accesos-cai",
  },
];

/**
 * Los assets estáticos de /public se sirven con Cache-Control público del
 * navegador; como el nombre de archivo no cambia entre ediciones de imagen,
 * un query param de versión fuerza a los navegadores a descargar la versión
 * nueva en vez de servir la cacheada. Subir este número cada vez que se
 * reemplace alguna de estas 3 imágenes.
 */
const VERSION_ASSETS_CAMPANA = "3";

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item: Variants = {
  oculto: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function LandingClient() {
  const prefiereReducido = useReducedMotion();
  const variantesItem = prefiereReducido ? { oculto: { opacity: 1 }, visible: { opacity: 1 } } : item;
  const variantesContenedor = prefiereReducido ? { oculto: {}, visible: {} } : contenedor;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#00482B]">
      <Image
        src={`/assets/campana/fondo-verde-completo.jpg?v=${VERSION_ASSETS_CAMPANA}`}
        alt=""
        fill
        priority
        className="object-cover"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.15)_0%,transparent_35%,transparent_80%,#00301c_95%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-12 py-10">
        <motion.header
          initial={prefiereReducido ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <Image
            src={logoPrincipal}
            alt="Universidad de Cundinamarca"
            sizes="280px"
            priority
            unoptimized
            className="h-auto w-[280px] rounded-lg bg-white p-3 object-contain"
          />
          <div className="flex items-center gap-3"><span className="text-sm font-medium text-white/85">
            <TextoEditorial id="5168b937c5ba228aed2b" original={"Plan Estratégico 2027 – 2037"}/></span></div>
        </motion.header>

        <div className="flex flex-1 flex-row items-center justify-center gap-16 py-6">
          {/* Columna izquierda: mensaje + collage */}
          <div className="flex w-full max-w-xl flex-col items-start gap-8 text-left">
            <motion.div
              initial={prefiereReducido ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <h1 className="font-heading text-5xl leading-[1.05] font-bold text-white">
                <TextoEditorial id="3bb456a1bd6ec24f5e56" original={"Plan Estratégico"}/><br />
                <TextoEditorial id="a74a0b3e61d12950f504" original={"2027 – 2037"}/></h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
                <TextoEditorial id="7a14ced3032cf9c29c16" original={"Analítica de datos del Plan Estratégico"}/></p>
            </motion.div>

            <motion.div
              initial={prefiereReducido ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl"
            >
              <Image
                src={`/assets/campana/collage-estudiantes.webp?v=${VERSION_ASSETS_CAMPANA}`}
                alt="Comunidad universitaria de la Universidad de Cundinamarca"
                width={879}
                height={524}
                className="h-auto w-full drop-shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
                priority
              />
            </motion.div>
          </div>

          {/* Columna derecha: accesos */}
          <motion.div
            variants={variantesContenedor}
            initial="oculto"
            animate="visible"
            className="flex w-full max-w-md flex-col gap-3"
          >
            <motion.p
              variants={variantesItem}
              className="px-1 text-xs font-bold tracking-[0.15em] text-white/70 uppercase"
            >
              <TextoEditorial id="d86a589b14e0096470ab" original={"Accesos del plan"}/>
            </motion.p>
            {TEMAS.map((tema) => (
              <motion.div key={tema.titulo} variants={variantesItem}>
                <TemaBoton tema={tema} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.footer
          initial={prefiereReducido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-row items-center justify-between gap-2 border-t border-white/15 pt-5 text-xs text-white/70"
        >
          <div className="flex items-center gap-3"><div className="herramientas-pie" role="group" aria-label="Preferencias de texto y edición"><ControlTipografia/><ControlEdicion /></div>
          <span><TextoEditorial id="15acca8abe75d8dc8f32" original={"www.ucundinamarca.edu.co · Vigilada MinEducación"}/></span></div>
          <span><TextoEditorial id="2006a12f483e58805768" original={"Elaborado por Dirección de Planeación Institucional"}/></span>
        </motion.footer>
      </div>
    </div>
  );
}

function TemaBoton({ tema }: { tema: TemaPlan }) {
  const Icono = tema.icono;
  const disponible = Boolean(tema.href);

  const contenido = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          disponible ? "bg-white text-primary" : "bg-white/15 text-white/60"
        )}
      >
        <Icono className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className={cn("text-sm font-semibold", disponible ? "text-white" : "text-white/70")}>
          <EtiquetaEditorial texto={tema.titulo}/>
        </span>
        {tema.descripcion ? (
          <span className={cn("text-xs leading-snug", disponible ? "text-white/75" : "text-white/45")}>
            <EtiquetaEditorial texto={tema.descripcion}/>
          </span>
        ) : null}
      </span>
      {disponible ? (
        <ArrowRight className="size-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
      ) : (
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/60">
          <TextoEditorial id="c9e95e3d5cf9eb8bb707" original={"Próximamente"}/></span>
      )}
    </>
  );

  const clases = cn(
    "group flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors",
    disponible
      ? "border-white/15 bg-white/10 backdrop-blur-sm hover:bg-white/[0.18]"
      : "cursor-not-allowed border-white/10 bg-white/5"
  );

  if (!disponible) {
    return (
      <div className={clases} aria-disabled="true">
        {contenido}
      </div>
    );
  }

  return (
    <div className="tema-editorial"><Link href={tema.href!} className={clases}>
      {contenido}
    </Link><div className="tema-lapices"><LapizDeCatalogo texto={tema.titulo}/>{tema.descripcion ? <LapizDeCatalogo texto={tema.descripcion}/> : null}</div></div>
  );
}
