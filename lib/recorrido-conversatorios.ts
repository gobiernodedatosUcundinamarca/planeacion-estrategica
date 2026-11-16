import type {DocumentoConversatorio,GrupoConversatorio,DiapositivaConversatorio,SolicitudConversatorio} from '@/types/conversatorios';
export interface Voz {id:string;grupo:GrupoConversatorio;fuente:DiapositivaConversatorio}
export interface Peticion {id:string;solicitud:SolicitudConversatorio;fuente:DiapositivaConversatorio}
/** Solo organiza referencias al contenido original: no resume ni relaciona temas por inferencia. */
export function construirRecorrido(documento:DocumentoConversatorio){
  const voces:Voz[]=[],peticiones:Peticion[]=[];
  documento.diapositivas.forEach(s=>{s.grupos.forEach((g,i)=>voces.push({id:`${s.numero}-g-${i}`,grupo:g,fuente:s}));s.solicitudes.forEach((solicitud,i)=>peticiones.push({id:`${s.numero}-s-${i}`,solicitud,fuente:s}));});
  return {voces,peticiones,planteamientos:voces.reduce((s,v)=>s+v.grupo.planteamientos.length,0)};
}
/** Solo la síntesis general documenta frecuencias de unidades; en regionales la referencia es ordinal. */
export function frecuenciaDocumentada(documento:DocumentoConversatorio,solicitud:SolicitudConversatorio){
  if(!documento.general||!/^\d+$/.test(solicitud.referencia))return null;
  return Number(solicitud.referencia);
}
