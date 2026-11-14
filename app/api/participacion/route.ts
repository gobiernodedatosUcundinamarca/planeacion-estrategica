import { NextRequest, NextResponse } from 'next/server';
import { getVistaParticipacion } from '@/repositories/participacionVistaRepository';
import { estaSeccionPublicada } from '@/repositories/seccionesRepository';
import { SECCION_PARTICIPACION } from '@/constants/secciones';
import { responderDatos,cabecerasSinCache as sinCache } from '@/lib/datos-versionados';

export const dynamic = 'force-dynamic';

export async function GET(solicitud: NextRequest) {
  try {
    if (!(await estaSeccionPublicada(SECCION_PARTICIPACION))) return NextResponse.json({error:'Sección no disponible'},{status:404,headers:sinCache});
    const datos = await getVistaParticipacion();
    return responderDatos(solicitud,datos);
  } catch {
    return NextResponse.json({error:'No se pudo actualizar la participación.'},{status:503,headers:sinCache});
  }
}
