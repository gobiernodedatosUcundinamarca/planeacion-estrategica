'use client';
import { useEffect, useRef, useState } from 'react';
export function useEscena(esencial: boolean, pausa: boolean) {
    const ref = useRef<HTMLElement>(null);
    const [paso, setPaso] = useState(0);
    const [nivel, setNivel] = useState('pendiente');
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const forzar = new URLSearchParams(location.search).has('compatible');
        const nativo = !forzar && CSS.supports('animation-timeline', '--atlas') && CSS.supports('view-timeline-name', '--atlas') && CSS.supports('animation-range', 'contain 0% contain 100%') && CSS.supports('timeline-scope', '--atlas');
        const motor = esencial ? 'esencial' : nativo ? 'nativo' : 'compatible';
        el.dataset.motor = motor;
        setNivel(motor);
        if (esencial) {
            el.style.setProperty('--p', '1');
            return;
        }
        if (pausa)
            return;
        const pasos = new IntersectionObserver(entries => { for (const e of entries)
            if (e.isIntersecting)
                setPaso(Number((e.target as HTMLElement).dataset.paso)); }, { rootMargin: '-30% 0px -35% 0px', threshold: 0 });
        el.querySelectorAll('[data-paso]').forEach(e => pasos.observe(e));
        let frame = 0, escuchando = false;
        function pintar() {
            frame = 0;
            const rect = el!.getBoundingClientRect();
            const clamp = (n: number) => Math.max(0, Math.min(1, n));
            const progreso = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
            const avance = clamp((progreso - .12) / .43);
            // Misma curva suave que cubic-bezier(1/3,0,2/3,1) del motor CSS.
            const movimiento = avance * avance * (3 - 2 * avance);
            el!.style.setProperty('--movimiento', String(movimiento));
            el!.style.setProperty('--escala-nodo', String(1 - .55 * avance));
            el!.style.setProperty('--corte-nodo', `${clamp((progreso - .25) / .30) * 100}%`);
            el!.style.setProperty('--corte-barra', `${(1 - clamp((progreso - .35) / .43)) * 100}%`);
            el!.style.setProperty('--conexiones', String(1 - clamp(progreso / .4)));
        }
        function pedir() { if (!frame)
            frame = requestAnimationFrame(pintar); }
        function quitar() { window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); cancelAnimationFrame(frame); frame = 0; escuchando = false; }
        const visibilidad = new IntersectionObserver(([e]) => { if (nativo)
            return; if (e.isIntersecting && !escuchando) {
            window.addEventListener('scroll', pedir, { passive: true });
            window.addEventListener('resize', pedir, { passive: true });
            escuchando = true;
            pedir();
        }
        else if (!e.isIntersecting)
            quitar(); });
        visibilidad.observe(el);
        return () => { pasos.disconnect(); visibilidad.disconnect(); quitar(); };
    }, [esencial, pausa]);
    return { ref, paso, nivel };
}
