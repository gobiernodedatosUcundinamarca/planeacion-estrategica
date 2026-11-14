import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarAportesParaLectura } from '@/lib/reglas/orden-aportes';

test('presenta aportes específicos antes de reconocimientos genéricos y ausencias de respuesta', () => {
  const aportes = ['N/a', 'Mejorar los laboratorios', 'Felicitaciones por la gran apuesta de este plan estratégico 2027-2027', 'Mejorar', 'No hay laboratorios', '.', 'Laboratorios', 'Gracias, necesitamos más becas', 'Sin comentarios'].map((aporte,id) => ({ id, aporte }));
  const originales = structuredClone(aportes);
  const ordenados = ordenarAportesParaLectura(aportes);
  assert.deepEqual(ordenados.map(a => a.id), [1,4,7,6,2,3,0,5,8]);
  assert.deepEqual(aportes, originales);
});

test('los comentarios concretos preceden a GG y los reconocimientos genéricos, incluso siendo breves o críticos', () => {
  const textos=['GG','Muy buena orientación','Gracias por tenernos encuenta','Muy interesante','Excelente ejercicio',
    'Mala gestión de los recursos: la plataforma no es eficiente',
    'Mejorar planta docente','Gracias, necesitamos más becas','Laboratorios','IA','Muy buena presentación','GG, mejorar la conectividad'];
  const aportes=textos.map((aporte,id)=>({id,aporte}));
  const orden=ordenarAportesParaLectura(aportes).map(a=>a.id);
  assert.deepEqual(orden,[5,6,7,11,8,9,1,2,3,4,10,0]);
  assert.equal(orden.length,textos.length);
  assert.deepEqual(aportes.map(a=>a.aporte),textos);
});

test('el orden no depende de la longitud, no castiga las críticas y se recalcula para aportes nuevos',()=>{
  const cortos={id:1,aporte:'Más becas'}, largo={id:2,aporte:'Gracias por la excelente actividad universitaria y por tenernos siempre en cuenta'};
  assert.deepEqual(ordenarAportesParaLectura([largo,cortos]).map(a=>a.id),[1,2]);
  assert.deepEqual(ordenarAportesParaLectura([largo,cortos,{id:3,aporte:'No hay laboratorios'}]).map(a=>a.id),[3,1,2]);
});

test('conserva todas las respuestas, sus metadatos y los textos duplicados de personas diferentes', () => {
  const aportes = [{id:1,aporte:'Nada',unidad:'A'}, {id:2,aporte:'Más becas',unidad:'B'}, {id:3,aporte:'Más becas',unidad:'C'}];
  const resultado = ordenarAportesParaLectura(aportes);
  assert.equal(resultado.length, aportes.length);
  assert.deepEqual(resultado.map(a => a.id), [2,3,1]);
  assert.strictEqual(resultado[0], aportes[1]);
  assert.equal(resultado[1].unidad, 'C');
  assert.deepEqual(ordenarAportesParaLectura([]), []);
});
