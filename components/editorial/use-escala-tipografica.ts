'use client';

import { useLayoutEffect, useRef } from 'react';
import { CATEGORIAS, type Ajustes } from './escala-tipografica';

export function reglasDeEscala(ajustes: Ajustes) {
  return CATEGORIAS.filter(c => ajustes[c.id] !== undefined && ajustes[c.id] !== 100)
    .map(c => `${c.selector.split(',').map(selector => `${selector.startsWith('main ') ? '#app-frame ' : ''}${selector}[data-tamano-texto-base]`).join(',')}{font-size:calc(var(--tamano-texto-base) * ${(ajustes[c.id] ?? 100) / 100})!important}`)
    .join('\n');
}

export function useEscalaTipografica(ajustes: Ajustes) {
  const estilo = useRef<HTMLStyleElement>(null);
  useLayoutEffect(() => {
    const hoja = estilo.current;
    if (!hoja || !Object.keys(ajustes).length) return;
    let pendiente: number | null = null;
    const elementos = new Set<HTMLElement>();
    const nuevos = new Set<HTMLElement>();
    const selector = CATEGORIAS.filter(c => ajustes[c.id] !== undefined && ajustes[c.id] !== 100)
      .map(c => c.selector).join(',');
    let medicionCompleta = false;

    function liberar(elemento: HTMLElement) {
      elemento.style.removeProperty('--tamano-texto-base');
      elemento.removeAttribute('data-tamano-texto-base');
      elementos.delete(elemento);
    }

    function recoger(raiz: Element | Document, destino: Set<HTMLElement>) {
      if (!selector) return;
      if (raiz instanceof HTMLElement && raiz.matches(selector)) destino.add(raiz);
      raiz.querySelectorAll<HTMLElement>(selector).forEach(elemento => {
        if (elemento instanceof HTMLElement) destino.add(elemento);
      });
    }

    function medir(completa: boolean) {
      if (!hoja || !selector) return;
      const candidatos = completa ? new Set<HTMLElement>() : new Set(nuevos);
      nuevos.clear();
      if (completa) recoger(document, candidatos);
      for (const elemento of candidatos) {
        if (!elemento.isConnected || elemento.closest('.dialogo-editorial')
          || (!completa && elementos.has(elemento))) candidatos.delete(elemento);
      }
      for (const elemento of elementos) {
        if (!elemento.isConnected || (completa && !candidatos.has(elemento))) liberar(elemento);
      }
      if (!candidatos.size) return;

      // Los portales nuevos aún no tienen reglas de escala: no es necesario
      // invalidar los estilos de toda la página para medir sus opciones.
      // Dentro de un padre escalado sí hay que recuperar el tamaño heredado original.
      const desactivar = completa || Array.from(candidatos).some(elemento =>
        elemento.parentElement?.closest('[data-tamano-texto-base]'));
      const estabaDesactivada = hoja.disabled;
      if (desactivar) hoja.disabled = true;
      try {
        const medidas = new Map<HTMLElement, string>();
        // Leer todo antes de escribir evita recalcular el layout por cada elemento.
        candidatos.forEach(elemento => medidas.set(elemento, getComputedStyle(elemento).fontSize));
        for (const [elemento, medida] of medidas) {
          elemento.style.setProperty('--tamano-texto-base', medida);
          elemento.setAttribute('data-tamano-texto-base', '');
          elementos.add(elemento);
        }
      } finally {
        if (desactivar) hoja.disabled = estabaDesactivada;
      }
    }

    function programarMedicion() {
      if (pendiente !== null) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = null;
        const completa = medicionCompleta;
        medicionCompleta = false;
        medir(completa);
      });
    }

    function alRedimensionar() {
      medicionCompleta = true;
      programarMedicion();
    }

    medir(true);
    const observador = new MutationObserver(cambios => {
      let hayEliminados = false;
      for (const cambio of cambios) {
        if (cambio.target instanceof Element
          && cambio.target.closest('[data-preferencias-tipografia],.dialogo-editorial')) continue;
        hayEliminados ||= cambio.removedNodes.length > 0;
        cambio.addedNodes.forEach(nodo => {
          if (nodo instanceof Element) recoger(nodo, nuevos);
        });
      }
      if (nuevos.size || hayEliminados) programarMedicion();
    });
    observador.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', alRedimensionar);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', alRedimensionar);
      if (pendiente !== null) cancelAnimationFrame(pendiente);
      nuevos.clear();
      elementos.forEach(liberar);
    };
  }, [ajustes]);
  return estilo;
}
