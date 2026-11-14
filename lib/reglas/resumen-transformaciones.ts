import type { RespuestaMomento4 } from '@/types/momento4';
import { clasificarRespaldo } from './momento4';
import { comentariosExistentes } from './navegacion-comentarios';
import { compararOrdenTransformaciones } from './orden-transformaciones';

/** Los grupos y sus resultados salen de los registros, no del catálogo visual. */
export function resumirTransformaciones(respuestas:RespuestaMomento4[]) {
  const grupos=new Map<string,{id:string;nombre:string;respuestas:number;favorables:number}>();
  for (const respuesta of respuestas) {
    const grupo=grupos.get(respuesta.transformacion)??{id:respuesta.transformacion,nombre:respuesta.etiqueta||respuesta.transformacion,respuestas:0,favorables:0};
    grupo.respuestas++;
    if (clasificarRespaldo(respuesta.respondeNecesidad)==='si') grupo.favorables++;
    grupos.set(grupo.id,grupo);
  }
  return {total:respuestas.length,comentarios:comentariosExistentes(respuestas).length,grupos:[...grupos.values()].sort((a,b) => compararOrdenTransformaciones(a.id,b.id))};
}
