"use client";

import {TextoEditorial} from "@/components/editorial/texto-editorial";
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChartNoAxesCombined, ChevronDown, MessageSquareQuote, Quote, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUENTES_CLASIFICACION, esMetodoClasificacion } from "@/lib/reglas/fuentes-clasificacion";
import { formatNumero } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { clasificarRespaldo, normalizar } from "@/lib/reglas/momento4";
import {
  TODOS_LOS_COMENTARIOS, POSTURAS_COMENTARIOS, alternarTema, claveTema,
  comentariosExistentes, contarPosturas, contarTemas, expandirClasificacion,
  filtrarComentarios, opcionesComentarios, seleccionarNivel, valorRegistrado,
  type FiltrosComentarios, type OpcionComentarios, type TemaComentarios,
} from "@/lib/reglas/navegacion-comentarios";
import type { RespuestaMomento4 } from "@/types/momento4";
import type { ClasificacionDocumental, ClasificacionDocumentalCompacta, MetodoClasificacion, ResumenFuentesClasificacion } from "@/types/clasificacion-documental";
import "./comentarios-originales.css";

type Nivel = "unidad" | "transformacion" | "grupo";

export function ExploradorComentarios({ respuestas, clasificacion, errorClasificacion, resumenFuentes }: {
  respuestas: RespuestaMomento4[];
  clasificacion: ClasificacionDocumentalCompacta;
  errorClasificacion: boolean;
  resumenFuentes: ResumenFuentesClasificacion;
}) {
  const [filtros, setFiltros] = useState<FiltrosComentarios>(TODOS_LOS_COMENTARIOS);
  const [abierto, setAbierto] = useState<Nivel | null>("unidad");
  const [buscarTema, setBuscarTema] = useState("");
  const [metodo, setMetodo] = useState<MetodoClasificacion>("aportes-plan");
  const [datosClasificacion, setDatosClasificacion] = useState(clasificacion);
  const [cargandoFuente, setCargandoFuente] = useState<MetodoClasificacion | null>(null);
  const [errorFuente, setErrorFuente] = useState("");
  const peticionFuente = useRef<AbortController | null>(null);
  const secuenciaFuente = useRef(0);
  const region = useRef<HTMLElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = barra.current;
    const contenedor = region.current;
    const marco = elemento?.closest("#app-frame");
    if (!elemento || !contenedor || !marco) return;
    let desplazamiento = 0;
    let cuadro = 0;
    function actualizarAnclaje() {
      cuadro = 0;
      const escala = new DOMMatrixReadOnly(getComputedStyle(marco!).transform).a || 1;
      const inicio = elemento!.getBoundingClientRect().top - desplazamiento * escala;
      const cabecera = marco!.querySelector("header")?.getBoundingClientRect().height ?? 64 * escala;
      // El marco absoluto escalado de escritorio no conserva sticky en WebKit móvil.
      // Se compensa solo esta barra, manteniendo la escala y el flujo del sitio.
      desplazamiento = Math.max(0, (cabecera + 8 * escala - inicio) / escala);
      elemento!.style.transform = desplazamiento ? `translateY(${desplazamiento}px)` : "";
    }
    function programar() { if (!cuadro) cuadro = requestAnimationFrame(actualizarAnclaje); }
    const observador = new ResizeObserver(programar);
    observador.observe(contenedor);
    observador.observe(elemento);
    window.addEventListener("scroll", programar, { passive: true, capture: true });
    window.addEventListener("resize", programar);
    actualizarAnclaje();
    return () => {
      cancelAnimationFrame(cuadro); observador.disconnect();
      window.removeEventListener("scroll", programar, true); window.removeEventListener("resize", programar);
      elemento.style.transform = "";
    };
  }, []);
  const comentarios = useMemo(() => comentariosExistentes(respuestas).sort((a, b) =>
    (b.fechaInicio ?? "").localeCompare(a.fechaInicio ?? "") || b.id - a.id), [respuestas]);
  const referenciasComunes = useMemo(() => expandirClasificacion(clasificacion), [clasificacion]);
  const fuentesPorComentario = useMemo(() => {
    const fuentes = Object.fromEntries(Object.entries(resumenFuentes.porComentario).map(([id, metodos]) => [id, [...metodos]]));
    for (const [id, referencia] of referenciasComunes) {
      if (referencia.temas.length) (fuentes[id] ??= []).push("aportes-plan");
    }
    return fuentes;
  }, [resumenFuentes, referenciasComunes]);
  const referencias = useMemo(() => expandirClasificacion(datosClasificacion), [datosClasificacion]);
  const opciones = useMemo(() => opcionesComentarios(comentarios, filtros), [comentarios, filtros]);
  const filtrados = useMemo(() => filtrarComentarios(comentarios, referencias, filtros), [comentarios, referencias, filtros]);
  const temas = useMemo(() => contarTemas(filtrados, referencias), [filtrados, referencias]);
  const catalogo = useMemo(() => new Map(contarTemas(comentarios, referencias).map((t) => [t.id, t])), [comentarios, referencias]);
  const posturas = useMemo(() => contarPosturas(filtrarComentarios(comentarios, referencias, { ...filtros, postura: null })), [comentarios, referencias, filtros]);
  const sinTemaRegistros = useMemo(() => filtrarComentarios(comentarios, referencias, { ...filtros, temas: [], sinTema: true }), [comentarios, referencias, filtros]);
  const sinTema = sinTemaRegistros.length;
  const conOtraFuente = sinTemaRegistros.filter((r) => fuentesPorComentario[r.id]?.some((m) => m !== metodo)).length;
  const general = metodo === "aportes-plan" && !filtros.unidad && !filtros.transformacion && !filtros.grupo && !filtros.temas.length && !filtros.sinTema && !filtros.postura && !filtros.busqueda;
  const fuenteActiva = FUENTES_CLASIFICACION.find((f) => f.id === metodo)!;
  const top = temas.slice(0, 5);
  const otros = temas.slice(5).filter((t) => normalizar(`${t.codigo} ${t.nombre} ${t.transformacion}`).includes(normalizar(buscarTema)));

  function seleccionar(nivel: Nivel, valor: string | null) {
    setFiltros((previos) => seleccionarNivel(previos, nivel, valor));
    setAbierto(valor === null ? nivel : nivel === "unidad" ? "transformacion" : nivel === "transformacion" ? "grupo" : null);
  }
  function restablecer() {
    secuenciaFuente.current += 1;
    peticionFuente.current?.abort();
    setCargandoFuente(null);
    setMetodo("aportes-plan"); setDatosClasificacion(clasificacion); setErrorFuente("");
    setFiltros(TODOS_LOS_COMENTARIOS);
    setBuscarTema("");
    setAbierto("unidad");
    region.current?.scrollIntoView({ block: "start" });
  }
  async function cambiarFuente(nuevo: MetodoClasificacion) {
    const secuencia = ++secuenciaFuente.current;
    peticionFuente.current?.abort();
    setErrorFuente("");
    if (nuevo === "aportes-plan") {
      setMetodo(nuevo); setDatosClasificacion(clasificacion); setCargandoFuente(null);
      setFiltros((p) => ({ ...p, temas: [], sinTema: false })); setBuscarTema(""); return;
    }
    const controlador = new AbortController(); peticionFuente.current = controlador;
    setCargandoFuente(nuevo);
    try {
      const respuesta = await fetch(`/api/clasificaciones-comentarios?metodo=${nuevo}`, { signal: controlador.signal });
      if (!respuesta.ok) throw new Error("Fuente no disponible");
      const datos: ClasificacionDocumentalCompacta = await respuesta.json();
      if (secuencia !== secuenciaFuente.current) return;
      setMetodo(nuevo); setDatosClasificacion(datos);
      setFiltros((p) => ({ ...p, temas: [], sinTema: false })); setBuscarTema("");
    } catch {
      if (!controlador.signal.aborted && secuencia === secuenciaFuente.current) setErrorFuente("No se pudo cargar esta fuente. Se conserva la clasificación que estabas consultando.");
    } finally { if (secuencia === secuenciaFuente.current) setCargandoFuente(null); }
  }
  const etiquetaTransformacion = opciones.transformaciones.find((t) => t.id === filtros.transformacion)?.nombre;

  return <section ref={region} id="explorador-comentarios" aria-label="Consulta de comentarios" className="flex scroll-mt-20 flex-col gap-4">
    <div ref={barra} data-barra-comentarios className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
      <Button size="lg" variant={general ? "default" : "outline"} aria-label="Todos los comentarios" aria-pressed={general} onClick={restablecer}>
        <MessageSquareQuote aria-hidden />Todos los comentarios <span className="ml-1 rounded bg-current/10 px-2 py-0.5">{formatNumero(comentarios.length)}</span>
        {!general ? <RotateCcw className="ml-1 size-3.5" aria-hidden /> : null}
      </Button>
      <p role="status" aria-live="polite" data-testid="conteo-comentarios" className="text-sm text-muted-foreground">
        <strong className="text-foreground">{formatNumero(filtrados.length)}</strong> de {formatNumero(comentarios.length)} <TextoEditorial id="bb6090e1b63e04bacb1b" original={"comentarios"}/></p>
    </div>

    <Card className="gap-0 border-border/70 py-0">
      <CardContent className="px-4 py-3">
        <NivelDesplegable nombre="1. Unidad regional" nivel="unidad" abierto={abierto} onAbrir={setAbierto}
          seleccionado={filtros.unidad} opciones={opciones.unidades} onSeleccionar={(v) => seleccionar("unidad", v)} />
        {filtros.unidad !== null ? <div className="ml-4 border-l-2 border-primary/15 pl-3">
          <NivelDesplegable nombre="2. Transformación" nivel="transformacion" abierto={abierto} onAbrir={setAbierto}
            seleccionado={filtros.transformacion} opciones={opciones.transformaciones} onSeleccionar={(v) => seleccionar("transformacion", v)} />
          {filtros.transformacion !== null ? <div className="ml-4 border-l-2 border-primary/15 pl-3">
            <NivelDesplegable nombre="3. Grupo de interés" nivel="grupo" abierto={abierto} onAbrir={setAbierto}
              seleccionado={filtros.grupo} opciones={opciones.grupos} onSeleccionar={(v) => seleccionar("grupo", v)} />
          </div> : null}
        </div> : null}
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <Input aria-label="Buscar en los comentarios originales" placeholder="Buscar en el texto original de los comentarios" value={filtros.busqueda}
            onChange={(e) => setFiltros((p) => ({ ...p, busqueda: e.target.value }))} className="max-w-xl" />
        </div>
      </CardContent>
    </Card>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium">{general ? "Sin filtros activos" : "Filtros activos"}</p>
      <Button variant="outline" disabled={general && !cargandoFuente && !buscarTema} onClick={restablecer} aria-label="Limpiar todos los filtros">
        <RotateCcw className="size-3.5" aria-hidden />Limpiar todos los filtros
      </Button>
    </div>
    {!general ? <div aria-label="Filtros activos" className="flex flex-wrap items-center gap-2 text-xs">
      {metodo !== "aportes-plan" ? <FiltroActivo texto={fuenteActiva.nombre} quitar={() => void cambiarFuente("aportes-plan")} /> : null}
      {filtros.unidad ? <FiltroActivo texto={filtros.unidad} quitar={() => seleccionar("unidad", null)} /> : null}
      {filtros.transformacion ? <FiltroActivo texto={etiquetaTransformacion ?? filtros.transformacion} quitar={() => seleccionar("transformacion", null)} /> : null}
      {filtros.grupo ? <FiltroActivo texto={filtros.grupo} quitar={() => seleccionar("grupo", null)} /> : null}
      {filtros.temas.map((id) => { const t = catalogo.get(id); return <FiltroActivo key={id} texto={t ? [t.codigo, t.nombre].filter(Boolean).join(" · ") : id} quitar={() => setFiltros((p) => alternarTema(p, id))} />; })}
      {filtros.sinTema ? <FiltroActivo texto="Sin asignación en esta clasificación" quitar={() => setFiltros((p) => ({ ...p, sinTema: false }))} /> : null}
      {filtros.postura ? <FiltroActivo texto={POSTURAS_COMENTARIOS.find((p) => p.id === filtros.postura)!.nombre} quitar={() => setFiltros((p) => ({ ...p, postura: null }))} /> : null}
      {filtros.busqueda ? <FiltroActivo texto={`Texto: ${filtros.busqueda}`} quitar={() => setFiltros((p) => ({ ...p, busqueda: "" }))} /> : null}
    </div> : null}

    <Card className="gap-0 border-border/70 py-0">
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3 border-b pb-3">
          <label className="text-sm font-medium" htmlFor="fuente-clasificacion"><TextoEditorial id="b1a908de2485e8e17479" original={"Clasificación consultada"}/></label>
            <Select modal={false} value={metodo} disabled={cargandoFuente !== null} onValueChange={(v) => { if (v && esMetodoClasificacion(v)) void cambiarFuente(v); }}>
            <SelectTrigger id="fuente-clasificacion" aria-label="Clasificación consultada" className="w-[480px]"><SelectValue>{() => fuenteActiva.nombre}</SelectValue></SelectTrigger>
            <SelectContent>{FUENTES_CLASIFICACION.filter((f) => f.id === "aportes-plan" || resumenFuentes.disponibles.some((d) => d.metodo === f.id)).map((f) => <SelectItem key={f.id} value={f.id}>{f.nombre}</SelectItem>)}</SelectContent>
          </Select>
          {cargandoFuente ? <span role="status" className="text-xs text-muted-foreground"><TextoEditorial id="65ef8671c16f31a5be5f" original={"Consultando la fuente documental…"}/></span> : null}
          <p className="w-full text-xs text-muted-foreground">{fuenteActiva.descripcion} <TextoEditorial id="c0704ba041b14452ad7d" original={"Al cambiar de fuente se conservan los filtros de regional, transformación, grupo y postura."}/></p>
          {errorFuente ? <p role="alert" className="text-sm text-destructive">{errorFuente}</p> : null}
        </div>
        {(metodo === "aportes-plan" && errorClasificacion) || !datosClasificacion.disponible ? <p className="text-sm text-muted-foreground"><TextoEditorial id="ac7e31ef5efe0c68f71e" original={"La clasificación documental no está disponible. Todos los comentarios originales siguen accesibles."}/></p> : null}
        <section aria-labelledby="titulo-hallazgos" className="rounded-2xl border border-primary/15 bg-linear-to-br from-secondary/65 via-card to-card p-5">
          <div className="mb-5 flex items-start justify-between gap-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-card text-primary shadow-sm"><ChartNoAxesCombined className="size-5" aria-hidden /></span>
              <div><h2 id="titulo-hallazgos" className="font-heading text-xl font-semibold tracking-tight"><TextoEditorial id="6506d09d88732c8e754b" original={"Principales hallazgos"}/></h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground"><TextoEditorial id="b9491957d1d217e1171d" original={"Los cinco temas con más comentarios de la selección actual. Selecciona uno o varios para explorar los aportes que coincidan con todos."}/></p></div>
            </div>
            <span className={cn("mt-1 shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium", filtros.temas.length ? "border-primary bg-primary text-primary-foreground" : "border-primary/15 bg-card text-primary")} aria-live="polite">
              {filtros.temas.length ? `${filtros.temas.length} ${filtros.temas.length === 1 ? "tema seleccionado" : "temas seleccionados"}` : top.length === 1 ? "1 tema destacado" : `${top.length} temas destacados`}
            </span>
          </div>
          <div className={cn("grid gap-3", top.length === 1 ? "grid-cols-1" : top.length === 2 ? "grid-cols-2" : "grid-cols-3")} data-testid="top-temas">
            {top.map((t, i) => <TarjetaHallazgo key={t.id} tema={t} posicion={i + 1} activo={filtros.temas.includes(t.id)}
              className={top.length > 3 && i === 0 ? "row-span-2" : top.length === 4 && i === 3 ? "col-span-2" : undefined}
              onClick={() => setFiltros((p) => alternarTema(p, t.id))} />)}
          </div>
          {!top.length ? <p className="rounded-xl border border-dashed border-primary/20 bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground"><TextoEditorial id="71f47252a0ca1dc55d97" original={"No hay temas registrados para esta combinación."}/></p> : null}
        </section>
        {temas.length > 5 ? <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 py-2 text-sm font-medium text-primary">Ver los demás temas ({formatNumero(temas.length - 5)})<ChevronDown className="size-4" aria-hidden /></CollapsibleTrigger>
          <CollapsibleContent>
            <Input aria-label="Buscar un tema registrado" placeholder="Buscar por código o nombre del tema" value={buscarTema} onChange={(e) => setBuscarTema(e.target.value)} className="mb-3 max-w-xl" />
            <div className="grid grid-cols-2 gap-2 pb-2" data-testid="otros-temas">{otros.map((t) => <BotonTema key={t.id} tema={t} activo={filtros.temas.includes(t.id)} onClick={() => setFiltros((p) => alternarTema(p, t.id))} />)}</div>
            {!otros.length ? <p className="pb-3 text-sm text-muted-foreground"><TextoEditorial id="dbee99ee421b517151df" original={"No hay otros temas que coincidan con la búsqueda."}/></p> : null}
          </CollapsibleContent>
        </Collapsible> : null}
        {sinTema > 0 || filtros.sinTema ? <Button variant={filtros.sinTema ? "default" : "ghost"} className="w-fit" aria-pressed={filtros.sinTema}
          onClick={() => setFiltros((p) => ({ ...p, temas: [], sinTema: !p.sinTema }))}>Sin asignación en esta clasificación · {formatNumero(sinTema)}</Button> : null}
        {sinTema > 0 && resumenFuentes.disponibles.length > 0 ? <p data-testid="conciliacion-fuentes" className="text-xs text-muted-foreground">
          <TextoEditorial id="0cd399b4e250995e67c2" original={"De esos"}/>{formatNumero(sinTema)} <TextoEditorial id="e2eb04fd056743830fd4" original={"comentarios,"}/>{formatNumero(conOtraFuente)} <TextoEditorial id="280e3d8b0fabe37027f4" original={"tienen una clasificación documentada en otra metodología y"}/>{formatNumero(sinTema - conOtraFuente)} <TextoEditorial id="70e81684a0e7dcc41519" original={"no tienen asignación temática verificable en las fuentes auditadas. Las clasificaciones se consultan por separado; no son equivalencias entre categorías."}/></p> : null}
        <p className="text-xs text-muted-foreground"><TextoEditorial id="cb2a46721244981c97a4" original={"Un comentario puede tener varios temas. Al seleccionar varios, se muestran los que cumplen todos; los totales cuentan cada comentario una sola vez."}/></p>
        <div className="border-t pt-3">
          <h3 className="mb-2 text-sm font-medium"><TextoEditorial id="ae46ebd2be98c8b8b57e" original={"Nivel de acuerdo registrado"}/></h3>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por nivel de acuerdo">
            <Button size="sm" variant={filtros.postura === null ? "secondary" : "outline"} aria-pressed={filtros.postura === null}
              onClick={() => setFiltros((p) => ({ ...p, postura: null }))}>Todos los niveles</Button>
            {POSTURAS_COMENTARIOS.map((p) => <Button key={p.id} size="sm" aria-pressed={filtros.postura === p.id}
              variant={filtros.postura === p.id ? "default" : "outline"} disabled={!posturas[p.id] && filtros.postura !== p.id}
              onClick={() => setFiltros((previos) => ({ ...previos, postura: previos.postura === p.id ? null : p.id }))}>
              {p.nombre} · {formatNumero(posturas[p.id])}
            </Button>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground"><TextoEditorial id="e732c9b518757a656448" original={"La postura procede de la respuesta del formulario, sin inferirla del comentario."}/></p>
        </div>
      </CardContent>
    </Card>

    <div className="flex items-center justify-between gap-3"><h2 className="font-heading text-lg font-semibold"><TextoEditorial id="6e15162168e3b1815131" original={"Comentarios originales"}/></h2>
      <span className="text-sm text-muted-foreground">{formatNumero(filtrados.length)} <TextoEditorial id="7901e92766fdf75dee52" original={"resultados · Total general:"}/>{formatNumero(comentarios.length)}</span></div>
    <ListaComentarios comentarios={filtrados} referencias={referencias} metodo={metodo} otrasFuentes={fuentesPorComentario} />
  </section>;
}

function NivelDesplegable({ nombre, nivel, abierto, onAbrir, seleccionado, opciones, onSeleccionar }: {
  nombre: string; nivel: Nivel; abierto: Nivel | null; onAbrir: (v: Nivel | null) => void;
  seleccionado: string | null; opciones: OpcionComentarios[]; onSeleccionar: (v: string | null) => void;
}) {
  return <Collapsible open={abierto === nivel} onOpenChange={(v) => onAbrir(v ? nivel : null)}>
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-2 text-left text-sm" aria-label={nombre}>
      <span><span className="font-semibold">{nombre}</span><span className="ml-3 text-muted-foreground">{opciones.find((o) => o.id === seleccionado)?.nombre ?? "Todas las opciones"}</span></span>
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

function BotonTema({ tema, activo, onClick }: { tema: TemaComentarios; activo: boolean; onClick: () => void }) {
  return <Button variant="outline" onClick={onClick} aria-pressed={activo} data-tema-clave={tema.id} data-tema-total={tema.total}
    className={cn("h-auto min-h-16 items-start justify-between gap-3 rounded-xl border-2 whitespace-normal p-3 text-left", activo ? "border-dashed border-primary bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : "border-solid border-border bg-card hover:border-primary/35 hover:bg-secondary/30")}>
    <span><span className="mb-1 block text-[11px] opacity-75">{[tema.transformacion, tema.ambito, tema.codigo].filter(Boolean).join(" · ")}</span><span>{tema.nombre}</span></span>
    <span className="flex shrink-0 flex-col items-end gap-2 text-sm font-semibold"><span>{formatNumero(tema.total)}</span>{activo ? <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">{"Seleccionado"}</span> : null}</span>
  </Button>;
}

function TarjetaHallazgo({ tema, posicion, activo, className, onClick }: {
  tema: TemaComentarios; posicion: number; activo: boolean; className?: string; onClick: () => void;
}) {
  const principal = posicion === 1;
  return <Button variant="outline" onClick={onClick} aria-pressed={activo} data-tema-clave={tema.id} data-tema-total={tema.total}
    className={cn("group/hallazgo h-full min-h-40 min-w-0 flex-col items-stretch justify-between gap-4 rounded-2xl border-2 p-4 text-left whitespace-normal shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none",
      activo ? "border-dashed border-primary bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : "border-solid border-border bg-card text-card-foreground hover:border-primary/35 hover:bg-secondary/30", className)}>
    <span className="flex items-start justify-between gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold tabular-nums", principal ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>{String(posicion).padStart(2, "0")}</span>
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

function FiltroActivo({ texto, quitar }: { texto: string; quitar: () => void }) {
  return <Button variant="secondary" size="sm" className="h-auto max-w-full whitespace-normal py-1 text-left" onClick={quitar} aria-label={`Quitar filtro ${texto}`}>{texto}<X className="size-3 shrink-0" aria-hidden /></Button>;
}

const ListaComentarios = memo(function ListaComentarios({ comentarios, referencias, metodo, otrasFuentes }: {
  comentarios: RespuestaMomento4[]; referencias: ReadonlyMap<number, ClasificacionDocumental>;
  metodo: MetodoClasificacion; otrasFuentes: ResumenFuentesClasificacion["porComentario"];
}) {
  // Los textos ya viajan en los datos: evitar duplicar miles de tarjetas en el HTML inicial.
  // Completarla en segundo plano permite que abrir un filtro tenga prioridad
  // durante la hidratación, sin paginación ni acción adicional del usuario.
  const completa = useDeferredValue(true, false);
  if (!comentarios.length) return <p role="status" className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground"><TextoEditorial id="8920a8d063e79de1517e" original={"No hay comentarios que cumplan todos los filtros seleccionados. Puedes quitar un filtro o volver a «Todos los comentarios»."}/></p>;
  return <ol aria-label="Comentarios originales" className="comentarios-originales-optimizados flex flex-col gap-3" data-testid="lista-comentarios" data-lista-completa={completa}>
    {(completa ? comentarios : comentarios.slice(0, 12)).map((r) => <ComentarioOriginal key={r.id} respuesta={r} clasificacion={referencias.get(r.id)} metodo={metodo} otrasFuentes={otrasFuentes[r.id]} />)}
  </ol>;
});

const ComentarioOriginal = memo(function ComentarioOriginal({ respuesta: r, clasificacion: c, metodo, otrasFuentes }: {
  respuesta: RespuestaMomento4; clasificacion?: ClasificacionDocumental;
  metodo: MetodoClasificacion; otrasFuentes?: MetodoClasificacion[];
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
      {!c?.temas.length && otrasFuentes?.some((m) => m !== metodo) ? <p className="mt-1 text-xs text-primary"><TextoEditorial id="e097e6669b57557ed89f" original={"Hay clasificaciones documentadas en otras metodologías:"}/>{otrasFuentes.filter((m) => m !== metodo).map((m) => FUENTES_CLASIFICACION.find((f) => f.id === m)!.nombre).join("; ")}<TextoEditorial id="682eca5987a98f40396c" original={". Puedes consultarlas cambiando «Clasificación consultada»."}/></p> : null}
      {c?.motivo ? <p className="mt-1 text-xs text-muted-foreground">{c.motivo}</p> : null}
    </div></div>
  </li>;
});
