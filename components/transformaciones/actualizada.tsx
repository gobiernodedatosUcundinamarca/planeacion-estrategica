'use client';
import { useFuenteActualizable } from '@/hooks/use-fuente-actualizable';
import { useMemo,useState } from 'react';
import { AvisoActualizacion } from '@/components/layout/aviso-actualizacion';
import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { PanelTransformaciones } from './panel-transformaciones';
import { ExploradorComentarios } from './explorador-comentarios';
import { Rompecabezas } from './rompecabezas';
import { Button } from '@/components/ui/button';
import { formatNumero } from '@/lib/formatters';
import type { getVistaTransformaciones } from '@/repositories/transformacionesVistaRepository';
import { expandirClasificacion } from '@/lib/reglas/navegacion-comentarios';
import { separarComentariosPresentaciones } from '@/lib/reglas/alcance-presentaciones';

export type DatosTransformaciones=Awaited<ReturnType<typeof getVistaTransformaciones>>;
export function TransformacionesActualizadas({inicial}:{inicial:DatosTransformaciones}) {
  const {datos,error}=useFuenteActualizable(inicial,'/api/datos/transformaciones');
  const [seleccion,setSeleccion]=useState<string|null>(null);
  const activa=seleccion&&datos.respuestas.some(r=>r.transformacion===seleccion)?seleccion:null;
  const filtradas=useMemo(()=>activa?datos.respuestas.filter(r=>r.transformacion===activa):datos.respuestas,[activa,datos.respuestas]);
  const nombre=activa?filtradas[0]?.etiqueta:null;
  const comentariosInforme=useMemo(()=>datos.errorPresentaciones?undefined:separarComentariosPresentaciones(datos.respuestas,expandirClasificacion(datos.clasificacionPresentaciones),datos.unidadesPresentaciones).documentados.length,[datos]);
  return <>{error?<AvisoActualizacion/>:null}
    {datos.errorRespuestas ? <p role="status"><TextoEditorial id="c642ffc95e6f5596e74b" original="No se pudieron cargar las respuestas."/></p> : datos.respuestas.length ? <>
    <Rompecabezas respuestas={datos.respuestas} comentariosInforme={comentariosInforme} seleccion={activa} onSeleccionar={id=>setSeleccion(prev=>prev===id?null:id)}/>
    <div id="datos-transformaciones" className="datos-transformaciones-integrados">
    {activa?<div className="seleccion-puzzle" role="status"><span>{nombre} · {formatNumero(filtradas.length)} <TextoEditorial id="puzzle-respuestas-cortas" original="respuestas"/></span><Button variant="outline" onClick={()=>setSeleccion(null)}><TextoEditorial id="puzzle-ver-todas" original="Ver todas las transformaciones"/></Button></div>:null}
    <section aria-labelledby="titulo-indicadores-encuestas" className="rounded-xl border border-border/70 px-4 py-3">
      <h2 id="titulo-indicadores-encuestas" className="font-medium text-primary"><TextoEditorial id="ed437bd63626e626732c" original="Indicadores y gráficos originales de las encuestas"/></h2>
      <p className="mt-2 text-xs text-muted-foreground"><TextoEditorial id="b9d73f7204ae6b7c6c53" original="Incluyen todas las respuestas del formulario, también las que no tienen un comentario. Sus filtros se consultan dentro de este apartado."/></p>
      <div className="mt-4"><PanelTransformaciones respuestas={filtradas} clusters={datos.clusters} mostrarComentarios={false}/></div>
    </section>
    <ExploradorComentarios respuestas={filtradas} clasificacion={datos.clasificacion} errorClasificacion={datos.errorClasificacion} resumenFuentes={datos.resumenFuentes} clasificacionPresentaciones={datos.clasificacionPresentaciones} unidadesPresentaciones={datos.unidadesPresentaciones} errorPresentaciones={datos.errorPresentaciones}/></div></> : <p><TextoEditorial id="c9856c2398f96629ebcf" original="Todavía no hay respuestas cargadas. Se publican subiendo los documentos de las cinco transformaciones desde la vista de administración."/></p>}

  </>;
}
