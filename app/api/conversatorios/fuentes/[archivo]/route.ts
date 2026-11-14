import { NextResponse } from 'next/server';
import { leerPresentacionConversatorios } from '@/repositories/conversatoriosRepository';
import { estaSeccionPublicada } from '@/repositories/seccionesRepository';
import { SECCION_CONVERSATORIOS } from '@/constants/secciones';
import { cabecerasSinCache } from '@/lib/datos-versionados';
export const dynamic = 'force-dynamic';
export async function GET(_: Request, { params }: { params: Promise<{ archivo: string }> }) {
  if (!(await estaSeccionPublicada(SECCION_CONVERSATORIOS))) return new NextResponse(null, { status: 404 });
  try {
    const { archivo } = await params;
    const bytes = leerPresentacionConversatorios(archivo);
    if (!bytes) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(bytes), { headers: { ...cabecerasSinCache, 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Disposition': `attachment; filename="${archivo}"` } });
  } catch { return NextResponse.json({ error: 'Fuente no disponible' }, { status: 503, headers: cabecerasSinCache }); }
}
