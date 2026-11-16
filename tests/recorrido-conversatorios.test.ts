import test from 'node:test';
import assert from 'node:assert/strict';
import {construirRecorrido,frecuenciaDocumentada} from '@/lib/recorrido-conversatorios';
import type {DocumentoConversatorio} from '@/types/conversatorios';
const documento:DocumentoConversatorio={archivo:'fuente.pptx',general:true,unidad:'Síntesis de prueba',sha256:'prueba',diapositivas:[{numero:4,titulo:'Título original',descripcion:'Descripción original',pie:'Pie original',notas:['Nota original'],grupos:[{nombre:'Grupo original',planteamientos:['Texto exacto','Texto exacto']}],solicitudes:[{referencia:'2',titulo:'Solicitud original',ambito:'Ámbito original',descripcion:'Descripción original'}]}]};
test('el recorrido conserva textos, repeticiones, referencias y orden sin modificar el documento',()=>{
  const antes=structuredClone(documento),r=construirRecorrido(documento);
  assert.equal(r.planteamientos,2);assert.equal(r.voces.length,1);assert.equal(r.peticiones.length,1);
  assert.strictEqual(r.voces[0].grupo,documento.diapositivas[0].grupos[0]);assert.strictEqual(r.voces[0].fuente,documento.diapositivas[0]);
  assert.strictEqual(r.peticiones[0].solicitud,documento.diapositivas[0].solicitudes[0]);assert.deepEqual(documento,antes);
});
test('una referencia regional nunca se interpreta como frecuencia de personas o unidades',()=>{
  const solicitud=documento.diapositivas[0].solicitudes[0];
  assert.equal(frecuenciaDocumentada(documento,solicitud),2);
  assert.equal(frecuenciaDocumentada({...documento,general:false},solicitud),null);
  assert.equal(frecuenciaDocumentada(documento,{...solicitud,referencia:'A1'}),null);
});
