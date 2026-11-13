import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { crearVerificador } from '@/lib/editorial/seguridad';
import { crearAlmacenEditorial } from '@/repositories/datasource/infrastructure/editorial/postgres';
import { conexionSql } from '@/repositories/datasource/infrastructure/neon';
import semilla from '@/editorial/contenido-inicial.json';
import catalogo from '@/editorial/catalogo.json';

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));
async function puertoLibre() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const puerto = (socket.address() as { port: number }).port;
  await new Promise<void>(r => socket.close(() => r()));
  return puerto;
}

async function main() {
  assert.equal(process.env.PORTAL_SQL_LOCAL, '1', 'Esta prueba solo permite PostgreSQL Docker local');
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, 'db.localtest.me'); assert.equal(url.pathname, '/planeacion_local');
  const esquema = `editorial_prueba_${randomBytes(8).toString('hex')}`;
  const carpeta = await mkdtemp(join(tmpdir(), 'planeacion-editorial-prueba-'));
  const clave = randomBytes(24).toString('hex');
  const verificador = await crearVerificador(clave);
  const secreto = randomBytes(32).toString('hex');
  const [, salt, hash] = verificador.split(':');
  const sql = conexionSql();
  const almacen = crearAlmacenEditorial((texto, parametros = []) => sql.query(texto, parametros), esquema);
  let servidor: ChildProcess | null = null;
  async function detener() {
    if (!servidor || servidor.exitCode !== null) return;
    const terminado = once(servidor, 'exit');
    servidor.kill();
    await Promise.race([terminado, pausa(5000)]);
    if (servidor.exitCode === null) { servidor.kill('SIGKILL'); await terminado; }
    servidor = null;
  }
  try {
    await almacen.inicializar(); await almacen.importarInicial(semilla);
    await writeFile(join(carpeta, 'textos.json'), JSON.stringify(semilla));
    await writeFile(join(carpeta, 'acceso.json'), JSON.stringify({ salt, hash, firma: secreto }), { mode: 0o600 });
    for (const modo of ['local', 'postgres', 'deshabilitado'] as const) {
      const puerto = await puertoLibre();
      const base = `http://127.0.0.1:${puerto}`;
      const env = { ...process.env, PORT: String(puerto), EDITORIAL_STORAGE: '',
        EDITORIAL_LOCAL_DIR: carpeta, EDITORIAL_PASSWORD_SCRYPT: verificador,
        EDITORIAL_SESSION_SECRET: secreto, EDITORIAL_ALLOWED_ORIGINS: `${base},${base.replace('http:', 'https:')}`,
        EDITORIAL_SCHEMA: esquema, VERCEL: '', NEXT_TELEMETRY_DISABLED: '1' };
      if (modo === 'postgres') env.EDITORIAL_STORAGE = 'postgres';
      if (modo === 'deshabilitado') env.VERCEL = '1';
      async function arrancar() {
        servidor = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(puerto)],
          { env, windowsHide: true, stdio: 'ignore' });
        for (let i = 0; i < 150; i++) {
          if (servidor.exitCode !== null) throw Error('El servidor de prueba terminó antes de iniciar');
          try { if ((await fetch(base + '/api/editorial')).ok) return; } catch { /* Todavía inicia. */ }
          await pausa(200);
        }
        throw Error('El servidor de prueba no respondió');
      }
      await arrancar();
      const leer = async (cookie = '') => (await fetch(base + '/api/editorial', { headers: { Cookie: cookie } })).json();
      const enviar = (body: unknown, cookie = '', extra: Record<string, string> = {}) => fetch(base + '/api/editorial', {
        method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie, ...extra }, body: JSON.stringify(body),
      });
      assert.deepEqual((await leer()).textos, semilla.textos);
      if (modo === 'deshabilitado') {
        assert.equal((await leer()).habilitado, false);
        assert.equal((await enviar({ accion: 'entrar', clave })).status, 503);
        await detener();
        console.log({ modo, fallaCerrada: true, contenidoPublicoConservado: true });
        continue;
      }
      assert.equal((await leer()).habilitado, true);
      assert.equal((await enviar({ accion: 'entrar', clave }, '', { Origin: 'https://ajeno.example' })).status, 403);
      assert.equal((await enviar({ accion: 'entrar', clave: 'incorrecta' })).status, 401);
      assert.equal((await enviar({ id: 'x', valor: 'x', revision: 0 })).status, 401);
      const acceso = await enviar({ accion: 'entrar', clave });
      assert.equal(acceso.status, 200);
      const cabecera = acceso.headers.get('set-cookie')!;
      assert.match(cabecera, /HttpOnly/i); assert.match(cabecera, /SameSite=strict/i);
      const cookie = cabecera.split(';')[0];
      const inicial = await leer(cookie);
      assert.equal(inicial.autorizado, true);
      assert.equal((await enviar({ id: 'no-existe', valor: 'x', revision: inicial.revision }, cookie)).status, 400);
      assert.equal((await enviar({ id: 'x', valor: 'x'.repeat(11000), revision: 0 }, cookie)).status, 413);
      const id = Object.keys(catalogo)[0];
      const concurrentes = await Promise.all([
        enviar({ id, valor: 'Prueba A', revision: inicial.revision }, cookie),
        enviar({ id, valor: 'Prueba B', revision: inicial.revision }, cookie),
      ]);
      assert.deepEqual(concurrentes.map(r => r.status).sort(), [200, 409]);
      const guardado = await leer();
      await detener(); await arrancar();
      assert.deepEqual((await leer()).textos, guardado.textos);
      assert.equal((await leer(cookie)).autorizado, true);
      assert.equal((await enviar({ id, valor: inicial.textos[id] ?? null, revision: guardado.revision }, cookie)).status, 200);
      if (modo === 'postgres') {
        const seguro = await enviar({ accion: 'entrar', clave }, '', { Origin: base.replace('http:', 'https:'), 'x-forwarded-proto': 'https' });
        assert.equal(seguro.status, 200);
        assert.match(seguro.headers.get('set-cookie')!, /^__Host-editorial-sesion=/);
        assert.match(seguro.headers.get('set-cookie')!, /; Secure/i);
      }
      for (const [nombre, motor, opciones] of [
        ['chromium', chromium, { viewport: { width: 1440, height: 1000 } }],
        ['webkit', webkit, { viewport: { width: 1440, height: 1000 } }],
        ['webkit-movil', webkit, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
      ] as const) {
        const navegador = await motor.launch();
        try {
          const pagina = await navegador.newPage(opciones);
          await pagina.goto(base + '/valoracion-territorio', { waitUntil: 'networkidle' });
          const control = pagina.getByRole('button', { name: 'Activar modo de edición', exact: true });
          await pagina.waitForFunction(() => document.querySelector<HTMLButtonElement>('.herramientas-pie button[aria-label="Activar modo de edición"]')?.disabled === false);
          assert.equal(await pagina.locator('.lapiz-editorial').count(), 0);
          await control.click();
          const dialogo = pagina.locator('dialog[aria-labelledby=titulo-editorial]');
          await dialogo.getByLabel('Contraseña').fill(clave);
          await dialogo.getByRole('button', { name: 'Ingresar', exact: true }).click();
          await dialogo.waitFor({ state: 'hidden' });
          const objetivo = pagina.locator('[data-editorial-id]').first();
          const objetivoId = await objetivo.getAttribute('data-editorial-id');
          const antes = await leer();
          await objetivo.getByRole('button').click();
          await dialogo.locator('textarea').fill('Borrador cancelado');
          await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
          assert.equal((await leer()).revision, antes.revision);
          await objetivo.getByRole('button').click();
          const texto = 'Texto de prueba <script>window.editorialInseguro=true</script>';
          await dialogo.locator('textarea').fill(texto);
          await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
          await dialogo.waitFor({ state: 'hidden' });
          await pagina.waitForFunction(({ id, texto }) => document.querySelector(`[data-editorial-id="${id}"]`)?.textContent?.includes(texto), { id: objetivoId, texto });
          assert.ok((await objetivo.textContent())?.includes(texto));
          assert.equal(await pagina.evaluate(() => Object.hasOwn(window, 'editorialInseguro')), false);
          await pagina.reload({ waitUntil: 'networkidle' });
          await pagina.waitForFunction(({ id, texto }) => document.querySelector(`[data-editorial-id="${id}"]`)?.textContent?.includes(texto), { id: objetivoId, texto });
          const cambios = await leer();
          assert.equal((await enviar({ id: objetivoId, valor: antes.textos[objetivoId!] ?? null, revision: cambios.revision }, cookie)).status, 200);
          await pagina.getByRole('button', { name: 'Activar modo de edición', exact: true }).click();
          await pagina.getByRole('button', { name: 'Salir del modo de edición', exact: true }).click();
          assert.equal(await pagina.locator('.lapiz-editorial').count(), 0);
          console.log({ modo, navegador: nombre, guardarCancelar: true, persistencia: true, textoPlano: true });
        } finally { await navegador.close(); }
      }
      const revision = (await leer()).revision;
      const salir = await enviar({ accion: 'salir' }, cookie);
      assert.match(salir.headers.get('set-cookie')!, /Max-Age=0/i);
      assert.equal((await enviar({ id, valor: 'x', revision })).status, 401);
      assert.deepEqual((await leer()).textos, semilla.textos);
      console.log({ modo, api: true, concurrencia: true, reinicio: true, sesionProtegida: true });
      await detener();
    }
  } finally {
    await detener();
    assert.match(esquema, /^editorial_prueba_[a-f0-9]{16}$/);
    await sql.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
    const propia = await realpath(carpeta);
    assert.equal(dirname(propia), await realpath(tmpdir()));
    assert.ok(basename(propia).startsWith('planeacion-editorial-prueba-'));
    await rm(propia, { recursive: true });
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : String(error)).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[conexión privada]'));
  process.exitCode = 1;
});
