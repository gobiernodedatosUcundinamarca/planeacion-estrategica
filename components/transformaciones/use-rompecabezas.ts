'use client';
import { useEffect,useRef } from 'react';

export function useRompecabezas(cara:string) {
  const escena=useRef<HTMLElement>(null),lienzo=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const elemento=escena.current,marco=lienzo.current;
    if (!elemento || !marco) return;
    const media=matchMedia('(prefers-reduced-motion: reduce)'),pequena=matchMedia('(max-width: 850px)');
    let frame=0,apertura=0,anterior=0,listo=false,vigente=true,visible=false;
    let espera:ReturnType<typeof setTimeout>|undefined;
    const piezas=[...marco.querySelectorAll<HTMLImageElement>('[data-pieza]')];
    const reducido=()=>media.matches||pequena.matches||document.documentElement.classList.contains('forzar-escritorio');
    function aplicar() {
      marco!.dataset.completo=String(apertura<.001);
      piezas.forEach(pieza=>{
        const pos=Number(pieza.dataset.posicion);
        const [x,y]=pos===1?[0,0]:pos===2?[-12,-10]:pos===3?[12,-10]:pos===4?[12,7]:pos===5?[0,12]:[-12,7];
        pieza.style.transform=`translate(${x*apertura}%,${y*apertura}%) rotate(${pos===1?0:(pos%2?1:-1)*2*apertura}deg)`;
      });
    }
    function pintar(ahora:number) {
      frame=0;
      if (!vigente) return;
      if (reducido()) {apertura=0;aplicar();return;}
      if (!visible || !listo) return;
      const r=elemento!.getBoundingClientRect();
      const avance=Math.max(0,Math.min(1,(innerHeight*.35-r.top)/Math.max(1,r.height-innerHeight*.55)));
      const destino=1-avance,delta=anterior?Math.min(64,ahora-anterior):16;
      anterior=ahora;
      apertura+=(destino-apertura)*(1-Math.exp(-delta/260));
      if (Math.abs(destino-apertura)<.001) apertura=destino;
      aplicar();
      if (Math.abs(destino-apertura)>.001) programar();
    }
    function programar() {if(!frame)frame=requestAnimationFrame(pintar);}
    const observador=new IntersectionObserver(([entrada])=>{visible=entrada.isIntersecting;anterior=0;if(visible)programar();},{rootMargin:'80px'});
    observador.observe(elemento);
    aplicar();
    void Promise.all(piezas.map(p=>p.decode().catch(()=>{}))).then(()=>{if(vigente)espera=setTimeout(()=>{listo=true;programar();},500);});
    window.addEventListener('scroll',programar,{passive:true});window.addEventListener('resize',programar);media.addEventListener('change',programar);pequena.addEventListener('change',programar);
    return ()=>{vigente=false;clearTimeout(espera);cancelAnimationFrame(frame);observador.disconnect();window.removeEventListener('scroll',programar);window.removeEventListener('resize',programar);media.removeEventListener('change',programar);pequena.removeEventListener('change',programar);};
  },[cara]);
  return {escena,lienzo};
}
