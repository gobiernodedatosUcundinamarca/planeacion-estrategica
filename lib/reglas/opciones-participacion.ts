/** Opciones derivadas de las fechas seleccionadas; sin fechas se incluyen todos los registros. */
import type { RegistroParticipacion } from '@/types/participacion';
import { adscripcionesDe,etiquetaRol,unidadRegionalDe,SIN_ESPECIFICAR } from './participacion';

export function opcionesParticipacion(registros: RegistroParticipacion[],fechas: readonly string[]) {
  const contexto=fechas.length?registros.filter(r=>r.fechaInicio!==null&&fechas.includes(r.fechaInicio)):registros;
  const unicos=(valores:string[])=>[...new Set(valores)].sort((a,b)=>a.localeCompare(b,'es'));
  return {
    fechas:unicos(registros.flatMap(r=>r.fechaInicio?[r.fechaInicio]:[])).reverse(),
    roles:unicos(contexto.map(r=>etiquetaRol(r.rol))),
    unidadesRegionales:unicos(contexto.map(unidadRegionalDe)),
    adscripciones:unicos(contexto.flatMap(adscripcionesDe)),
    lugares:unicos(contexto.map(r=>r.lugarDesarrollo?.trim()||SIN_ESPECIFICAR)),
  };
}
export function ajustarFiltrosParticipacion<T extends {fechas:string[];rol:string[];unidadRegional:string;adscripcion:string;lugarDesarrollo:string}>(filtros:T,registros: RegistroParticipacion[]):T {
  const opciones=opcionesParticipacion(registros,filtros.fechas);
  return {...filtros,rol:filtros.rol.filter(r=>opciones.roles.includes(r)),
    unidadRegional:opciones.unidadesRegionales.includes(filtros.unidadRegional)?filtros.unidadRegional:'__todas__',
    adscripcion:opciones.adscripciones.includes(filtros.adscripcion)?filtros.adscripcion:'__todas__',
    lugarDesarrollo:opciones.lugares.includes(filtros.lugarDesarrollo)?filtros.lugarDesarrollo:'__todas__'};
}
