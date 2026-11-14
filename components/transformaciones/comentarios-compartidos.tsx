"use client";
import { EtiquetaFiltroEditable } from "@/components/editorial/etiqueta-filtro";
import { TextoEditorial } from "@/components/editorial/texto-editorial";
import { memo, useDeferredValue } from "react";
import { ArrowUpRight, ChevronDown, Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FUENTES_CLASIFICACION } from "@/lib/reglas/fuentes-clasificacion";
import { formatNumero } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { clasificarRespaldo } from "@/lib/reglas/momento4";
import { POSTURAS_COMENTARIOS, claveTema, valorRegistrado, type OpcionComentarios, type TemaComentarios } from "@/lib/reglas/navegacion-comentarios";
import type { RespuestaMomento4 } from "@/types/momento4";
import type { ClasificacionDocumental, MetodoClasificacion, ResumenFuentesClasificacion } from "@/types/clasificacion-documental";
type Nivel = "unidad" | "transformacion" | "grupo";
export function NivelDesplegable({ nombre, nivel, abierto, onAbrir, seleccionado, opciones, onSeleccionar }: {
  nombre: string; nivel: Nivel; abierto: Nivel | null; onAbrir: (v: Nivel | null) => void;
  seleccionado: string | null; opciones: OpcionComentarios[]; onSeleccionar: (v: string | null) => void;
}) {
  return <Collapsible open={abierto === nivel} onOpenChange={(v) => onAbrir(v ? nivel : null)}>
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-2 text-left text-sm" aria-label={nombre}>
      <span><span className="font-semibold"><EtiquetaFiltroEditable ambito="comentarios" texto={nombre}/></span><span className="ml-3 text-muted-foreground">{opciones.find((o) => o.id === seleccionado)?.nombre ?? "Todas las opciones"}</span></span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </CollapsibleTrigger>
    <CollapsibleContent><div className="flex flex-wrap gap-2 py-2" aria-label={`Opciones de ${nombre}`}>
      {seleccionado !== null ? <Button size="sm" variant="secondary" onClick={() => onSeleccionar(null)}>Ver todas</Button> : null}
      {opciones.map((o) => <Button key={o.id} variant={seleccionado === o.id ? "default" : "outline"} aria-pressed={seleccionado === o.id}
        className="h-auto min-h-9 whitespace-normal text-left" onClick={() => onSeleccionar(seleccionado === o.id ? null : o.id)}>
        {o.nombre}<span className="ml-1 text-xs opacity-75">{formatNumero(o.total)}</span>
      </Button>)}
    </div></CollapsibleContent>
  </Collapsible>;
}

