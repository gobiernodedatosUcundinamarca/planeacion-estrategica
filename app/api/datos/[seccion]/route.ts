import { getVistaConversatorios } from '@/repositories/conversatoriosRepository';
import { NextResponse } from 'next/server';
import { getVistaValoracionTerritorio } from '@/repositories/valoracionTerritorioRepository';
import { getVistaTransformaciones } from '@/repositories/transformacionesVistaRepository';
import { estaSeccionPublicada } from '@/repositories/seccionesRepository';
import { SECCION_CONVERSATORIOS,SECCION_TRANSFORMACIONES,SECCION_VALORACION_TERRITORIO } from '@/constants/secciones';
import { versionarDatos,responderDatos,cabecerasSinCache } from '@/lib/datos-versionados';

export const dynamic='force-dynamic';
export async function GET(solicitud:Request,{params}:{params:Promise<{seccion:string}>}) {
  const {seccion}=await params;
  const publicacion=seccion==='conversatorios' ? SECCION_CONVERSATORIOS : seccion==='valoracion' ? SECCION_VALORACION_TERRITORIO : seccion==='transformaciones' ? SECCION_TRANSFORMACIONES : null;
  if (!publicacion) return NextResponse.json({error:'Fuente no disponible'},{status:404,headers:cabecerasSinCache});
  try {
    if (!(await estaSeccionPublicada(publicacion))) return NextResponse.json({error:'Sección no disponible'},{status:404,headers:cabecerasSinCache});
    const datos=seccion==='conversatorios' ? await getVistaConversatorios() : seccion==='valoracion' ? versionarDatos({vista:await getVistaValoracionTerritorio()}) : await getVistaTransformaciones();
    if ('errorRespuestas' in datos && datos.errorRespuestas) throw Error('Fuente no disponible');
    if ('errorPresentaciones' in datos && datos.errorPresentaciones) throw Error('Fuente documental no disponible');
    return responderDatos(solicitud,datos);
  } catch {
    return NextResponse.json({error:'No se pudo consultar la fuente actual.'},{status:503,headers:cabecerasSinCache});
  }
}
