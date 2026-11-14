import { NextRequest, NextResponse } from 'next/server';
import { leerTextosEditoriales, guardarTextoEditorial, validarClave, token, sesion, reservarIntento, limpiarIntentos } from '@/repositories/editorialRepository';
import { configuracionEditorial, origenEditorialPermitido } from '@/lib/editorial/configuracion';
import { validarCambio } from '@/lib/editorial/modelo';
import contenidoInicial from '@/editorial/contenido-inicial.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieLocal = 'editorial-sesion';
const cookieSegura = '__Host-editorial-sesion';
const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' } });
function origenSolicitud(r: NextRequest) {
  try { return new URL(`${r.nextUrl.protocol}//${r.headers.get('host') ?? ''}`).origin; }
  catch { return ''; }
}

async function leerCuerpo(r: NextRequest) {
  if (!r.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw Error('DATOS_INVALIDOS');
  const lector = r.body?.getReader();
  if (!lector) throw Error('DATOS_INVALIDOS');
  const trozos: Uint8Array[] = [];
  let longitud = 0;
  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      longitud += value.byteLength;
      if (longitud > 10000) { await lector.cancel(); throw Error('CUERPO_GRANDE'); }
      trozos.push(value);
    }
  } finally { lector.releaseLock(); }
  const body = JSON.parse(Buffer.concat(trozos).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('DATOS_INVALIDOS');
  return body as Record<string, unknown>;
}

export async function GET(r: NextRequest) {
  const config = configuracionEditorial();
  if (!origenEditorialPermitido(origenSolicitud(r), config)) return ok({ ...contenidoInicial, autorizado: false, habilitado: false });
  try {
    const cookie = config?.modo === 'postgres' && r.nextUrl.protocol === 'https:' ? cookieSegura : cookieLocal;
    return ok({ ...await leerTextosEditoriales(), autorizado: await sesion(r.cookies.get(cookie)?.value || ''), habilitado: true });
  } catch { return ok({ error: 'No se pudieron consultar los textos guardados.' }, 503); }
}

export async function POST(r: NextRequest) {
  const config = configuracionEditorial();
  const origen = origenSolicitud(r);
  if (!origenEditorialPermitido(origen, config)) return ok({ error: 'Edición no habilitada en este entorno.' }, 503);
  if (r.headers.get('origin') !== origen) return ok({ error: 'Origen no válido' }, 403);
  const cookie = config?.modo === 'postgres' && r.nextUrl.protocol === 'https:' ? cookieSegura : cookieLocal;
  let body: Record<string, unknown>;
  try { body = await leerCuerpo(r); }
  catch (error) { return ok({ error: 'Solicitud no válida' }, (error as Error).message === 'CUERPO_GRANDE' ? 413 : 400); }
  try {
    if (body.accion === 'entrar') {
      if (typeof body.clave !== 'string' || body.clave.length > 200) return ok({ error: 'Datos no válidos' }, 400);
      if (!await reservarIntento()) {
        const res = ok({ error: 'Demasiados intentos. Espere 15 minutos.' }, 429);
        res.headers.set('Retry-After', '900');
        return res;
      }
      if (!await validarClave(body.clave)) return ok({ error: 'Contraseña incorrecta' }, 401);
      await limpiarIntentos();
      const res = ok({ autorizado: true });
      res.cookies.set(cookie, await token(), { httpOnly: true, sameSite: 'strict', secure: r.nextUrl.protocol === 'https:', path: '/', maxAge: 7200 });
      return res;
    }
    if (body.accion === 'salir') {
      const res = ok({ autorizado: false });
      res.cookies.set(cookie, '', { httpOnly: true, sameSite: 'strict', secure: r.nextUrl.protocol === 'https:', path: '/', maxAge: 0 });
      return res;
    }
    if (!await sesion(r.cookies.get(cookie)?.value || '')) return ok({ error: 'Acceso requerido' }, 401);
    try { validarCambio(body.id, body.valor, body.revision); }
    catch { return ok({ error: 'Datos no válidos' }, 400); }
    const guardado = await guardarTextoEditorial(body.id, body.valor as string | null, body.revision as number);
    const confirmado = await leerTextosEditoriales();
    const coincide = body.valor === null ? !Object.hasOwn(confirmado.textos,body.id) : confirmado.textos[body.id] === body.valor;
    if (confirmado.revision < guardado.revision || !coincide) return ok({ error: 'No se pudo confirmar el contenido después de guardar. Consulte la versión publicada antes de reintentar.' }, 503);
    return ok(confirmado);
  } catch (error) {
    if ((error as Error).message === 'CONFLICTO') return ok({ error: 'Otra persona modificó los textos. Recargue antes de guardar.' }, 409);
    return ok({ error: 'No se pudo completar la operación. Intente nuevamente.' }, 503);
  }
}
