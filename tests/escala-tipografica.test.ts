import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIAS, ESCALA_MINIMA, ESCALA_MAXIMA, esEscalaValida, interpretarAjustes } from '../components/editorial/escala-tipografica';

test('todos los valores consecutivos conservan una escala proporcional y creciente', () => {
  for (const tamanoOriginal of [12, 14, 16, 28, 48, 89.6, 105.6]) {
    let anterior = 0;
    for (let escala = ESCALA_MINIMA; escala <= ESCALA_MAXIMA; escala++) {
      assert.equal(esEscalaValida(escala), true);
      const actual = tamanoOriginal * escala / 100;
      assert.ok(actual > anterior);
      if (escala > ESCALA_MINIMA) assert.ok(Math.abs(actual - anterior - tamanoOriginal / 100) < 1e-10);
      anterior = actual;
    }
  }
});

test('no se aceptan valores vacíos, fuera de rango, no finitos ni fracciones', () => {
  for (const valor of [0, 24, 251, -1, 101.5, NaN, Infinity]) assert.equal(esEscalaValida(valor), false);
  assert.deepEqual(interpretarAjustes('{"titulos":null,"textos":"120","notas":999}', null), {});
  assert.deepEqual(interpretarAjustes('contenido inválido', null), {});
});

test('las preferencias anteriores se convierten en proporciones sin interpretar referencias como píxeles reales', () => {
  assert.deepEqual(interpretarAjustes(null, '{"titulos":49,"textos":18}'), { titulos: 102, textos: 113 });
  const originales = Object.fromEntries(CATEGORIAS.map(c => [c.id, c.referenciaAnterior]));
  assert.deepEqual(interpretarAjustes(null, JSON.stringify(originales)), {});
});

test('el formato actual tiene prioridad, conserva categorías independientes y omite 100 %', () => {
  assert.deepEqual(interpretarAjustes('{"titulos":101,"textos":110,"notas":100,"otra":120}', '{"titulos":49}'), { titulos: 101, textos: 110 });
  assert.deepEqual(interpretarAjustes('{}', '{"titulos":49}'), {});
});
