import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretarConversatorio, actorConversatorio } from '@/lib/reglas/conversatorios';

test('solo incorpora diapositivas de conversatorios y conserva sus textos y grupos', () => {
  assert.equal(interpretarConversatorio(['Otros resultados'], 2), null);
  const slide = interpretarConversatorio(['Cabecera', '14', 'Conversatorio con el Rector – lo que dijo cada grupo', 'Descripción original', 'Personal administrativo · encuentro compartido', '• Propuesta íntegra.', '• Segunda propuesta.', 'Graduados', '• Consulta del grupo.', 'Pie documental'], 14)!;
  assert.deepEqual(slide.grupos, [{ nombre: 'Personal administrativo · encuentro compartido', planteamientos: ['Propuesta íntegra.', 'Segunda propuesta.'] }, { nombre: 'Graduados', planteamientos: ['Consulta del grupo.'] }]);
  assert.equal(slide.pie, 'Pie documental');
  assert.equal(actorConversatorio(slide.grupos[0].nombre), 'Personal administrativo');
});

test('conserva referencias, ámbitos y conclusiones sin convertirlas en conteos de respuestas', () => {
  const slide = interpretarConversatorio(['Cabecera', '12', 'Conversatorio con el Rector – solicitudes estratégicas', 'Descripción', '5', 'Infraestructura', '5 unidades: A, B, C, D y E', 'Petición original', 'Conclusión', 'Conclusión completa.', 'Pie'], 12)!;
  assert.deepEqual(slide.solicitudes, [{ referencia: '5', titulo: 'Infraestructura', ambito: '5 unidades: A, B, C, D y E', descripcion: 'Petición original' }]);
  assert.deepEqual(slide.notas, ['Conclusión', 'Conclusión completa.']);
});

test('un cambio de estructura no se presenta silenciosamente como una fuente válida', () => {
  assert.throws(() => interpretarConversatorio(['Conversatorio con el Rector – lo que dijo cada grupo', 'Descripción', '• Sin grupo', 'Pie'], 1));
  assert.throws(() => interpretarConversatorio(['Conversatorio con el Rector – solicitudes estratégicas', 'Descripción', '1', 'Solicitud incompleta', 'Pie'], 2));
});
