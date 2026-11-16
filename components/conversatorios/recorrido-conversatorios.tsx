'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useLayoutEffect,useMemo,useRef,useState,useId,type ReactNode} from 'react';
import {ArrowDown,ArrowUpRight,ChevronDown,Check,Maximize2,Minimize2,Pause,Play,Search,X} from 'lucide-react';
import {TextoEditorial as T,EtiquetaEditorial} from '@/components/editorial/texto-editorial';
import {AportesGenerales} from '@/components/transformaciones/aportes-generales';
import {useFuenteActualizable} from '@/hooks/use-fuente-actualizable';
import type {DocumentoConversatorio} from '@/types/conversatorios';
import type {RespuestaAporte} from '@/types/aportes';
import {construirRecorrido,frecuenciaDocumentada,type Voz} from '@/lib/recorrido-conversatorios';
import {actorConversatorio} from '@/lib/reglas/conversatorios';

import {VisorFuentes,ReferenciaFuente} from '@/components/conversatorios/visor-fuentes';

import {TramaBotanica,MotivoBotanico} from '@/components/conversatorios/decoracion-botanica';

import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';

export interface DatosConversatorios{documentos:DocumentoConversatorio[];aportes:RespuestaAporte[];version:string}
const fotos:Record<string,string>={'Extensión Chía':'extension-chia','Extensión Facatativá':'extension-facatativa','Extensión Soacha':'extension-soacha','Extensión Zipaquirá':'extension-zipaquira','Seccional Girardot':'seccional-girardot','Seccional Ubaté':'seccional-ubate','Sede Fusagasugá':'sede-fusagasuga'};
const numero=(n:number)=>n.toLocaleString('es-CO');
function FotografiaTerritorio({documento}:{documento:DocumentoConversatorio}){
  const nombre=documento.general?'sintesis-general':fotos[documento.unidad];
  if(!nombre)return null;
  const base=`/assets/conversatorios/${nombre}`;
  return <figure className={`cv-fotografia ${documento.general?'cv-fotografia-general':''}`}>
    <div className="cv-fotografia-marco"><img key={nombre} src={`${base}-900.webp`} srcSet={documento.general?`${base}-900.webp 900w, ${base}-1800.webp 1800w`:`${base}-450.webp 450w, ${base}-900.webp 900w`} sizes="(max-width: 760px) calc(100vw - 92px), (min-width: 1800px) 570px, 36vw" width={documento.general?1800:1497} height={documento.general?834:501} loading="lazy" decoding="async" alt={documento.general?'Composición de las siete unidades regionales de la Universidad de Cundinamarca':documento.unidad}/><span className="cv-avance-visual" aria-hidden="true"/></div>
    <figcaption>{documento.unidad}</figcaption>
  </figure>;
}
function SelectorTerritorio({documentos,documento,onSeleccionar}:{documentos:DocumentoConversatorio[];documento:DocumentoConversatorio;onSeleccionar:(archivo:string)=>void}){
  const general=documentos.find(d=>d.general);
  const unidades=documentos.filter(d=>!d.general);
  return <div className="cv-selector-territorio" role="group" aria-label="Seleccionar unidad regional">
          {general?<button className={`cv-unidad cv-general ${documento.general?'cv-elegida':''}`} aria-pressed={documento.general} onClick={()=>onSeleccionar(general.archivo)}><img className="cv-mini-sintesis" src="/assets/conversatorios/sintesis-general-900.webp" alt="" width="60" height="28" loading="lazy"/><span>{general.unidad}</span>{documento.general?<Check size={16}/>:<ArrowUpRight size={16}/>}</button>:null}
          {unidades.map(d=><button className={`cv-unidad ${documento.archivo===d.archivo?'cv-elegida':''}`} aria-pressed={documento.archivo===d.archivo} key={d.archivo} onClick={()=>onSeleccionar(d.archivo)}>{fotos[d.unidad]?<img src={`/assets/regionales/${fotos[d.unidad]}.webp`} alt="" width="44" height="44"/>:<span aria-hidden>◎</span>}<span>{d.unidad}</span>{documento.archivo===d.archivo?<Check size={16}/>:null}</button>)}
        </div>;
}

