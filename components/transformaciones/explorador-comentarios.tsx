"use client";
import {TextoEditorial as T} from '@/components/editorial/texto-editorial';
import {TextoEditorial} from '@/components/editorial/texto-editorial';
import {useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,MessageSquareQuote,RotateCcw,Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card,CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Collapsible,CollapsibleContent,CollapsibleTrigger} from '@/components/ui/collapsible';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {formatNumero} from '@/lib/formatters';
import {TODOS_LOS_COMENTARIOS,POSTURAS_COMENTARIOS,contarPosturas,contarTemas,expandirClasificacion,filtrarComentarios,opcionesComentarios,seleccionarNivel,type FiltrosComentarios} from '@/lib/reglas/navegacion-comentarios';
import {esAporteTematico,separarComentariosPresentaciones,resumirAportesPresentaciones,referenciasSoloAportes} from '@/lib/reglas/alcance-presentaciones';
import {compararOrdenTransformaciones} from '@/lib/reglas/orden-transformaciones';
import type {RespuestaMomento4} from '@/types/momento4';
import type {ClasificacionDocumental,ClasificacionDocumentalCompacta,ResumenFuentesClasificacion} from '@/types/clasificacion-documental';
import {SelectorRegionalVisual} from './selector-regional-visual';
import {NivelDesplegable,FiltroActivo,ListaComentarios,BotonTema} from './comentarios-compartidos';
import './comentarios-originales.css';
type Nivel='unidad'|'transformacion'|'grupo';
export function ExploradorComentarios({respuestas,clasificacion,errorClasificacion,resumenFuentes,clasificacionPresentaciones,errorPresentaciones,unidadesPresentaciones=[]}:{
  respuestas:RespuestaMomento4[];clasificacion:ClasificacionDocumentalCompacta;errorClasificacion:boolean;
  resumenFuentes:ResumenFuentesClasificacion;clasificacionPresentaciones?:ClasificacionDocumentalCompacta;
  errorPresentaciones?:boolean;unidadesPresentaciones?:string[];
}) {
  const [filtros,setFiltros]=useState<FiltrosComentarios>(TODOS_LOS_COMENTARIOS);
  const [abierto,setAbierto]=useState<Nivel|null>('unidad');
  const [detalle,setDetalle]=useState<{id:string;complementario:boolean}|null>(null);
  const [dialogoAbierto,setDialogoAbierto]=useState(false);
  const region=useRef<HTMLElement>(null),scrollComentarios=useRef<HTMLDivElement>(null);
  const referencias=useMemo(()=>clasificacionPresentaciones?expandirClasificacion(clasificacionPresentaciones):new Map<number,ClasificacionDocumental>(),[clasificacionPresentaciones]);
  const referenciasBert=useMemo(()=>expandirClasificacion(clasificacion),[clasificacion]);
  const referenciasInforme=useMemo(()=>referenciasSoloAportes(referencias),[referencias]);
  const alcance=useMemo(()=>separarComentariosPresentaciones(respuestas,referencias,unidadesPresentaciones),[respuestas,referencias,unidadesPresentaciones]);
  const comentarios=alcance.documentados;
  const contexto=useMemo(()=>filtrarComentarios(comentarios,referenciasInforme,{...filtros,temas:[],sinTema:false}),[comentarios,referenciasInforme,filtros]);
  const filtrados=useMemo(()=>filtrarComentarios(comentarios,referenciasInforme,filtros),[comentarios,referenciasInforme,filtros]);
  const otros=useMemo(()=>filtrarComentarios(alcance.otros,referencias,{...filtros,temas:[],sinTema:false}),[alcance.otros,referencias,filtros]);
  const resumen=useMemo(()=>resumirAportesPresentaciones(contexto,referencias),[contexto,referencias]);
  const opciones=useMemo(()=>opcionesComentarios(comentarios,filtros),[comentarios,filtros]);
  const catalogo=useMemo(()=>contarTemas(comentarios,referencias),[comentarios,referencias]);
  const temas=useMemo(()=>{
    const actuales=new Map(contarTemas(contexto,referencias).map(t=>[t.id,t.total]));
    return catalogo.filter(t=>resumen.bases.has(t.transformacion)).map(t=>({...t,total:actuales.get(t.id)??0})).sort((a,b)=>compararOrdenTransformaciones(a.transformacion,b.transformacion)||a.codigo.localeCompare(b.codigo,'es',{numeric:true}));
  },[catalogo,contexto,referencias,resumen]);
  const temasBert=useMemo(()=>contarTemas(contexto,referenciasBert),[contexto,referenciasBert]);
  const aporteElegido=(detalle?.complementario?temasBert:temas).find(t=>t.id===detalle?.id);
  const referenciasDetalle=detalle?.complementario?referenciasBert:referencias;
  const comentariosAporte=useMemo(()=>detalle?filtrarComentarios(contexto,referenciasDetalle,{...TODOS_LOS_COMENTARIOS,temas:[detalle.id]}):[],[contexto,referenciasDetalle,detalle]);
  const posturas=useMemo(()=>contarPosturas(filtrarComentarios(comentarios,referenciasInforme,{...filtros,postura:null})),[comentarios,referenciasInforme,filtros]);
  const fuentesPorComentario=resumenFuentes.porComentario;
  const general=!filtros.unidad&&!filtros.transformacion&&!filtros.grupo&&!filtros.sinTema&&!filtros.postura&&!filtros.busqueda;
  const etiquetaTransformacion=opciones.transformaciones.find(t=>t.id===filtros.transformacion)?.nombre;
  useLayoutEffect(()=>{scrollComentarios.current?.scrollTo({top:0,left:0,behavior:'instant'});},[filtrados]);
  function seleccionar(nivel:Nivel,valor:string|null){setDialogoAbierto(false);setFiltros(p=>seleccionarNivel(p,nivel,valor));setAbierto(valor===null?nivel:nivel==='unidad'?'transformacion':nivel==='transformacion'?'grupo':null);}
  function restablecer(){setDialogoAbierto(false);setFiltros(TODOS_LOS_COMENTARIOS);setAbierto('unidad');}
  function abrir(id:string,complementario=false){setDetalle({id,complementario});setDialogoAbierto(true);}
  if(errorPresentaciones||!clasificacionPresentaciones?.disponible||!unidadesPresentaciones.length)return <p role="alert"><T id="informe-fuente-error" original="No se pudo consultar el informe y sus fuentes. Intenta actualizar la página."/></p>;
  return <section ref={region} id="explorador-comentarios" aria-label="Consulta de comentarios" className="flex scroll-mt-20 flex-col gap-4">
    <div data-barra-comentarios className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
      <Button size="lg" variant={general?'default':'outline'} aria-label="Todos los comentarios" onClick={restablecer}><MessageSquareQuote aria-hidden/><T id="informe-comentarios-titulo" original="Comentarios del informe"/><span>{formatNumero(comentarios.length)}</span></Button>
      <p role="status" data-testid="conteo-comentarios" className="text-sm text-muted-foreground"><strong>{formatNumero(filtrados.length)}</strong> de {formatNumero(comentarios.length)} <T id="informe-comentarios-unidad" original="comentarios del informe"/></p>
    </div>
        <Card className="gap-0 border-border/70 py-0">
      <CardContent className="px-4 py-3">
        <SelectorRegionalVisual opciones={opciones.unidades} seleccionado={filtros.unidad} onSeleccionar={v => seleccionar('unidad', v)}/>
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
      <Button variant="outline" disabled={general} onClick={restablecer} aria-label="Limpiar todos los filtros">
        <RotateCcw className="size-3.5" aria-hidden />Limpiar todos los filtros
      </Button>
    </div>
    {!general ? <div aria-label="Filtros activos" className="flex flex-wrap items-center gap-2 text-xs">
      {filtros.unidad ? <FiltroActivo texto={filtros.unidad} quitar={() => seleccionar("unidad", null)} /> : null}
      {filtros.transformacion ? <FiltroActivo texto={etiquetaTransformacion ?? filtros.transformacion} quitar={() => seleccionar("transformacion", null)} /> : null}
      {filtros.grupo ? <FiltroActivo texto={filtros.grupo} quitar={() => seleccionar("grupo", null)} /> : null}
      {filtros.sinTema ? <FiltroActivo texto="Sin asignación en esta clasificación" quitar={() => setFiltros((p) => ({ ...p, sinTema: false }))} /> : null}
      {filtros.postura ? <FiltroActivo texto={POSTURAS_COMENTARIOS.find((p) => p.id === filtros.postura)!.nombre} quitar={() => setFiltros((p) => ({ ...p, postura: null }))} /> : null}
      {filtros.busqueda ? <FiltroActivo texto={`Texto: ${filtros.busqueda}`} quitar={() => setFiltros((p) => ({ ...p, busqueda: "" }))} /> : null}
    </div> : null}


    <Card className="gap-0 border-border/70 py-0"><CardContent className="flex flex-col gap-4 px-4 py-4">
      <section aria-labelledby="titulo-aportes-presentaciones" className="rounded-2xl border border-primary/20 bg-card p-5">
        <h2 id="titulo-aportes-presentaciones" className="font-heading text-xl font-semibold"><T id="temas-aportes-presentaciones-titulo" original="Aportes de las presentaciones"/></h2>
        <p className="my-3 text-sm text-muted-foreground"><T id="informe-base-nota" original="Los porcentajes se calculan sobre los comentarios incluidos en el informe de cada transformación, dentro de los filtros actuales. Abre un aporte para consultar sus comentarios."/></p>
        <div className="grid max-h-[65svh] grid-cols-3 gap-3 overflow-y-auto overscroll-contain pr-2" data-testid="aportes-presentaciones" role="region" aria-labelledby="titulo-aportes-presentaciones" tabIndex={0}>
          {temas.filter(t=>esAporteTematico(t.codigo)).map(t=>{const base=resumen.bases.get(t.transformacion)!;return <Button key={t.id} variant="outline" data-aporte-documental={t.id} data-aporte-total={t.total} data-aporte-base={base} data-aporte-porcentaje={Math.round(t.total/base*100)} className="h-auto min-h-44 min-w-0 flex-col items-stretch justify-between gap-3 whitespace-normal rounded-xl p-4 text-left hover:border-primary/50" onClick={()=>abrir(t.id)}>
            <span className="flex items-start gap-3"><span className="shrink-0 rounded-lg bg-primary px-3 py-2 font-bold text-primary-foreground" data-codigo-aporte>{t.codigo}</span><span className="text-xs font-medium text-primary">{t.transformacion}</span></span>
            <span className="font-semibold leading-snug">{t.nombre}</span>
            <span className="text-2xl font-semibold text-primary">{Math.round(t.total/base*100)} %</span>
            <span className="text-sm">{formatNumero(t.total)} de {formatNumero(base)} <T id="informe-card-unidad" original="comentarios"/></span>
            <span className="text-sm text-primary"><T id="temas-aportes-ver" original="Ver comentarios"/> ↗</span>
          </Button>;})}
        </div>
        {!temas.some(t=>esAporteTematico(t.codigo))?<p role="status"><T id="informe-sin-aportes" original="No hay aportes temáticos para esta selección."/></p>:null}
        <p className="mt-4 text-xs text-muted-foreground"><T id="informe-solapamiento" original="Un comentario puede estar asociado a varios aportes. Por eso los conteos y porcentajes de las tarjetas no se suman para obtener el total de comentarios."/></p>
        {temas.some(t=>!esAporteTematico(t.codigo))?<div className="mt-4 border-t pt-3"><h3 className="mb-2 text-sm font-medium"><T id="informe-otras-respuestas" original="Otras respuestas clasificadas"/></h3><div className="flex flex-wrap gap-2">{temas.filter(t=>!esAporteTematico(t.codigo)).map(t=><Button key={t.id} variant="outline" className="h-auto whitespace-normal text-left" onClick={()=>abrir(t.id)}>{t.nombre} · {formatNumero(t.total)}</Button>)}</div></div>:null}
        <Button variant={filtros.sinTema?'default':'ghost'} className="mt-3 h-auto whitespace-normal" onClick={()=>setFiltros(p=>({...p,sinTema:!p.sinTema}))}><T id="informe-ver-sin-aporte" original="Consultar comentarios sin aportes A1, A2…"/> · {formatNumero(resumen.sinAportes)}</Button>
      </section>
      <Collapsible><CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium text-primary"><T id="informe-complementario" original="Análisis complementario por unidad"/><ChevronDown className="size-4"/></CollapsibleTrigger><CollapsibleContent>
        <p className="my-3 text-sm text-muted-foreground"><T id="informe-complementario-nota" original="Clasificación BERT → Jev por unidad. Es una lectura distinta de los aportes A1, A2…; sus categorías se consultan por separado."/></p>
        {errorClasificacion||!clasificacion.disponible?<p role="status"><T id="informe-complementario-error" original="No se pudo consultar la clasificación complementaria."/></p>:<div className="grid max-h-[55svh] grid-cols-2 gap-3 overflow-y-auto overscroll-contain">{temasBert.map(t=><BotonTema key={t.id} tema={t} activo={false} onClick={()=>abrir(t.id,true)}/>)}</div>}
      </CollapsibleContent></Collapsible>
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

    </CardContent></Card>
    <div className="panel-comentarios"><div className="flex items-center justify-between gap-3"><h2 id="titulo-comentarios" className="font-heading text-lg font-semibold"><T id="6e15162168e3b1815131" original="Comentarios"/></h2><span>{formatNumero(filtrados.length)}</span></div>
      <div ref={scrollComentarios} className="scroll-comentarios" data-testid="scroll-comentarios" role="region" aria-labelledby="titulo-comentarios" tabIndex={0}><ListaComentarios comentarios={filtrados} referencias={referencias} metodo="aportes-plan" otrasFuentes={fuentesPorComentario}/></div>
    </div>
    <div className="panel-comentarios"><div><h2 id="otros-comentarios" className="font-heading text-lg font-semibold"><T id="informe-otros-titulo" original="Otros comentarios conservados"/> · {formatNumero(otros.length)}</h2>
      <p className="mt-2 text-sm text-muted-foreground"><T id="informe-otros-nota" original="Estos textos no forman parte del conjunto preparado para las diapositivas. Se conservan para consulta y no se incluyen en los porcentajes del informe."/></p></div>
      <div className="scroll-comentarios" role="region" aria-labelledby="otros-comentarios" tabIndex={0}><ListaComentarios comentarios={otros} referencias={referencias} metodo="aportes-plan" otrasFuentes={fuentesPorComentario}/></div>
    </div>
    <Dialog open={dialogoAbierto&&Boolean(aporteElegido)} onOpenChange={setDialogoAbierto}><DialogContent className="detalle-aporte-documental-dialogo flex flex-col gap-4 overflow-hidden" style={{width:'min(94vw, 1600px)',maxWidth:'none',height:'min(calc(var(--alto-escritorio, 100svh) * .92), 3000px)'}}>
      <DialogHeader><DialogTitle>{aporteElegido?[aporteElegido.codigo,aporteElegido.nombre].filter(Boolean).join(' · '):''}</DialogTitle><DialogDescription>{aporteElegido?.transformacion} · {detalle?.complementario?<T id="informe-modal-bert" original="Análisis BERT → Jev por unidad"/>:<T id="temas-aportes-detalle-fuente" original="Clasificación de las presentaciones"/>}</DialogDescription></DialogHeader>
      <p className="text-sm"><strong>{formatNumero(comentariosAporte.length)}</strong> <T id="temas-aportes-detalle-conteo" original="comentarios asociados a este aporte dentro de los filtros actuales."/></p>
      <div key={`${detalle?.id}-${dialogoAbierto}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2" data-testid="detalle-aporte-documental"><ListaComentarios comentarios={comentariosAporte} referencias={referenciasDetalle} metodo={detalle?.complementario?'bert-jev-unidad':'aportes-plan'} otrasFuentes={fuentesPorComentario}/></div>
    </DialogContent></Dialog>
  </section>;
}
