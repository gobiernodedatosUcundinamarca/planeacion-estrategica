import {getImagenFuenteConversatorios} from '@/repositories/conversatoriosVistasRepository';
import {estaSeccionPublicada} from '@/repositories/seccionesRepository';
import {SECCION_CONVERSATORIOS} from '@/constants/secciones';
import {cabecerasSinCache} from '@/lib/datos-versionados';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(r:Request,{params}:{params:Promise<{archivo:string;pagina:string}>}){
  if(!(await estaSeccionPublicada(SECCION_CONVERSATORIOS)))return new Response(null,{status:404});
  try{
    const {archivo,pagina}=await params;
    if(!/^\d+$/.test(pagina))return Response.json({error:'Página no válida'},{status:400});
    const imagen=await getImagenFuenteConversatorios(archivo,Number(pagina),new URL(r.url).searchParams.get('v'));
    return new Response(new Uint8Array(imagen),{headers:{...cabecerasSinCache,'Content-Type':'image/png','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'}});
  }catch(e){return Response.json({error:e instanceof Error?e.message:'No se pudo preparar la vista previa'},{status:503,headers:cabecerasSinCache})}
}
