'use client';
import { useEffect, useRef, useState } from 'react';

/** No reenvía ni renderiza conjuntos de datos cuya huella no haya cambiado. */
export function useFuenteActualizable<T extends {version:string}>(inicial:T,ruta:string) {
  const [datos,setDatos]=useState(inicial);
  const [error,setError]=useState(false);
  const version=useRef(inicial.version);
  useEffect(()=>{
    let vigente=true,pendiente=false;
    const controlador=new AbortController();
    async function consultar() {
      if (pendiente || document.visibilityState!=='visible') return;
      pendiente=true;
      try {
        const respuesta=await fetch(ruta,{cache:'no-store',headers:{'If-None-Match':`"${version.current}"`},signal:controlador.signal});
        if (respuesta.status===304) {if(vigente)setError(false);return;}
        if (!respuesta.ok) throw Error('Fuente no disponible');
        const nuevo:T=await respuesta.json();
        if (typeof nuevo.version!=='string' || !nuevo.version) throw Error('Respuesta incompleta');
        if (vigente) {
          if (version.current!==nuevo.version) {version.current=nuevo.version;setDatos(nuevo);}
          setError(false);
        }
      } catch {if(vigente)setError(true);}
      finally {pendiente=false;}
    }
    void consultar();
    const reloj=setInterval(()=>{void consultar();},30000);
    const cambio=()=>{void consultar();};
    document.addEventListener('visibilitychange',cambio);window.addEventListener('focus',cambio);window.addEventListener('online',cambio);
    return ()=>{vigente=false;controlador.abort();clearInterval(reloj);document.removeEventListener('visibilitychange',cambio);window.removeEventListener('focus',cambio);window.removeEventListener('online',cambio);};
  },[ruta]);
  return {datos,error};
}
