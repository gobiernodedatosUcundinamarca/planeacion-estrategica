'use client';
import {useId,useLayoutEffect,useRef} from 'react';
const sprite='/assets/conversatorios/fondos/botanica.svg';
const claveFase='conversatorios:follaje:fase:v1';
const duracion=75000;
let ultimaFase=0;
/** Decoración vectorial compartida mediante símbolos, sin imágenes incrustadas. */
export function TramaBotanica({animar=false,activo=true}:{animar?:boolean;activo?:boolean}){
  const patron='cv-botanica-'+useId().replaceAll(':','');
  const elemento=useRef<SVGSVGElement>(null),habilitado=useRef(activo),actualizar=useRef<(()=>void)|null>(null);
  useLayoutEffect(()=>{
    const el=elemento.current;
    if(!animar||!el)return;
    if(typeof el.animate!=='function'){el.dataset.continuidad='lista';return;}
    const preferencia=matchMedia('(prefers-reduced-motion: reduce)');
    const movimiento=el.animate([{transform:'translate3d(0,0,0)'},{transform:'translate3d(-40px,-24px,0)'}],{duration:duracion,easing:'ease-in-out',direction:'alternate',iterations:Infinity,fill:'both'});
    movimiento.pause();
    try{const valor=sessionStorage.getItem(claveFase),guardada=valor===null?NaN:Number(valor);if(Number.isFinite(guardada)&&guardada>=0)ultimaFase=guardada%(duracion*2);}catch{/* La navegación sigue conservando la fase en memoria. */}
    movimiento.currentTime=ultimaFase;
    // Restaurar antes de revelar el SVG evita mostrar el origen durante la hidratación.
    el.dataset.continuidad='lista';
    const rect=el.getBoundingClientRect();
    let enPantalla=rect.bottom>0&&rect.top<innerHeight,enFoco=document.hasFocus(),saliendo=false;
    function guardar(){
      if(typeof movimiento.currentTime==='number')ultimaFase=movimiento.currentTime%(duracion*2);
      try{sessionStorage.setItem(claveFase,String(ultimaFase));}catch{/* El almacenamiento no es obligatorio para mostrar la decoración. */}
    }
    function ajustar(){
      if(habilitado.current&&enPantalla&&enFoco&&!saliendo&&document.visibilityState==='visible'&&!preferencia.matches){if(movimiento.playState!=='running')movimiento.play();}
      else{movimiento.pause();guardar();}
    }
    const observer=new IntersectionObserver(([entrada])=>{enPantalla=entrada.isIntersecting;ajustar();});
    observer.observe(el);
    const desenfocar=()=>{enFoco=false;ajustar();};
    const enfocar=()=>{enFoco=true;ajustar();};
    const salir=()=>{saliendo=true;ajustar();};
    const volver=()=>{saliendo=false;enFoco=document.hasFocus();ajustar();};
    document.addEventListener('visibilitychange',ajustar);
    window.addEventListener('blur',desenfocar);window.addEventListener('focus',enfocar);
    window.addEventListener('pagehide',salir);window.addEventListener('pageshow',volver);
    preferencia.addEventListener('change',ajustar);
    actualizar.current=ajustar;ajustar();
    return()=>{
      movimiento.pause();guardar();observer.disconnect();actualizar.current=null;
      document.removeEventListener('visibilitychange',ajustar);
      window.removeEventListener('blur',desenfocar);window.removeEventListener('focus',enfocar);
      window.removeEventListener('pagehide',salir);window.removeEventListener('pageshow',volver);
      preferencia.removeEventListener('change',ajustar);movimiento.cancel();
    };
  },[animar]);
  useLayoutEffect(()=>{habilitado.current=activo;actualizar.current?.();},[activo]);
  return <svg ref={elemento} data-continuidad={animar?'pendiente':undefined} className="cv-trama-vectorial" aria-hidden="true" focusable="false" width="100%" height="100%">
    <defs><pattern id={patron} width="1920" height="1080" patternUnits="userSpaceOnUse">
      <use href={`${sprite}#cv-follaje`} width="960" height="540"/>
      <use href={`${sprite}#cv-follaje`} width="960" height="540" transform="translate(1920 0) scale(-1 1)"/>
      <use href={`${sprite}#cv-follaje`} width="960" height="540" transform="translate(0 1080) scale(1 -1)"/>
      <use href={`${sprite}#cv-follaje`} width="960" height="540" transform="translate(1920 1080) scale(-1 -1)"/>
    </pattern></defs><rect width="100%" height="100%" fill={`url(#${patron})`}/>
  </svg>;
}
export function MotivoBotanico({tipo}:{tipo:'palma'|'flor'|'monstera'|'rama-color'|'ondas'}){
  const caja=tipo==='rama-color'?'0 0 180 340':tipo==='ondas'?'0 0 1920 240':tipo==='palma'?'0 0 500 370':tipo==='flor'?'0 0 510 320':'0 0 520 430';
  const [,,ancho,alto]=caja.split(' ');
  return <svg className={`cv-motivo-vectorial cv-motivo-${tipo}`} aria-hidden="true" focusable="false" viewBox={caja} preserveAspectRatio={tipo==='ondas'?'none':'xMidYMid meet'}><use href={`${sprite}#cv-${tipo}`} width={ancho} height={alto}/></svg>;
}