export function RecorridoConversatorios({inicial}:{inicial:DatosConversatorios}){
  const {datos,error}=useFuenteActualizable(inicial,'/api/datos/conversatorios');
  const [grupo,setGrupo]=useState('__todos__');
  const [archivo,setArchivo]=useState(inicial.documentos.find(d=>d.general)?.archivo??inicial.documentos[0]?.archivo);
  const documento=datos.documentos.find(d=>d.archivo===archivo)??datos.documentos.find(d=>d.general)??datos.documentos[0];
  const [animacion,setAnimacion]=useState(true),[pantalla,setPantalla]=useState(false),[mensaje,setMensaje]=useState('');
  useEffect(()=>{const fn=()=>setPantalla(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',fn);return()=>document.removeEventListener('fullscreenchange',fn)},[]);
  async function presentar(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();setMensaje('')}catch{setMensaje('Puedes utilizar la opción de pantalla completa del navegador.')}}
  const general=datos.documentos.find(d=>d.general);
  const unidades=datos.documentos.filter(d=>!d.general);
  return <VisorFuentes><div className={`cv-prototipo ${animacion?'':'cv-sin-movimiento'}`}>
    <div className="cv-barra cv-barra-integrada"><h2><T id="conversatorios-titulo" original="Conversatorios"/></h2><div className="cv-herramientas"><button onClick={()=>setAnimacion(v=>!v)}>{animacion?<Pause size={15}/>:<Play size={15}/>}<span>{animacion?<T id="cv-movimiento" original="Pausar movimiento"/>:<T id="cv-movimiento-activar" original="Activar movimiento"/>}</span></button><button onClick={presentar} aria-label="Pantalla completa">{pantalla?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></div>
    {mensaje?<p role="status" className="cv-aviso">{mensaje}</p>:null}
    {error?<p role="alert" className="cv-aviso"><T id="cv-error" original="No se pudo actualizar la fuente. Se mantiene la última información confirmada."/></p>:null}
    <div className="cv-contenido">
      <section id="inicio" className="cv-portada"><TramaBotanica animar activo={animacion}/><MotivoBotanico tipo="rama-color"/><MotivoBotanico tipo="ondas"/>
        <div className="cv-portada-texto"><p className="cv-folio"><T id="cv-folio" original="Trabajo en territorio · Conversatorios"/></p>
          <h1><T id="cv-titulo" original="El diálogo"/><br/><em><T id="cv-titulo-verde" original="toma forma."/></em></h1>
          <p className="cv-entrada"><T id="conversatorios-descripcion" original="Recorre las voces de la comunidad universitaria y las solicitudes que surgieron en los encuentros con el Rector."/></p>
          <a className="cv-cta" href="#territorio"><T id="cv-explorar" original="Entrar en la conversación"/><ArrowDown size={19}/></a>
          <div className="cv-colofon"><span><T id="cv-material" original="Voces, planteamientos y solicitudes"/></span><span><T id="cv-ambito" original="Una lectura desde el territorio"/></span></div>
        </div>
        <div className="cv-portada-mesa"><Mesa voces={construirRecorrido(general??documento).voces} activa={-1} animacion={animacion} portada/><div className="cv-sello"><span>{numero(unidades.length)}</span><T id="cv-unidades" original="unidades regionales"/></div></div>
      </section>
      <nav className="cv-capitulos" aria-label="Recorrido de Conversatorios"><a href="#territorio"><span>01</span><T id="cv-nav-territorio" original="El territorio"/></a><a href="#voces"><span>02</span><T id="cv-nav-voces" original="Las voces"/></a><a href="#solicitudes"><span>03</span><T id="cv-nav-peticiones" original="Las solicitudes"/></a><a href="#aportes"><span>04</span><T id="cv-nav-aportes" original="Los aportes"/></a></nav>
      <section id="territorio" className="cv-territorio cv-seccion"><MotivoBotanico tipo="palma"/>
        <div className="cv-encabezado"><div><p className="cv-folio"><T id="cv-territorio-folio" original="01 / Punto de encuentro"/></p><h2><T id="cv-territorio-titulo" original="Cada lugar tiene una voz."/></h2></div><p><T id="cv-territorio-nota" original="Elige una unidad para recorrer sus planteamientos. La síntesis general presenta su propio contenido consolidado."/></p></div>
        <SelectorTerritorio documentos={datos.documentos} documento={documento} onSeleccionar={setArchivo}/>
        <div className="cv-contexto" role="status"><strong>{documento.unidad}</strong><span><T id="cv-contexto-texto" original="La selección se aplica a las voces y solicitudes del recorrido."/></span></div>
      </section>
      <Recorrido documentos={datos.documentos} documento={documento} onSeleccionar={setArchivo} grupo={grupo} onGrupo={setGrupo} animacion={animacion}/>
      <section id="aportes" className="cv-aportes cv-seccion"><MotivoBotanico tipo="flor"/><div className="cv-encabezado"><div><p className="cv-folio"><T id="cv-aportes-folio" original="04 / Una conversación abierta"/></p><h2><T id="cv-aportes-titulo" original="El aporte de cada persona."/></h2></div><p><T id="conversatorios-aportes-separados" original="Respuestas del formulario «Comparte aquí tu aporte». Se consultan por separado de la síntesis documental de los conversatorios."/></p></div>
        <div className="cv-formulario"><h3><T id="b846cb38d3fd8d95d8d1" original="Aportes generales al Plan — formulario independiente"/></h3><AportesGenerales aportes={datos.aportes}/></div>
      </section>
      <footer className="cv-pie"><span><T id="cv-final" original="Universidad de Cundinamarca · Planeación estratégica"/></span><a href="#inicio"><T id="cv-subir" original="Volver al inicio"/> ↑</a></footer>
    </div>
  </div></VisorFuentes>;
}

function Mesa({voces,activa,animacion,portada=false,onSeleccionar}:{voces:Voz[];activa:number;animacion:boolean;portada?:boolean;onSeleccionar?:(i:number)=>void}){
  const id=useId().replaceAll(':','');
  const puntos=voces.map((v,i)=>{const angle=(-135+i*360/Math.max(voces.length,1))*Math.PI/180;return{x:300+Math.cos(angle)*205,y:300+Math.sin(angle)*205,v}});
  return <div className={`cv-mesa ${portada?'cv-mesa-portada':''} ${animacion?'':'cv-mesa-pausada'}`}>
    <svg viewBox="0 0 600 600" role="img" aria-label="Mesa de diálogo: grupos de interés del documento seleccionado"><defs><radialGradient id={id}><stop offset="0" stopColor="#1e7655" stopOpacity=".28"/><stop offset="1" stopColor="#1e7655" stopOpacity="0"/></radialGradient></defs>
      <circle cx="300" cy="300" r="270" fill={`url(#${id})`}/><circle className="cv-anillo-externo" cx="300" cy="300" r="245"/><circle className="cv-anillo" cx="300" cy="300" r="205"/>
      <g className="cv-mesa-lineas">{puntos.map((p,i)=><path key={p.v.id} d={`M300 300 Q${p.x} 300 ${p.x} ${p.y}`} className={activa===i?'cv-linea-activa':''}/>)}</g>
      <circle cx="300" cy="300" r="114" className="cv-centro-sombra"/><circle cx="300" cy="300" r="101" className="cv-centro"/>
      <path d="M274 278h52v33h-29l-15 12v-12h-8z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M286 289h28m-28 9h18" stroke="currentColor"/>
      <foreignObject x="220" y="330" width="160" height="30"><div className="cv-svg-centro" style={{textAlign:'center',color:'#d3e4b5'}}><T id="cv-mesa-centro" original="CONVERSATORIOS"/></div></foreignObject>
      {puntos.map((p,i)=><g key={p.v.id} className={`cv-asiento ${activa===i?'cv-asiento-activo':''}`}><circle cx={p.x} cy={p.y} r="28"/><text x={p.x} y={p.y+5} textAnchor="middle">{String(i+1).padStart(2,'0')}</text></g>)}
    </svg>
    <div className="cv-leyenda-mesa">{voces.map((v,i)=>onSeleccionar?<button key={v.id} aria-current={activa===i?'step':undefined} onClick={()=>onSeleccionar(i)}><span>{String(i+1).padStart(2,'0')}</span>{v.grupo.nombre}</button>:<span key={v.id}><b>{String(i+1).padStart(2,'0')}</b>{v.grupo.nombre}</span>)}</div>
  </div>;
}

function PanelEscucha({children}:{children:ReactNode}){
  const panel=useRef<HTMLElement>(null);
  useLayoutEffect(()=>{
    const elemento=panel.current;
    if(!elemento)return;
    let pendiente=0;
    const medir=()=>{
      const caja=elemento.getBoundingClientRect();
      const escala=elemento.offsetHeight?caja.height/elemento.offsetHeight:1;
      const superior=parseFloat(getComputedStyle(elemento).getPropertyValue('--cv-panel-top'))||120;
      // Si no cabe completo, acompaña el flujo de la página: nunca crea otro scroll.
      elemento.dataset.cabe=String(caja.height<=window.innerHeight-superior*escala-20);
    };
    const programar=()=>{cancelAnimationFrame(pendiente);pendiente=requestAnimationFrame(medir)};
    const observador=new ResizeObserver(programar);
    observador.observe(elemento);window.addEventListener('resize',programar);medir();
    return()=>{observador.disconnect();window.removeEventListener('resize',programar);cancelAnimationFrame(pendiente)};
  },[]);
  return <aside ref={panel} className="cv-visual-fija">{children}</aside>;
}

function Recorrido({documentos,documento,onSeleccionar,grupo,onGrupo,animacion}:{documentos:DocumentoConversatorio[];documento:DocumentoConversatorio;onSeleccionar:(archivo:string)=>void;grupo:string;onGrupo:(grupo:string)=>void;animacion:boolean}){
  const recorrido=useMemo(()=>construirRecorrido(documento),[documento]);
  const grupos=[...new Set(recorrido.voces.map(v=>actorConversatorio(v.grupo.nombre)))];
  const grupoVigente=grupos.includes(grupo)?grupo:'__todos__';
  const voces=recorrido.voces.filter(v=>grupoVigente==='__todos__'||actorConversatorio(v.grupo.nombre)===grupoVigente);
  const peticiones=recorrido.peticiones.filter(p=>documento.general||grupoVigente==='__todos__'||actorConversatorio(p.solicitud.ambito)===grupoVigente);
  const planteamientos=voces.reduce((sum,v)=>sum+v.grupo.planteamientos.length,0);
  const [activa,setActiva]=useState(0),[modo,setModo]=useState<'recorrido'|'lectura'>('recorrido');
  const [solicitud,setSolicitud]=useState<string|null>(null),[consulta,setConsulta]=useState('');
  const pasos=useRef<(HTMLElement|null)[]>([]);
  function elegirUnidad(archivo:string){setActiva(0);setSolicitud(null);setConsulta('');onSeleccionar(archivo)}
  function elegirGrupo(valor:string){setActiva(0);setSolicitud(null);onGrupo(valor)}
  useEffect(()=>{if(!animacion||modo==='lectura')return;const update=()=>{let closest=Infinity,index=0;pasos.current.slice(0,voces.length).forEach((el,i)=>{if(!el)return;const r=el.getBoundingClientRect();const dist=Math.abs(r.top+r.height/2-window.innerHeight*.55);if(dist<closest){closest=dist;index=i}});setActiva(index)};const observer=new IntersectionObserver(update,{rootMargin:'-15% 0px -15% 0px',threshold:[0,.25,.5,.75,1]});pasos.current.slice(0,voces.length).forEach(el=>el&&observer.observe(el));update();return()=>observer.disconnect()},[animacion,modo,documento,grupoVigente,voces.length]);
  const elegidas=peticiones.filter(p=>[p.solicitud.titulo,p.solicitud.ambito,p.solicitud.descripcion].join(' ').toLocaleLowerCase('es').includes(consulta.toLocaleLowerCase('es')));
  const limite=Math.max(1,...peticiones.map(p=>frecuenciaDocumentada(documento,p.solicitud)??0));
  function ir(i:number){setActiva(i);pasos.current[i]?.scrollIntoView({behavior:animacion&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant',block:'center'})}
  return <>
    <section id="voces" className={`cv-voces cv-seccion ${modo==='lectura'?'cv-lectura':''}`}><TramaBotanica/>
      <div className="cv-encabezado"><div><p className="cv-folio"><T id="cv-voces-folio" original="02 / La mesa de diálogo"/></p><h2><T id="cv-voces-titulo" original="Escuchar desde cada lugar."/></h2></div><div><p>{documento.unidad}</p><div className="cv-modos" role="group" aria-label="Modo de lectura"><button aria-pressed={modo==='recorrido'} onClick={()=>setModo('recorrido')}><T id="cv-modo-recorrido" original="Recorrido"/></button><button aria-pressed={modo==='lectura'} onClick={()=>setModo('lectura')}><T id="cv-modo-lectura" original="Lectura continua"/></button></div></div></div>
      <div className="cv-filtro-grupo"><span id="cv-etiqueta-grupo"><T id="conversatorios-grupo" original="Grupo de interés"/></span><Select value={grupoVigente} onValueChange={valor=>{if(valor)elegirGrupo(valor)}}><SelectTrigger aria-labelledby="cv-etiqueta-grupo" className="cv-selector-grupo"><SelectValue>{grupoVigente==='__todos__'?<EtiquetaEditorial texto="Todos"/>:grupoVigente}</SelectValue></SelectTrigger><SelectContent className="cv-opciones-grupo"><SelectItem value="__todos__"><EtiquetaEditorial texto="Todos"/></SelectItem>{grupos.map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
      <div className="cv-escucha"><PanelEscucha><TramaBotanica/><p className="cv-indice-escucha"><T id="cv-grupos-etiqueta" original="Grupos de interés"/><span>{String(Math.min(activa+1,voces.length)).padStart(2,'0')} / {String(voces.length).padStart(2,'0')}</span></p><div className="cv-filtros-panel">
          <fieldset className="cv-unidades-panel"><legend><T id="conversatorios-unidad" original="Unidad regional"/></legend><SelectorTerritorio documentos={documentos} documento={documento} onSeleccionar={elegirUnidad}/></fieldset>
          <fieldset className="cv-grupos-panel"><legend><T id="conversatorios-grupo" original="Grupo de interés"/></legend><div><button type="button" aria-pressed={grupoVigente==='__todos__'} onClick={()=>elegirGrupo('__todos__')}><EtiquetaEditorial texto="Todos"/></button>{grupos.map(g=><button type="button" key={g} aria-pressed={grupoVigente===g} onClick={()=>elegirGrupo(g)}>{g}</button>)}</div></fieldset>
        </div><FotografiaTerritorio documento={documento}/><Mesa voces={voces} activa={activa} animacion={animacion} onSeleccionar={ir}/><p className="cv-nota-mesa"><T id="cv-nota-mesa" original="Cada punto representa un grupo. Su tamaño y posición son ilustrativos; no expresan cantidades de participantes."/></p><div className="cv-conteo-documental"><b>{numero(planteamientos)}</b><T id="cv-planteamientos-etiqueta" original="planteamientos en la selección"/></div></PanelEscucha>
        <div className="cv-pasos">{voces.map((v,i)=><article ref={el=>{pasos.current[i]=el}} id={`voz-${v.id}`} key={v.id} className={`cv-paso ${activa===i?'cv-paso-activo':''}`} data-voz={v.id}>
          <div className="cv-paso-cabecera"><span className="cv-numero-paso">{String(i+1).padStart(2,'0')}</span><p>{documento.unidad}</p></div><h3 data-original={v.grupo.nombre}>{v.grupo.nombre}</h3>
          <ol>{v.grupo.planteamientos.map((t,j)=><li key={j}><span aria-hidden>{String(j+1).padStart(2,'0')}</span><p data-planteamiento>{t}</p></li>)}</ol>
          <div className="cv-paso-pie"><Referencia documento={documento} numero={v.fuente.numero}/>{i<voces.length-1?<button onClick={()=>ir(i+1)} aria-label="Ir al siguiente grupo"><ArrowDown size={17}/></button>:<a href="#solicitudes" aria-label="Ir a las solicitudes"><ArrowDown size={17}/></a>}</div>
        </article>)}</div>
      </div>
      {documento.diapositivas.filter(s=>s.grupos.length).map(s=><details key={s.numero} className="cv-contexto-original"><summary><T id="cv-contexto-original" original="Contexto y referencia del documento"/><ChevronDown size={16}/></summary><div><h3 data-titulo-fuente>{s.titulo}</h3><p data-descripcion-fuente>{s.descripcion}</p>{s.notas.map((n,i)=><p data-nota-fuente key={i}>{n}</p>)}<p data-pie-fuente>{s.pie}</p><Referencia documento={documento} numero={s.numero}/></div></details>)}
    </section>
    <section id="solicitudes" className="cv-solicitudes cv-seccion"><TramaBotanica/><MotivoBotanico tipo="rama-color"/><MotivoBotanico tipo="ondas"/><div className="cv-encabezado"><div><p className="cv-folio"><T id="cv-solicitudes-folio" original="03 / Las solicitudes estratégicas"/></p><h2><T id="cv-solicitudes-titulo" original="Lo que se puso sobre la mesa."/></h2></div><p><T id="cv-solicitudes-nota" original="Abre cada solicitud para leer su descripción y el ámbito al que corresponde."/></p></div>
      <div className="cv-peticiones-marco"><div className="cv-peticiones-cabecera"><span>{documento.unidad}</span><label><Search size={16}/><span className="sr-only">Buscar solicitudes</span><input value={consulta} onChange={e=>setConsulta(e.target.value)} placeholder="Buscar en las solicitudes"/>{consulta?<button onClick={()=>setConsulta('')} aria-label="Limpiar búsqueda"><X size={16}/></button>:null}</label></div>
        {documento.general?<p className="cv-frecuencia-nota"><T id="cv-frecuencia-nota" original="La longitud de cada línea indica el número de unidades que formularon esa solicitud, según la síntesis general. No representa personas ni porcentajes."/></p>:null}
        <div className="cv-lista-peticiones">{elegidas.map(p=>{const abierta=solicitud===p.id,f=frecuenciaDocumentada(documento,p.solicitud);return <article className={`cv-peticion ${abierta?'cv-peticion-abierta':''}`} key={p.id} data-solicitud={p.id}>
          <button className="cv-peticion-boton" aria-expanded={abierta} aria-controls={`peticion-${p.id}`} onClick={()=>setSolicitud(abierta?null:p.id)}><span className="cv-numero-peticion">{String(peticiones.indexOf(p)+1).padStart(2,'0')}</span><span className="cv-peticion-titulo"><strong data-solicitud-titulo>{p.solicitud.titulo}</strong>{f!==null?<span className="cv-barra-frecuencia" aria-hidden><span style={{width:`${f/limite*100}%`}}/></span>:null}</span><span className="cv-indicador-peticion">{f!==null?<><b>{f}</b><T id="cv-frecuencia-unidad" original="unidades"/></>:<ArrowUpRight size={20}/>}</span><ChevronDown className="cv-chevron" size={18}/></button>
          <div id={`peticion-${p.id}`} hidden={!abierta} className="cv-peticion-detalle"><p className="cv-ambito" data-solicitud-ambito>{p.solicitud.ambito}</p><p data-solicitud-descripcion>{p.solicitud.descripcion}</p><p className="cv-ref-original"><T id="cv-ref-original" original="Referencia en la fuente:"/> <span data-referencia-original>{p.solicitud.referencia}</span></p><Referencia documento={documento} numero={p.fuente.numero}/></div>
        </article>})}</div>
        {documento.general&&grupoVigente!=='__todos__'?<p className="cv-frecuencia-nota"><T id="conversatorios-solicitudes-generales" original="La síntesis general de solicitudes agrupa unidades regionales; no desglosa cada tema por grupo de interés."/></p>:null}
        {!elegidas.length?<p role="status" className="cv-sin-resultados"><T id="cv-sin-resultados" original="No hay solicitudes que coincidan con la búsqueda o con el grupo seleccionado."/></p>:null}
        {documento.diapositivas.filter(s=>s.solicitudes.length).map(s=><div className="cv-fuente-solicitudes" key={s.numero}><h3 data-titulo-fuente>{s.titulo}</h3><p data-descripcion-fuente>{s.descripcion}</p>{s.notas.map((n,i)=><p key={i} data-nota-fuente className={i===0?'cv-nota-titulo':''}>{n}</p>)}<p data-pie-fuente>{s.pie}</p><Referencia documento={documento} numero={s.numero}/></div>)}
      </div>
    </section>
  </>;
}
function Referencia({documento,numero:n}:{documento:DocumentoConversatorio;numero:number}){return <ReferenciaFuente documento={documento} pagina={n}/>;}
