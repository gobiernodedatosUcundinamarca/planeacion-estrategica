import 'server-only';
import { getRespuestasMomento4,getClustersMomento4,getClasificacionDocumental,getResumenFuentesClasificacion } from './momento4Repository';
import { getAportes } from './aportesRepository';
import { getDocumentosConversatorios } from './conversatoriosRepository';
import { compactarClasificacion } from '@/lib/reglas/navegacion-comentarios';
import { versionarDatos } from '@/lib/datos-versionados';
import type { ResultadoClasificacionDocumental,ResumenFuentesClasificacion } from '@/types/clasificacion-documental';
import type { RespuestaAporte } from '@/types/aportes';
import type { RespuestaMomento4,ClusterComentarios } from '@/types/momento4';

export async function getVistaTransformaciones() {
  let respuestas:RespuestaMomento4[]=[],clusters:ClusterComentarios[]=[],errorRespuestas=false;
  try {[respuestas,clusters]=await Promise.all([getRespuestasMomento4(),getClustersMomento4()]);}
  catch {errorRespuestas=true;}
  let clasificacion:ResultadoClasificacionDocumental={disponible:false,comentarios:[]};
  let resumenFuentes:ResumenFuentesClasificacion={disponibles:[],porComentario:{}};
  let errorClasificacion=false,errorAportes=false;
  try {[clasificacion,resumenFuentes]=await Promise.all([getClasificacionDocumental("bert-jev-unidad"),getResumenFuentesClasificacion()]);}
  catch {errorClasificacion=true;}
  let presentaciones:ResultadoClasificacionDocumental={disponible:false,comentarios:[]},errorPresentaciones=false;
  let unidadesPresentaciones:string[]=[];
  try {
    presentaciones=await getClasificacionDocumental('aportes-plan');
    unidadesPresentaciones=getDocumentosConversatorios().filter(d=>!d.general).map(d=>d.unidad);
  } catch {errorPresentaciones=true;}
  let aportes:RespuestaAporte[]=[];
  try {aportes=await getAportes();} catch {errorAportes=true;}
  return versionarDatos({respuestas,clusters,clasificacion:compactarClasificacion(clasificacion),clasificacionPresentaciones:compactarClasificacion(presentaciones),unidadesPresentaciones,resumenFuentes,aportes,errorRespuestas,errorClasificacion,errorPresentaciones,errorAportes});
}
