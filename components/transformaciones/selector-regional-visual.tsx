'use client';

import { useId } from 'react';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { formatNumero } from '@/lib/formatters';
import type { OpcionComentarios } from '@/lib/reglas/navegacion-comentarios';
import './selector-regional-visual.css';

const fotos: Record<string, string> = {
  'Extensión Chía': 'extension-chia', 'Extensión Facatativá': 'extension-facatativa',
  'Extensión Soacha': 'extension-soacha', 'Extensión Zipaquirá': 'extension-zipaquira',
  'Seccional Girardot': 'seccional-girardot', 'Seccional Ubaté': 'seccional-ubate',
  'Sede Fusagasugá': 'sede-fusagasuga',
};

export function SelectorRegionalVisual({ opciones, seleccionado, onSeleccionar }: {
  opciones: OpcionComentarios[]; seleccionado: string | null; onSeleccionar: (id: string | null) => void;
}) {
  const id = useId();
  return <div className="selector-regional-visual">
    <div className="cabecera-regional-visual"><h3 id={`${id}-titulo`}><TextoEditorial id="selector-regional-visual-titulo" original="1. Unidad regional"/></h3>
      <span>{seleccionado ?? <TextoEditorial id="selector-regional-visual-todas" original="Todas las opciones"/>}</span>
    </div>
    <div className="opciones-regionales-visuales" role="group" aria-labelledby={`${id}-titulo`}>
      {opciones.map((opcion, indice) => {
        const foto = fotos[opcion.nombre];
        const activo = seleccionado === opcion.id;
        const clip = `${id}-${indice}`;
        return <button key={opcion.id} type="button" className="opcion-regional-visual" aria-pressed={activo}
          onClick={() => onSeleccionar(activo ? null : opcion.id)}>
          <svg viewBox="0 0 56 56" width="48" height="48" aria-hidden="true" focusable="false">
            <defs><clipPath id={clip}><circle cx="28" cy="28" r="21"/></clipPath></defs>
            <circle cx="28" cy="28" r="26" className="anillo-regional"/>
            {foto ? <image href={`/assets/regionales/${foto}.webp`} x="7" y="7" width="42" height="42" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`}/>
              : <g className="regional-sin-foto"><circle cx="28" cy="28" r="21"/><path d="M20 36V23l8-5 8 5v13M17 36h22M25 36v-7h6v7M25 24h1m4 0h1"/></g>}
            {activo ? <g><circle cx="46" cy="45" r="9" fill="var(--primary)"/><path d="m42 45 3 3 5-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></g> : null}
          </svg>
          <span className="nombre-opcion-regional">{opcion.nombre}</span><span className="total-opcion-regional">{formatNumero(opcion.total)}</span>
        </button>;
      })}
    </div>
  </div>;
}
