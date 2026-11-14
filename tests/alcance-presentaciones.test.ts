import test from 'node:test';
import assert from 'node:assert/strict';
import { separarComentariosPresentaciones, resumirAportesPresentaciones, referenciasSoloAportes } from '@/lib/reglas/alcance-presentaciones';
import { contarTemas, filtrarComentarios, TODOS_LOS_COMENTARIOS } from '@/lib/reglas/navegacion-comentarios';
import type { RespuestaMomento4 } from '@/types/momento4';
import type { ClasificacionDocumental } from '@/types/clasificacion-documental';
const respuesta=(id:number,unidadRegional='Sede de prueba',transformacion='digital'):RespuestaMomento4=>({id,unidadRegional,transformacion,etiqueta:transformacion,ajustes:'Texto de prueba',correo:null,nombre:null,fechaInicio:null,tipoActor:null,programaGraduado:null,respondeNecesidad:null,cluster:null});
function referencia(id:number,estado:ClasificacionDocumental['estado'],...codigos:string[]):ClasificacionDocumental {
  return {idRespuesta:id,estado,motivo:null,fuente:{archivo:'fuente.xlsx',sha256:'prueba',hoja:null,fila:null,version:'prueba',taxonomia:null,sha256Taxonomia:null},temas:codigos.map(c=>({id:c,codigo:c,nombre:c,componente:'',otrosComponentes:[],criterio:'',exclusion:'',justificacion:'',probabilidad:null}))};
}
test('el recorte del informe conserva las filas revisadas y separa las exclusiones sin perder comentarios',()=>{
  const respuestas=Array.from({length:8},(_,i)=>respuesta(i+1));
  respuestas[6]=respuesta(7,'Sin especificar');respuestas[7].ajustes='  ';
  const refs=new Map([referencia(1,'con_temas','A1'),referencia(2,'sin_tema'),referencia(3,'sin_contenido_revisado'),referencia(4,'excluido_preparacion'),referencia(5,'texto_modificado'),referencia(7,'con_temas','A1')].map(r=>[r.idRespuesta,r]));
  const {documentados,otros}=separarComentariosPresentaciones([...respuestas,respuestas[0]],refs,['Sede de prueba']);
  assert.deepEqual(documentados.map(r=>r.id),[1,2,3]);assert.deepEqual(otros.map(r=>r.id),[4,5,6,7]);
  assert.equal(new Set([...documentados,...otros].map(r=>r.id)).size,7);
  assert.equal(separarComentariosPresentaciones(respuestas,refs,[]).documentados.length,0);
});
test('las asignaciones múltiples no inflan el total; Conformidad se consulta aparte y cada transformación tiene su base',()=>{
  const filas=[respuesta(1),respuesta(2),respuesta(3),respuesta(4,'Sede de prueba','vida')];
  const refs=new Map([referencia(1,'con_temas','A1','A2','A2'),referencia(2,'con_temas','A1'),referencia(3,'con_temas','Conformidad'),referencia(4,'con_temas','A1')].map(r=>[r.idRespuesta,r]));
  const resumen=resumirAportesPresentaciones(filas,refs);
  assert.equal(resumen.total,4);assert.equal(resumen.conAportes,3);assert.equal(resumen.sinAportes,1);assert.equal(resumen.asignaciones,4);
  assert.equal(resumen.bases.get('digital'),3);assert.equal(resumen.bases.get('vida'),1);
  assert.equal(contarTemas(filas,refs).find(t=>t.id==='digital:A1')?.total,2);
  assert.deepEqual(filtrarComentarios(filas,referenciasSoloAportes(refs),{...TODOS_LOS_COMENTARIOS,sinTema:true}).map(r=>r.id),[3]);
  assert.equal(refs.get(3)?.temas[0].codigo,'Conformidad');
});
