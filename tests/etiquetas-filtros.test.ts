import test from 'node:test';
import assert from 'node:assert/strict';
import catalogo from '@/editorial/catalogo.json';
import { idEtiquetaFiltro } from '@/lib/editorial/etiquetas-filtros';
import { validarCambio } from '@/lib/editorial/modelo';

test('los enunciados de los filtros tienen claves estables y separadas por módulo',()=>{
  assert.notEqual(idEtiquetaFiltro('transformaciones','Fecha'),idEtiquetaFiltro('participacion','Fecha'));
  assert.equal(idEtiquetaFiltro('transformaciones','¿Responde a lo que se necesita?'),'filtro-transformaciones-responde-a-lo-que-se-necesita');
  const etiquetas=['Transformación','Fecha','Tipo de actor','Unidad Regional','Programa del graduado','¿Responde a lo que se necesita?','Buscar'];
  for(const etiqueta of etiquetas){const id=idEtiquetaFiltro('transformaciones',etiqueta);assert.ok(Object.hasOwn(catalogo,id));assert.doesNotThrow(()=>validarCambio(id,'Etiqueta editada',0));}
});
