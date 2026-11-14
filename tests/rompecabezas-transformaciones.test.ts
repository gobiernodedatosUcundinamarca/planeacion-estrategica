import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync,readFileSync } from 'node:fs';
import { resolve,sep } from 'node:path';
import { resumirTransformaciones } from '@/lib/reglas/resumen-transformaciones';
import type { RespuestaMomento4 } from '@/types/momento4';
import { TRANSFORMACIONES_MOMENTO4 } from '@/lib/reglas/momento4';
import { opcionesComentarios, TODOS_LOS_COMENTARIOS } from '@/lib/reglas/navegacion-comentarios';
import { compararOrdenTransformaciones } from '@/lib/reglas/orden-transformaciones';

test('tarjetas y filtros mantienen el orden institucional sin depender del orden de los registros',()=>{
  const catalogo = [...TRANSFORMACIONES_MOMENTO4];
  const filas = [...catalogo].reverse().map((t,i)=>({...respuesta(i,t.id,'Sí','Aporte'),etiqueta:t.etiqueta}));
  const esperado = catalogo.map(t=>t.id);
  assert.deepEqual(resumirTransformaciones(filas).grupos.map(g=>g.id),esperado);
  assert.deepEqual(opcionesComentarios(filas,TODOS_LOS_COMENTARIOS).transformaciones.map(g=>g.id),esperado);
  assert.deepEqual([...catalogo].reverse().map(t=>t.etiqueta).sort(compararOrdenTransformaciones),catalogo.map(t=>t.etiqueta));
  assert.equal(resumirTransformaciones(filas).total,filas.length);
  assert.deepEqual(resumirTransformaciones(filas).grupos.map(g=>g.respuestas),[1,1,1,1,1]);
});

function respuesta(id:number,transformacion:string,respondeNecesidad:string|null,ajustes:string|null):RespuestaMomento4 {
  return {id,transformacion,etiqueta:`Nombre de ${transformacion}`,respondeNecesidad,ajustes,correo:null,nombre:null,fechaInicio:null,tipoActor:null,programaGraduado:null,unidadRegional:null,cluster:null};
}
test('el rompecabezas recalcula resultados y comentarios desde las respuestas vigentes',()=>{
  const filas=[respuesta(1,'grupo-a','Sí','Un aporte'),respuesta(2,'grupo-a','Parcialmente',' '),respuesta(3,'grupo-b','No',null)];
  const antes=resumirTransformaciones(filas);
  assert.equal(antes.total,3);assert.equal(antes.comentarios,1);
  assert.deepEqual(antes.grupos.map(g=>[g.id,g.respuestas,g.favorables]),[['grupo-a',2,1],['grupo-b',1,0]]);
  const despues=resumirTransformaciones([{...filas[0],respondeNecesidad:'No',ajustes:null},filas[1]]);
  assert.equal(despues.total,2);assert.equal(despues.comentarios,0);assert.equal(despues.grupos[0].favorables,0);
  assert.equal(despues.grupos.length,1);
});
test('un grupo nuevo de la fuente se conserva aunque no tenga pieza en el material gráfico',()=>{
  const resultado=resumirTransformaciones([respuesta(1,'grupo-nuevo','Sí','Comentario')]);
  assert.equal(resultado.grupos[0].id,'grupo-nuevo');assert.equal(resultado.grupos[0].nombre,'Nombre de grupo-nuevo');
  assert.equal(resultado.grupos[0].respuestas,1);
  assert.deepEqual(resumirTransformaciones([]),{total:0,comentarios:0,grupos:[]});
});
test('el total de comentarios utiliza los mismos identificadores únicos que el explorador',()=>{
  const fila=respuesta(1,'grupo-a','Sí','Texto');
  assert.equal(resumirTransformaciones([fila,fila]).comentarios,1);
});
test('misión y visión conservan sus identidades y todos los recursos gráficos existen',()=>{
  const raiz=resolve('public');
  const caras=JSON.parse(readFileSync(resolve(raiz,'rompecabezas/piezas.json'),'utf8')) as {id:string;piezas:{id:string;imagen:string;detalle:string;posicion:number}[]}[];
  assert.deepEqual(caras.map(c=>c.id).sort(),['mision','vision']);
  const identidades=caras[0].piezas.map(p=>p.id).sort();
  for(const cara of caras){
    assert.deepEqual(cara.piezas.map(p=>p.id).sort(),identidades);
    assert.equal(new Set(cara.piezas.map(p=>p.posicion)).size,cara.piezas.length);
    assert.equal(cara.piezas.filter(p=>p.id==='centro').length,1);
    for(const pieza of cara.piezas)for(const recurso of [pieza.imagen,pieza.detalle]){
      assert(recurso.startsWith(`/rompecabezas/${cara.id}-${pieza.id}`));
      const archivo=resolve(raiz,recurso.slice(1));
      assert(archivo.startsWith(raiz+sep));assert(existsSync(archivo),recurso);
    }
  }
});