export function BotonTema({ tema, activo, onClick }: { tema: TemaComentarios; activo: boolean; onClick: () => void }) {
  return <Button variant="outline" onClick={onClick} aria-pressed={activo} data-tema-clave={tema.id} data-tema-total={tema.total}
    className={cn("h-auto min-h-16 items-start justify-between gap-3 rounded-xl border-2 whitespace-normal p-3 text-left", activo ? "border-dashed border-primary bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : "border-solid border-border bg-card hover:border-primary/35 hover:bg-secondary/30")}>
    <span><span className="mb-1 block text-[11px] opacity-75">{[tema.transformacion, tema.ambito, tema.codigo].filter(Boolean).join(" · ")}</span><span>{tema.nombre}</span></span>
    <span className="flex shrink-0 flex-col items-end gap-2 text-sm font-semibold"><span>{formatNumero(tema.total)}</span>{activo ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">{"Seleccionado"}</span> : null}</span>
  </Button>;
}

export function TarjetaHallazgo({ tema, posicion, activo, className, onClick }: {
  tema: TemaComentarios; posicion: number; activo: boolean; className?: string; onClick: () => void;
}) {
  const principal = posicion === 1;
  return <Button variant="outline" onClick={onClick} aria-pressed={activo} data-tema-clave={tema.id} data-tema-total={tema.total}
    className={cn("group/hallazgo h-full min-h-40 min-w-0 flex-col items-stretch justify-between gap-4 rounded-2xl border-2 p-4 text-left whitespace-normal shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none",
      activo ? "border-dashed border-primary bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : "border-solid border-border bg-card text-card-foreground hover:border-primary/35 hover:bg-secondary/30", className)}>
    <span className="flex items-start justify-between gap-3">
      <span aria-label={`Posición ${posicion} por número de comentarios`} className={cn("flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums", principal ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>{posicion}.º</span>
      <span className="min-w-0 max-w-[85%] rounded-lg border border-primary/15 bg-secondary/70 px-2.5 py-1.5 text-right text-xs leading-snug font-semibold tracking-wide text-secondary-foreground uppercase">{[tema.transformacion, tema.ambito, tema.codigo].filter(Boolean).join(" · ")}</span>
    </span>
    <span className="flex flex-1 flex-col justify-center gap-3">
      {principal ? <span className="flex items-baseline gap-2"><span className="font-heading text-5xl leading-none font-semibold tracking-tight text-primary tabular-nums">{formatNumero(tema.total)}</span><span className="text-xs font-normal text-muted-foreground">{"comentarios"}</span></span> : null}
      <span className={cn("block font-heading leading-snug font-semibold break-words", principal ? "text-lg" : "text-sm")}>{tema.nombre}</span>
    </span>
    <span className="flex items-center justify-between gap-3 pt-3">
      {principal ? <span className="text-xs font-medium text-primary">{activo ? "Quitar selección" : "Explorar comentarios"}</span> : <span className="flex items-baseline gap-1.5"><span className="font-heading text-2xl leading-none font-semibold tracking-tight text-primary tabular-nums">{formatNumero(tema.total)}</span><span className="text-[11px] font-normal text-muted-foreground">{"comentarios"}</span></span>}
      {activo ? <span className="shrink-0 rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-foreground">{"Seleccionado"}</span> : <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><ArrowUpRight className="size-3.5 transition-transform group-hover/hallazgo:translate-x-0.5 group-hover/hallazgo:-translate-y-0.5 motion-reduce:transform-none" aria-hidden /></span>}
    </span>
  </Button>;
}

export function FiltroActivo({ texto, quitar }: { texto: string; quitar: () => void }) {
  return <Button variant="secondary" size="sm" className="h-auto max-w-full whitespace-normal py-1 text-left" onClick={quitar} aria-label={`Quitar filtro ${texto}`}>{texto}<X className="size-3 shrink-0" aria-hidden /></Button>;
}

export const ListaComentarios = memo(function ListaComentarios({ comentarios, referencias, metodo, otrasFuentes, referenciasPresentaciones }: {
  comentarios: RespuestaMomento4[]; referencias: ReadonlyMap<number, ClasificacionDocumental>;
  metodo: MetodoClasificacion; otrasFuentes: ResumenFuentesClasificacion["porComentario"];
  referenciasPresentaciones?: ReadonlyMap<number, ClasificacionDocumental>;
}) {
  // Los textos ya viajan en los datos: evitar duplicar miles de tarjetas en el HTML inicial.
  // Completarla en segundo plano permite que abrir un filtro tenga prioridad
  // durante la hidratación, sin paginación ni acción adicional del usuario.
  const completa = useDeferredValue(true, false);
  if (!comentarios.length) return <p role="status" className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground"><TextoEditorial id="8920a8d063e79de1517e" original={"No hay comentarios que cumplan todos los filtros seleccionados. Puedes quitar un filtro o volver a «Todos los comentarios»."}/></p>;
  return <ol aria-label="Comentarios" className="comentarios-originales-optimizados flex flex-col gap-3" data-testid="lista-comentarios" data-lista-completa={completa}>
    {(completa ? comentarios : comentarios.slice(0, 12)).map((r) => <ComentarioOriginal key={r.id} respuesta={r} clasificacion={referencias.get(r.id)} metodo={metodo} otrasFuentes={otrasFuentes[r.id]} presentacion={referenciasPresentaciones?.get(r.id)}/>)}
  </ol>;
});

const ComentarioOriginal = memo(function ComentarioOriginal({ respuesta: r, clasificacion: c, metodo, otrasFuentes, presentacion }: {
  respuesta: RespuestaMomento4; clasificacion?: ClasificacionDocumental;
  metodo: MetodoClasificacion; otrasFuentes?: MetodoClasificacion[];
  presentacion?: ClasificacionDocumental;
}) {
  const postura = POSTURAS_COMENTARIOS.find((p) => p.id === clasificarRespaldo(r.respondeNecesidad))!;
  return <li data-comentario-id={r.id} className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
    <div className="flex gap-2.5"><Quote className="mt-1 size-3.5 shrink-0 text-primary" aria-hidden /><div className="min-w-0 flex-1">
      <p data-texto-original className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.ajustes}</p>
      <p className="mt-2 text-xs text-muted-foreground">{valorRegistrado(r.unidadRegional)} · {r.etiqueta} · {valorRegistrado(r.tipoActor)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded border bg-background px-2 py-1" data-postura={postura.id}>{postura.nombre}</span>
        {c?.temas.length ? c.temas.map((t) => <span key={t.id} data-categoria={claveTema(r.transformacion, t.id)} className="rounded border border-primary/20 px-2 py-1 text-primary">{t.codigo ? `${t.codigo} · ` : ""}{t.nombre}</span>)
          : <span className="text-muted-foreground">{metodo === "aportes-plan" && c?.estado === "sin_contenido_revisado" ? "Sin contenido evaluable según la revisión original" : metodo === "aportes-plan" && c?.estado === "excluido_preparacion" ? "Excluido de la preparación original" : "Sin asignación temática en la fuente seleccionada"}</span>}
      </div>
      {presentacion?.temas.length ? <div className="mt-3 border-t border-primary/10 pt-2"><p className="mb-2 text-xs font-medium text-muted-foreground"><TextoEditorial id="temas-aportes-etiquetas-comentario" original="Aportes de las presentaciones"/></p><div className="flex flex-wrap gap-2">{presentacion.temas.map(t => <span key={t.id} data-aporte-presentacion={claveTema(r.transformacion,t.id)} className="rounded-lg border border-primary/25 bg-secondary px-2.5 py-1.5 text-xs text-primary"><strong className="mr-1">{t.codigo}</strong> · {t.nombre}</span>)}</div></div> : null}
      {!c?.temas.length && otrasFuentes?.some((m) => m !== metodo) ? <p className="mt-1 text-xs text-primary"><TextoEditorial id="e097e6669b57557ed89f" original={"Hay clasificaciones documentadas en otras metodologías:"}/>{otrasFuentes.filter((m) => m !== metodo).map((m) => FUENTES_CLASIFICACION.find((f) => f.id === m)!.nombre).join("; ")}.</p> : null}
      {c?.motivo ? <p className="mt-1 text-xs text-muted-foreground">{c.motivo}</p> : null}
    </div></div>
  </li>;
});
