'use client';

import {TextoEditorial,TextoDeCatalogo,EtiquetaEditorial,LapizDeCatalogo} from "@/components/editorial/texto-editorial";
import {useState} from 'react';
import {Tooltip, TooltipTrigger, TooltipContent} from '@/components/ui/tooltip';
import {formato, type DatosNarrativos} from './modelo';

type Jornada = DatosNarrativos['jornadasRegionales'][number];
const fechaLarga = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(fecha+'T12:00:00').toLocaleDateString('es-CO',{dateStyle:'long'}) : fecha;
const fechaCorta = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(fecha+'T12:00:00').toLocaleDateString('es-CO',{day:'numeric',month:'short'}) : fecha;

function Detalle({jornada}: {jornada: Jornada}) {
    return <div className="contenido-jornada">
        <h3>{jornada.unidad}</h3><p className="fechas-detalle">{jornada.fechas.map(f=>fechaLarga(f.nombre)).join(" · ")}</p>
        <p className="total-jornada"><strong>{formato(jornada.total)}</strong> <TextoEditorial id="63c0ac3fb763df409a77" original={"registros de asistencia"}/></p>
        {[
            ['Asistencias por fecha registrada', jornada.fechas.map(f=>({nombre:fechaLarga(f.nombre),total:f.total}))],
            ['Lugar de la jornada', jornada.lugares],
            ['Grupos de interés · rol registrado', jornada.grupos],
            ['Unidad regional de origen de los participantes', jornada.origenes],
        ].map(([titulo, filas]) => <section key={titulo as string}>
            <h4><TextoDeCatalogo texto={titulo as string}/></h4>
            <ul>{(filas as Jornada['grupos']).map(fila => <li key={fila.nombre}><span>{fila.nombre}</span><strong>{formato(fila.total)}</strong></li>)}</ul>
        </section>)}
        <p className="nota-jornada"><TextoEditorial id="51d17cada8eb8b99d1ce" original={"Cada registro corresponde a una asistencia. Una misma persona puede asistir a varias jornadas."}/></p>
    </div>;
}

export function Jornadas({jornadas}: {jornadas: Jornada[]}) {
    const [seleccion, setSeleccion] = useState<string | null>(null);
    const maximo = Math.max(...jornadas.map(j => j.total));
    const elegida = jornadas.find(j => j.unidad === seleccion);
    return <>
        <div className="leyenda-jornadas"><span><TextoEditorial id="participacion-asistencia-regional-leyenda" original={"Asistencias agrupadas por lugar de la jornada · consulte cada barra para ver su detalle"}/></span><span><TextoEditorial id="participacion-maximo-regional" original={"Máximo por unidad regional:"}/> {formato(maximo)}</span></div>
        <div className="partitura" tabIndex={0} role="list" aria-label="Asistencia agrupada por lugar de la jornada">
            {jornadas.map(j => <div role="listitem" className="jornada" key={j.unidad} data-unidad={j.unidad} data-total={j.total}>
                <Tooltip>
                    <TooltipTrigger className="jornada-button" aria-label={`${j.unidad}, ${j.fechas.map(f=>fechaLarga(f.nombre)).join(", ")}: ${formato(j.total)} registros de asistencia. Ver grupos de interés y unidades regionales.`} aria-expanded={seleccion === j.unidad} aria-controls="detalle-jornada" onClick={() => setSeleccion(seleccion === j.unidad ? null : j.unidad)}>
                        <span className="jornada-area" aria-hidden="true"><span className="jornada-trazo" style={{height:`${j.total/maximo*100}%`}}/></span>
                        <strong>{formato(j.total)}</strong><span className="unidad-jornada"><EtiquetaEditorial texto="asistencias"/></span>
                        <span className="fechas-jornada">{j.fechas.map(f=><time key={f.nombre} dateTime={/^\d{4}-\d{2}-\d{2}$/.test(f.nombre)?f.nombre:undefined}>{fechaCorta(f.nombre)}</time>)}</span><span className="nombre-regional-jornada">{j.unidad}</span>
                    </TooltipTrigger>
                    <TooltipContent role="tooltip" className="detalle-jornada-tooltip" side="top" sideOffset={10}><Detalle jornada={j}/></TooltipContent>
                </Tooltip>
            </div>)}
        </div>
        <p className="nota-agrupacion"><TextoDeCatalogo texto="Cada barra suma las asistencias registradas en el mismo lugar. Las fechas originales se conservan en el detalle; no representan personas únicas."/></p><div id="detalle-jornada" aria-live="polite">
            {elegida ? <div className="detalle-jornada-panel"><button className="cerrar-jornada" onClick={() => setSeleccion(null)}><EtiquetaEditorial texto="Cerrar detalle"/></button><LapizDeCatalogo texto="Cerrar detalle"/><Detalle jornada={elegida}/></div> : null}
        </div>
    </>;
}
