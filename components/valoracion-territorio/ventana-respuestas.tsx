'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import type {RespuestaValoracionTerritorio} from '@/types/valoracion-territorio';
import {AFIRMACIONES_VALORACION,etiquetaActor} from '@/lib/reglas/valoracion-territorio';
import {esTextoConContenido,estaEnNiveles} from '@/lib/reglas/formularios';
import type {FiltroRespuesta} from './evidencia';
import {TextoDeCatalogo,EtiquetaEditorial,LapizDeCatalogo} from '@/components/editorial/texto-editorial';

export function VentanaRespuestas({respuestas,filtro,onCerrar}:{respuestas:RespuestaValoracionTerritorio[];filtro:FiltroRespuesta|null;onCerrar:()=>void}){
 const dialogo=useRef<HTMLDialogElement>(null);
 const lista=useRef<HTMLDivElement>(null);
 const[busqueda,setBusqueda]=useState('');
 useLayoutEffect(()=>{
   if(filtro){
     setBusqueda('');
     dialogo.current?.showModal();
     lista.current?.scrollTo({top:0,left:0,behavior:'instant'});
   }
   else dialogo.current?.close();
 },[filtro]);
 const pregunta=AFIRMACIONES_VALORACION.find(a=>a.campo===filtro?.campo);
 const nivelDescriptivo=filtro?.etiqueta.split(' · ').slice(1).join(' · ')??'';
 const seleccion=filtro?respuestas.filter(r=>estaEnNiveles(r[filtro.campo],filtro.niveles)):[];
 const filas=seleccion.filter(r=>[r.mejora,r.unidadRegional,etiquetaActor(r.tipoActor),String(r.id)].join(' ').toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
 return <dialog ref={dialogo} className="ventana-respuestas" aria-labelledby="titulo-respuestas" aria-describedby="contexto-respuestas" onClose={onCerrar}>
   <header className="ventana-cabecera"><div><p className="folio"><TextoDeCatalogo texto="DETALLE DE LA VALORACIÓN"/></p><h2 id="titulo-respuestas"><TextoDeCatalogo texto={pregunta?.corta??''}/> · <TextoDeCatalogo texto={nivelDescriptivo}/></h2></div><button type="button" className="cerrar-ventana" onClick={()=>dialogo.current?.close()} aria-label="Cerrar detalle de respuestas">×</button></header>
   <div className="ventana-contexto"><div><p id="contexto-respuestas"><strong>{seleccion.length}</strong> <TextoDeCatalogo texto="de"/> {respuestas.length} <TextoDeCatalogo texto="respuestas de la selección actual corresponden a este nivel de valoración."/></p><div className="enunciado-consulta"><details><summary><EtiquetaEditorial texto="Consultar el enunciado completo"/></summary><p>{pregunta?.texto}</p></details><LapizDeCatalogo texto="Consultar el enunciado completo"/></div></div><div><label htmlFor="buscar-respuesta-flotante"><TextoDeCatalogo texto="Buscar dentro de estas respuestas"/></label><input id="buscar-respuesta-flotante" type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/><p className="ventana-conteo" aria-live="polite">{filas.length} <TextoDeCatalogo texto="de"/> {seleccion.length} <TextoDeCatalogo texto="respuestas mostradas"/></p></div></div>
   <div ref={lista} className="ventana-lista" tabIndex={0} role="region" aria-label="Respuestas del nivel de valoración seleccionado">
     {filas.length===0?<p><TextoDeCatalogo texto="No hay respuestas que coincidan con esta búsqueda."/></p>:<ol>{filas.map(r=><li key={r.id} data-respuesta-id={r.id}><header><strong><TextoDeCatalogo texto="Respuesta"/> {r.id}</strong><span>{r.fechaRespuesta} · {r.unidadRegional} · {etiquetaActor(r.tipoActor)}</span></header><p className="nivel-seleccionado">{filtro?r[filtro.campo]:''}</p><h3><TextoDeCatalogo texto="Observación registrada"/></h3>{r.mejora?<p className={esTextoConContenido(r.mejora)?'texto-original':'sin-observacion'}>{r.mejora}</p>:<p className="sin-observacion"><TextoDeCatalogo texto="Esta respuesta no incluye un comentario abierto."/></p>}</li>)}</ol>}
   </div>
   <footer className="ventana-pie"><span><TextoDeCatalogo texto="Se muestran únicamente las respuestas del criterio seleccionado."/></span><div className="ventana-acciones"><button className="boton" type="button" onClick={()=>dialogo.current?.close()}><EtiquetaEditorial texto="Cerrar detalle"/></button><LapizDeCatalogo texto="Cerrar detalle"/></div></footer>
 </dialog>;
}
