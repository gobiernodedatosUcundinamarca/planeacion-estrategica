'use client';
import type { CSSProperties } from 'react';
import { formato, porcentaje } from './modelo';
const posiciones = [[145, 120], [460, 95], [760, 140], [810, 350], [640, 510], [310, 510], [390, 300]];
export function Atlas({ seleccion, onElegir, unidades }: {
    unidades: import("@/types/convocatoria-documental").ConvocatoriaDocumental["filas"];
    seleccion: string;
    onElegir: (s: string) => void;
}) {
    const escala=Math.max(1,...unidades.flatMap(u=>[u.convocados,u.asistentes]));
    const unidadesPorAsistencia=[...unidades].sort((a,b)=>b.asistentes-a.asistentes);
    return <>
    <svg viewBox="0 0 1000 650" role="img" aria-labelledby="atlas-nombre atlas-descripcion" className="atlas-svg">
    <title id="atlas-nombre">Siete unidades: convocatoria y asistencia documental</title>
    <desc id="atlas-descripcion">La constelación simbólica de unidades se alinea en comparaciones. Verde: asistentes documentados; línea de fondo: convocados. Todos los valores están en la tabla de inspección. No es un mapa geográfico.</desc>
    <g className="conexiones" aria-hidden="true">{posiciones.map(([x, y], i) => <line key={i} x1="440" y1="300" x2={x} y2={y} stroke="currentColor" strokeWidth="1"/>)}</g>{unidades.map((u, i) => {
            const [x, y] = posiciones[i];
            const width = u.convocados / escala * 440;
            const posicionFinal = unidadesPorAsistencia.findIndex(fila => fila.unidad === u.unidad);
            return <g key={u.unidad} data-unidad={u.unidad} data-asistentes={u.asistentes} className={`unidad-morph ${seleccion === u.unidad ? 'inspeccionada' : ''}`} style={{ '--x': `${x}px`, '--y': `${y}px`, '--row': `${75 + posicionFinal * 78}px` } as CSSProperties} onClick={() => onElegir(seleccion === u.unidad ? 'Todas' : u.unidad)}>
            <g className="sello">
            <circle r="62" fill="var(--paper)" stroke="var(--green)" strokeWidth="1.5"/>
            <text y="-8" textAnchor="middle" className="sello-valor">{formato(u.convocados)}</text>
            <text y="14" textAnchor="middle" className="sello-etiqueta">convocados</text>
            <text y="85" textAnchor="middle" className="sello-nombre">{u.unidad}</text>
            </g>
            <g className="registro-barra">
            <text y="-17" className="barra-nombre">{u.unidad}</text>
            <rect width={width} height="14" rx="2" fill="#c8d4c7"/>
            <rect width={u.asistentes / escala * 440} height="14" rx="2" fill="var(--green)"/>
            <text x="470" y="12" className="barra-valor">{formato(u.asistentes)} / {formato(u.convocados)}</text>
            <text x="750" y="12" textAnchor="end" className="barra-porcentaje">{porcentaje(u.asistentes, u.convocados)}%</text>
            </g>
            </g>;
        })}<text x="70" y="635" className="escala-atlas">Mayor a menor asistencia · escala común: 0 — {formato(escala)} registros</text>
    </svg>
<div className="atlas-mobile" role="group" aria-label="Comparación de unidades">{unidadesPorAsistencia.map(u => <button key={u.unidad} aria-pressed={seleccion === u.unidad} onClick={() => onElegir(seleccion === u.unidad ? 'Todas' : u.unidad)}>
        <strong>{u.unidad}</strong>
        <span>{formato(u.asistentes)} asistentes / {formato(u.convocados)} convocados</span>
        <span className="barra-mobile" aria-hidden>
        <i style={{ width: `${u.asistentes / u.convocados * 100}%` }}/>
        </span>
        </button>)}</div>
    </>;
}
