'use client';
import { useEffect } from 'react';
import { useFuenteActualizable } from '@/hooks/use-fuente-actualizable';
import { AvisoActualizacion } from '@/components/layout/aviso-actualizacion';
import type { ClasificacionDocumentalCompacta,MetodoClasificacion } from '@/types/clasificacion-documental';

export function ClasificacionActualizada({metodo,inicial,onDatos}:{metodo:MetodoClasificacion;inicial:ClasificacionDocumentalCompacta;onDatos:(datos:ClasificacionDocumentalCompacta)=>void}) {
  const {datos,error}=useFuenteActualizable({...inicial,version:'consulta-inicial'},`/api/clasificaciones-comentarios?metodo=${metodo}`);
  useEffect(()=>{if(datos.version!=='consulta-inicial')onDatos(datos);},[datos,onDatos]);
  return error?<AvisoActualizacion/>:null;
}
