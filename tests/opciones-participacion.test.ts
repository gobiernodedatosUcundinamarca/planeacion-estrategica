import test from 'node:test';
import assert from 'node:assert/strict';
import { opcionesParticipacion,ajustarFiltrosParticipacion } from '@/lib/reglas/opciones-participacion';
import type { RegistroParticipacion } from '@/types/participacion';
const base={id:1,documentoId:1,fechaInicio:'2026-10-26',rol:'ESTUDIANTE',unidadEstudiante:'Chía',programaEstudiante:'Programa A',lugarDesarrollo:'Chía',nombreAsistente:null,edad:null,codigoEstudiante:null,coordinacionDocente:null,unidadDocente:null,facultadDocente:null,areaTrabajador:null,unidadTrabajador:null} satisfies RegistroParticipacion;
const filas=[base,{...base,id:2,fechaInicio:'2026-10-27',rol:'GRADUADO',unidadEstudiante:'Soacha',programaEstudiante:'Programa B'},{...base,id:3,fechaInicio:null,rol:'EXTERNO'}];
test('una fecha limita roles, regionales y dependencias a sus registros',()=>{
  const opciones=opcionesParticipacion(filas,['2026-10-26']);
  assert.deepEqual(opciones.roles,['CREADORES DE OPORTUNIDADES']);
  assert.deepEqual(opciones.unidadesRegionales,['EXTENSIÓN CHÍA']);
  assert.deepEqual(opciones.adscripciones,['PROGRAMA A']);
  assert.equal(opciones.fechas.length,2);
});
test('varias fechas reúnen sus opciones y todas incluye los registros sin fecha',()=>{
  assert.equal(opcionesParticipacion(filas,['2026-10-26','2026-10-27']).roles.length,2);
  assert.equal(opcionesParticipacion(filas,[]).roles.length,3);
  assert.equal(opcionesParticipacion(filas,['2099-01-01']).roles.length,0);
});
test('cambiar fecha conserva selecciones compatibles y retira las que ya no existen',()=>{
  const filtro={fechas:['2026-10-26'],rol:['CREADORES DE OPORTUNIDADES','GRADUADO'],unidadRegional:'EXTENSIÓN SOACHA',adscripcion:'PROGRAMA B',lugarDesarrollo:'__todas__'};
  const ajustado=ajustarFiltrosParticipacion(filtro,filas);
  assert.deepEqual(ajustado.rol,['CREADORES DE OPORTUNIDADES']);
  assert.equal(ajustado.unidadRegional,'__todas__');assert.equal(ajustado.adscripcion,'__todas__');
  assert.deepEqual(filtro.rol,['CREADORES DE OPORTUNIDADES','GRADUADO']);
  assert.equal(ajustarFiltrosParticipacion({...filtro,unidadRegional:'EXTENSIÓN CHÍA',adscripcion:'PROGRAMA A'},filas).adscripcion,'PROGRAMA A');
});
