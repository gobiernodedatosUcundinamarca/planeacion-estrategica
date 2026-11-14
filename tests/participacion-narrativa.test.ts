import test from 'node:test';
import assert from 'node:assert/strict';
import { crearNarrativa, compararRoles,etiquetaJornadasSinConteo } from '@/components/participacion-narrativa/modelo';
import type { ConvocatoriaDocumental } from '@/types/convocatoria-documental';
import type { RegistroParticipacion } from '@/types/participacion';
import { leerPrimeraHoja } from '@/repositories/datasource/infrastructure/excel';
import { resolve } from 'node:path';
import { construirConvocatoria } from '@/repositories/datasource/convocatoria-formato';

function registro(id:number,rol:string|null,lugar='Girardot'):RegistroParticipacion {
  return {id,documentoId:1,rol,lugarDesarrollo:lugar,fechaInicio:'2026-09-07',edad:null,
    nombreAsistente:null,codigoEstudiante:null,programaEstudiante:null,unidadEstudiante:'CHÍA',
    coordinacionDocente:null,unidadDocente:null,facultadDocente:null,areaTrabajador:null,unidadTrabajador:null};
}
const convocatoria:ConvocatoriaDocumental = {fuente:'Fuente de prueba',diapositiva:2,sha256:'prueba',filas:[
  {unidad:'Seccional Girardot',convocados:5,asistentes:999,porcentajePublicado:'Histórico',roles:[{rol:'ESTUDIANTE',convocados:1},{rol:'ADMINISTRATIVOS',convocados:4}]},
]};

test('indicadores, tabla regional y jornadas usan la base actual, no la asistencia histórica del documento',()=>{
  const registros=[registro(1,'ESTUDIANTE'),registro(2,'PLANTA'),registro(3,'TRABAJADOR')];
  const antes=crearNarrativa(registros,convocatoria);
  const despues=crearNarrativa(registros.slice(0,2),convocatoria);
  assert.equal(antes.documento.filas[0].asistentes,3);
  assert.equal(antes.jornadasRegionales[0].total,3);
  assert.equal(antes.resumen.registros,3);
  assert.equal(despues.documento.filas[0].asistentes,2);
  assert.equal(despues.comparacionRoles.reduce((s,r)=>s+r.asistentes,0),2);
  assert.equal(convocatoria.filas[0].asistentes,999,'No modifica la fuente de origen');
});
test('agrupa por lugar de jornada; no confunde la sede de origen con la de asistencia',()=>{
  const datos=crearNarrativa([registro(1,'ESTUDIANTE')],convocatoria);
  assert.equal(datos.documento.filas[0].asistentes,1);
  assert.equal(datos.jornadasRegionales[0].origenes[0].nombre,'EXTENSIÓN CHÍA');
});
test('planta y trabajador comparten la convocatoria de administrativos sin duplicarla',()=>{
  const roles=compararRoles([registro(1,'PLANTA'),registro(2,'TRABAJADOR')],convocatoria.filas);
  const grupo=roles.find(r=>r.nombre==='Administrativos')!;
  assert.deepEqual([grupo.asistentes,grupo.convocados,grupo.porcentajeAsistencia],[2,4,50]);
});

