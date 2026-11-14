import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

export function versionarDatos<T extends object>(datos:T) {
  const version=createHash('sha256').update(JSON.stringify(datos)).digest('hex');
  return {...datos,version};
}
export const cabecerasSinCache={'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store'};
export function responderDatos<T extends {version:string}>(solicitud:Request,datos:T) {
  const etag=`"${datos.version}"`;
  const headers={...cabecerasSinCache,ETag:etag};
  return solicitud.headers.get('if-none-match')===etag ? new NextResponse(null,{status:304,headers}) : NextResponse.json(datos,{headers});
}
