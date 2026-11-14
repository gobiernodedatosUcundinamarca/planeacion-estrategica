'use client';
/* Las piezas son material gráfico original; el manifiesto solo asigna imágenes y posiciones. */
/* eslint-disable @next/next/no-img-element */
import { useMemo,useState } from 'react';
import { Layers } from 'lucide-react';
import { TextoEditorial as T,EtiquetaEditorial as E,LapizDeCatalogo as L } from '@/components/editorial/texto-editorial';
import { resumirTransformaciones } from '@/lib/reglas/resumen-transformaciones';
import { formatNumero } from '@/lib/formatters';
import type { RespuestaMomento4 } from '@/types/momento4';
import caras from '@/public/rompecabezas/piezas.json';
import { useRompecabezas } from './use-rompecabezas';
import './rompecabezas.css';

export function Rompecabezas({respuestas,comentariosInforme,seleccion,onSeleccionar}:{respuestas:RespuestaMomento4[];comentariosInforme?:number;seleccion:string|null;onSeleccionar:(id:string)=>void}) {
  const [cara,setCara]=useState('vision');
  const {escena,lienzo}=useRompecabezas(cara);
  const resumen=useMemo(()=>resumirTransformaciones(respuestas),[respuestas]);
  const actual=caras.find(c=>c.id===cara)!;
  return <div className="transformaciones-rompecabezas">
    <section className="portada-puzzle" aria-labelledby="titulo-transformaciones-puzzle">
      <h2 id="titulo-transformaciones-puzzle"><T id="puzzle-titulo" original="Cada transformación."/><br/><em><T id="puzzle-titulo-verde" original="Una universidad que se conecta."/></em></h2>
      <div className="introduccion-puzzle"><p><T id="puzzle-intro" original="Las piezas del encuentro se unen para presentar las transformaciones. Explora sus dos caras y consulta las respuestas de la comunidad."/></p>
        <dl className="cifras-puzzle"><div><dt><T id="puzzle-respuestas" original="respuestas de encuestas"/></dt><dd data-total-puzzle="respuestas">{formatNumero(resumen.total)}</dd></div><div><dt><T id="puzzle-comentarios-informe" original="comentarios del informe"/></dt><dd data-total-puzzle="comentarios">{comentariosInforme===undefined?'—':formatNumero(comentariosInforme)}</dd></div></dl>
      </div>
    </section>
    <section ref={escena} className="escena-puzzle" aria-labelledby="titulo-puzzle">
      <div className="relato-puzzle"><h3 id="titulo-puzzle"><T id="puzzle-armado" original="Así encajan las piezas."/></h3><p className="nota-puzzle"><T id="puzzle-ayuda" original="Al recorrer esta sección, las piezas se unen. Selecciona una transformación para consultar sus resultados más abajo."/></p>
        {resumen.grupos.map(t=>{const pieza=actual.piezas.find(p=>p.id===t.id);return <article className="paso-puzzle" key={t.id} data-transformacion={t.id}>
          <button className="elegir-pieza" type="button" aria-pressed={seleccion===t.id} aria-controls="datos-transformaciones" onClick={()=>onSeleccionar(t.id)}>
            {pieza ? <img src={pieza.detalle} alt="" width={110} height={110} loading="lazy"/> : <Layers size={64} aria-hidden className="pieza-sin-imagen"/>}
            <span><E texto={t.nombre}/><small><span data-respuestas-pieza={t.id}>{formatNumero(t.respuestas)}</span> <E texto="respuestas"/></small></span><span className="marca-seleccion-puzzle" aria-hidden>{seleccion===t.id?'✓':'↗'}</span>
          </button>
          <div className="lapices-pieza"><L texto={t.nombre}/><L texto="respuestas"/></div>
          <p><strong><span data-favorables-pieza={t.id}>{formatNumero(t.favorables)}</span> <T id="puzzle-conteo-de" original="de"/> {formatNumero(t.respuestas)}</strong> <T id="puzzle-si" original="respondieron «Sí» a la pregunta «¿La transformación responde a lo que se necesita?»."/></p>
        </article>;})}
      </div>
      <aside className="columna-puzzle" aria-label="Rompecabezas de las transformaciones">
        <div className="controles-cara" role="group" aria-label="Cara del rompecabezas">{['vision','mision'].map(id=><span className="accion-cara" key={id}><button type="button" onClick={()=>setCara(id)} aria-pressed={cara===id}><E texto={id==='vision'?'Visión':'Misión'}/></button><L texto={id==='vision'?'Visión':'Misión'}/></span>)}</div>
        <div ref={lienzo} className="lienzo-puzzle" role="img" aria-label={cara==='vision'?'Rompecabezas de la visión con las fotografías de las transformaciones':'Rompecabezas de la misión y las descripciones de las transformaciones'} data-cara={cara}>
          {[...actual.piezas].sort((a,b)=>Number(a.id==='centro')-Number(b.id==='centro')).map(p=><img key={`${cara}-${p.id}`} data-pieza={p.id} data-posicion={p.posicion} className={`pieza-puzzle ${seleccion&&seleccion!==p.id&&p.id!=='centro'?'pieza-atenuada':''}`} src={p.imagen} alt="" width={960} height={960} draggable={false}/>)}
        </div>
        <p className="nota-puzzle"><T id="puzzle-nota-fuente" original="Piezas originales del material del encuentro. Las fotografías corresponden a su transformación; la otra cara conserva las descripciones y la misión."/></p>
        <a className="ir-resultados-puzzle" href="#datos-transformaciones"><E texto="Consultar los resultados ↓"/></a><L texto="Consultar los resultados ↓"/>
      </aside>
    </section>
  </div>;
}