test('el detalle de jornadas suma administrativos de planta y trabajador sin perder registros',()=>{
  const registros = [registro(1,'PLANTA'), registro(2,'TRABAJADOR'), registro(3,'ESTUDIANTE'),
    {...registro(4,'TRABAJADOR'), fechaInicio:'2026-09-08'}];
  const datos = crearNarrativa(registros,convocatoria);
  const regional = datos.jornadasRegionales[0];
  assert.equal(regional.total,4);
  assert.deepEqual(regional.grupos.find(g=>g.nombre==='Administrativos'),{nombre:'Administrativos',total:3});
  assert.equal(regional.grupos.reduce((s,g)=>s+g.total,0),regional.total);
  assert.equal(datos.jornadas[0].grupos.find(g=>g.nombre==='Administrativos')!.total,2);
  assert.equal(datos.jornadas[1].grupos.find(g=>g.nombre==='Administrativos')!.total,1);
  assert.equal(regional.grupos.find(g=>g.nombre==='Administrativos')!.total/regional.total*100,75);
  assert.deepEqual(registros.map(r=>r.rol),['PLANTA','TRABAJADOR','ESTUDIANTE','TRABAJADOR']);
});
test('porcentaje de asistencia y distribución por rol tienen denominadores distintos; admite más de 100 %',()=>{
  const roles=compararRoles([registro(1,'ESTUDIANTE'),registro(2,'ESTUDIANTE'),registro(3,'PLANTA')],convocatoria.filas);
  const grupo=roles.find(r=>r.nombre==='CREADORES DE OPORTUNIDADES')!;
  assert.equal(grupo.porcentajeAsistencia,200);
  assert.equal(grupo.porcentajeParticipacion,2/3*100);
});
test('roles sin convocatoria y convocatoria cero no producen porcentajes inventados ni infinitos',()=>{
  const roles=compararRoles([registro(1,'EXTERNO')],convocatoria.filas);
  assert.equal(roles.find(r=>r.nombre==='EXTERNO')!.porcentajeAsistencia,null);
  const cero=compararRoles([registro(1,'ESTUDIANTE')],[{...convocatoria.filas[0],roles:[{rol:'ESTUDIANTE',convocados:0}]}]);
  assert.equal(cero[0].porcentajeAsistencia,null);
});
test('lugares sin convocatoria conservan sus registros y quedan fuera de la tasa comparable',()=>{
  const datos=crearNarrativa([registro(1,'ESTUDIANTE'),registro(2,'ESTUDIANTE','Lugar nuevo')],convocatoria);
  assert.equal(datos.resumen.registros,2);
  assert.equal(datos.jornadasRegionales.reduce((s,r)=>s+r.total,0),2);
  assert.equal(datos.comparacionRoles.reduce((s,r)=>s+r.asistentes,0),1);
  assert.deepEqual(datos.unidadesAdicionales,['Lugar nuevo']);
});
test('base vacía conserva denominadores y no rompe el resumen ni las tasas',()=>{
  const datos=crearNarrativa([],convocatoria);
  assert.equal(datos.resumen.registros,0);
  assert.equal(datos.documento.filas[0].asistentes,0);
  assert.equal(datos.rolPrincipal[1],0);
});

test('las fuentes de convocatoria conservan las tildes y sus subtotales por rol coinciden con cada regional',()=>{
  const filas=leerPrimeraHoja(resolve('data/source-participacion-documental/convocatoria.csv')).slice(1);
  const roles=leerPrimeraHoja(resolve('data/source-participacion-documental/convocatoria-roles.csv')).slice(1);
  assert.equal(roles.length,filas.length*4);
  for (const fila of filas) {
    const porUnidad=roles.filter(r=>r[0]===fila[0]);
    assert.equal(porUnidad.length,4,`No se encontró la unidad ${fila[0]}`);
    assert.equal(porUnidad.reduce((s,r)=>s+Number(r[2]),0),Number(fila[1]));
  }
});

test('la convocatoria regional se recalcula desde sus roles, incluidas las correcciones de la base',()=>{
  const filas=[{unidad:'Seccional Girardot',rol:'ESTUDIANTE',convocados:10,diapositiva:2},{unidad:'Seccional Girardot',rol:'DOCENTE',convocados:4,diapositiva:2}];
  assert.equal(construirConvocatoria(filas).filas[0].convocados,14);
  assert.equal(construirConvocatoria([{...filas[0],convocados:12},filas[1]]).filas[0].convocados,16);
  assert.throws(()=>construirConvocatoria([]));
  assert.throws(()=>construirConvocatoria([filas[0],filas[0]]));
  assert.throws(()=>construirConvocatoria([{...filas[0],convocados:-1}]));
  assert.throws(()=>construirConvocatoria([{...filas[0],convocados:null}]));
});

test('un título editorial heredado no congela el número real de jornadas',()=>{
  assert.equal(etiquetaJornadasSinConteo('13 Jornadas de '),'Jornadas de');
  assert.equal(etiquetaJornadasSinConteo('Jornadas de'),'Jornadas de');
  assert.equal(etiquetaJornadasSinConteo('Diálogo 2037'),'Diálogo 2037');
  const datos=crearNarrativa([registro(1,'ESTUDIANTE'),{...registro(2,'ESTUDIANTE'),fechaInicio:'2026-09-08'}],convocatoria);
  assert.equal(datos.resumen.jornadas,2);
});
