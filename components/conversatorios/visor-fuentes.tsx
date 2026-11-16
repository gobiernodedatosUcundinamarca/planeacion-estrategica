'use client';
/* eslint-disable @next/next/no-img-element */
import {createContext,useContext,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,X,ZoomIn,ZoomOut} from 'lucide-react';
import {TextoEditorial as T,EtiquetaEditorial,LapizDeCatalogo} from '@/components/editorial/texto-editorial';
import type {DocumentoConversatorio} from '@/types/conversatorios';

type Referencia={documento:DocumentoConversatorio;pagina:number};
const ContextoFuente=createContext<(r:Referencia)=>void>(()=>{});
export function VisorFuentes({children}:{children:ReactNode}){
  const modal=useRef<HTMLDialogElement>(null),contenido=useRef<HTMLDivElement>(null);
  const [referencia,setReferencia]=useState<Referencia|null>(null);
  const [cargando,setCargando]=useState(true),[error,setError]=useState(false),[ampliada,setAmpliada]=useState(false),[intento,setIntento]=useState(0);
  const titulo=useId();
  // Reiniciar después del cambio de tamaño evita conservar un desplazamiento
  // horizontal calculado con las dimensiones anteriores de la imagen.
  useLayoutEffect(()=>{contenido.current?.scrollTo({left:0,top:0,behavior:'instant'});},[ampliada,referencia]);
  function abrir(r:Referencia){
    setReferencia(r);setCargando(true);setError(false);setAmpliada(false);setIntento(v=>v+1);
    if(contenido.current)contenido.current.scrollTo(0,0);
    modal.current?.showModal();
  }
  const src=referencia?`/api/conversatorios/fuentes/${encodeURIComponent(referencia.documento.archivo)}/paginas/${referencia.pagina}?v=${referencia.documento.sha256}&intento=${intento}`:'';
  return <ContextoFuente.Provider value={abrir}>{children}
    <dialog ref={modal} className="cv-visor-fuente" aria-labelledby={titulo} onClose={()=>setReferencia(null)} {...{closedby:'any'}}>
      <header><div><p><T id="cv-vista-fuente" original="Fuente documental"/></p><h2 id={titulo}>{referencia?.documento.unidad} · <T id="cv-pagina" original="página"/> {referencia?.pagina}</h2></div><form method="dialog"><button autoFocus aria-label="Cerrar fuente" className="cv-cerrar-fuente"><X size={22}/></button></form></header>
      <div ref={contenido} tabIndex={0} role="region" aria-labelledby={titulo} className={`cv-visor-contenido ${ampliada?'cv-visor-ampliado':''}`}>
        {cargando&&!error?<p role="status"><T id="cv-fuente-cargando" original="Preparando la página del documento…"/></p>:null}
        {error?<div role="alert"><p><T id="cv-fuente-error" original="No se pudo cargar la página de la fuente. Inténtalo de nuevo."/></p><button onClick={()=>{setError(false);setCargando(true);setIntento(v=>v+1)}}><EtiquetaEditorial texto="Reintentar"/></button><LapizDeCatalogo texto="Reintentar"/></div>:null}
        {referencia?<img key={src} src={src} width="1800" height="1013" alt={`${referencia.documento.unidad}, página ${referencia.pagina} del documento original`} onLoad={()=>setCargando(false)} onError={()=>{setCargando(false);setError(true)}} hidden={error} className={cargando?'cv-fuente-pendiente':''}/>:null}
      </div>
      <footer><span><T id="cv-fuente-fiel" original="Vista de la página del documento original"/></span><span><button disabled={cargando||error} onClick={()=>{setAmpliada(v=>!v);contenido.current?.scrollTo(0,0)}}>{ampliada?<ZoomOut size={17}/>:<ZoomIn size={17}/>}<EtiquetaEditorial texto={ampliada?'Ajustar a la ventana':'Ampliar imagen'}/></button><LapizDeCatalogo texto={ampliada?'Ajustar a la ventana':'Ampliar imagen'}/></span></footer>
    </dialog>
  </ContextoFuente.Provider>;
}
export function ReferenciaFuente({documento,pagina}:{documento:DocumentoConversatorio;pagina:number}){
  const abrir=useContext(ContextoFuente);
  return <span className="cv-referencia"><button type="button" onClick={()=>abrir({documento,pagina})}><EtiquetaEditorial texto="Consultar fuente"/><span>·</span><EtiquetaEditorial texto="página"/> {pagina}<ArrowUpRight size={13}/></button><LapizDeCatalogo texto="Consultar fuente"/><LapizDeCatalogo texto="página"/></span>;
}
