import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { crearAlmacenEditorial } from '@/repositories/datasource/infrastructure/editorial/postgres';
import { conexionSql } from '@/repositories/datasource/infrastructure/neon';
import semilla from '@/editorial/contenido-inicial.json';

test('PostgreSQL real: persistencia, concurrencia, historial, rollback e intentos compartidos',
  { skip: process.env.PORTAL_SQL_LOCAL !== '1' }, async t => {
    const url = new URL(process.env.DATABASE_URL!);
    assert.equal(url.hostname, 'db.localtest.me');
    assert.equal(url.pathname, '/planeacion_local');
    const esquema = `editorial_prueba_${randomBytes(8).toString('hex')}`;
    const sql = conexionSql();
    const consultar = (texto: string, parametros: unknown[] = []) => sql.query(texto, parametros);
    const almacen = crearAlmacenEditorial(consultar, esquema);
    const id = Object.keys(semilla.textos)[0];
    try {
      await t.test('inicialización idempotente e importación que conserva el destino', async () => {
        await almacen.inicializar(); await almacen.inicializar();
        assert.deepEqual(await almacen.leer(), { revision: 0, textos: {} });
        assert.deepEqual(await almacen.importarInicial(semilla), semilla);
        assert.deepEqual(await almacen.importarInicial(semilla), semilla);
      });
      await t.test('dos instancias compiten por la misma revisión; solo una guarda', async () => {
        const otro = crearAlmacenEditorial(consultar, esquema);
        const actual = await almacen.leer();
        const resultados = await Promise.allSettled([
          almacen.guardar(id, 'Edición A', actual.revision), otro.guardar(id, 'Edición B', actual.revision),
        ]);
        assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
        const rechazo = resultados.find(r => r.status === 'rejected') as PromiseRejectedResult;
        assert.equal(rechazo.reason.message, 'CONFLICTO');
        const nuevo = await otro.leer();
        assert.equal(nuevo.revision, actual.revision + 1);
        assert.ok(['Edición A', 'Edición B'].includes(nuevo.textos[id]));
        const [conteo] = await sql.query(`SELECT count(*)::integer AS n FROM "${esquema}".editorial_historial`);
        assert.equal(conteo.n, 2);
        await assert.rejects(almacen.importarInicial(semilla), /IMPORTACION_RECHAZADA/);
      });
      await t.test('un fallo del historial revierte también el texto y la revisión', async () => {
        const anterior = await almacen.leer();
        await sql.query(`ALTER TABLE "${esquema}".editorial_historial ADD CONSTRAINT fallo_controlado CHECK(nuevo IS DISTINCT FROM '"FALLO_ATOMICO"'::jsonb)`);
        await assert.rejects(almacen.guardar(id, 'FALLO_ATOMICO', anterior.revision));
        assert.deepEqual(await almacen.leer(), anterior);
      });
      await t.test('ocultar, restaurar y conservar los otros textos', async () => {
        let actual = await almacen.leer();
        actual = await almacen.guardar(id, '', actual.revision);
        assert.equal(actual.textos[id], '');
        actual = await almacen.guardar(id, null, actual.revision);
        assert.equal(Object.hasOwn(actual.textos, id), false);
        assert.equal(Object.keys(actual.textos).length, Object.keys(semilla.textos).length - 1);
      });
      await t.test('límite persistente entre instancias y renovación después de la ventana', async () => {
        const resultados = await Promise.all(Array.from({ length: 7 }, () => almacen.reservarIntento()));
        assert.equal(resultados.filter(Boolean).length, 5);
        assert.equal(await crearAlmacenEditorial(consultar, esquema).reservarIntento(), false);
        await sql.query(`UPDATE "${esquema}".editorial_intentos SET inicio=now()-interval '16 minutes'`);
        assert.equal(await almacen.reservarIntento(), true);
        await almacen.limpiarIntentos();
        assert.equal(await almacen.reservarIntento(), true);
      });
    } finally {
      assert.match(esquema, /^editorial_prueba_[a-f0-9]{16}$/);
      await sql.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
    }
  });
