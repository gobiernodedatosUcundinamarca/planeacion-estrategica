import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { comprobarClave, comprobarSesion, crearSesion, crearVerificador, DURACION_SESION } from '@/lib/editorial/seguridad';
import { configuracionEditorial, origenEditorialPermitido } from '@/lib/editorial/configuracion';
import { validarEstado, validarCambio } from '@/lib/editorial/modelo';
import catalogo from '@/editorial/catalogo.json';

test('verificador scrypt: clave correcta, incorrecta y formatos manipulados', async () => {
  const clave = randomBytes(20).toString('hex');
  const verificador = await crearVerificador(clave);
  assert.equal(await comprobarClave(clave, verificador), true);
  assert.equal(await comprobarClave(clave + 'x', verificador), false);
  assert.equal(await comprobarClave(clave, 'scrypt:invalido'), false);
  assert.equal(await comprobarClave('x'.repeat(201), verificador), false);
});

test('sesiones: firma, expiración y rotación de secretos o contraseña', async () => {
  const secreto = randomBytes(32).toString('hex');
  const verificador = await crearVerificador(randomBytes(20).toString('hex'));
  const ahora = Date.now();
  const token = crearSesion(secreto, verificador, ahora);
  assert.equal(comprobarSesion(token, secreto, verificador, ahora + 1), true);
  assert.equal(comprobarSesion(token, secreto, verificador, ahora + DURACION_SESION * 1000), false);
  assert.equal(comprobarSesion(token + 'x', secreto, verificador), false);
  assert.equal(comprobarSesion(token, randomBytes(32).toString('hex'), verificador), false);
  assert.equal(comprobarSesion(token, secreto, await crearVerificador('otra-clave-de-prueba')), false);
  assert.equal(comprobarSesion('NaN.a.b', secreto, verificador), false);
});

test('configuración cerrada por defecto y orígenes exactos, sin comodines', async () => {
  const claves = ['EDITORIAL_STORAGE', 'EDITORIAL_LOCAL_DIR', 'EDITORIAL_PASSWORD_SCRYPT', 'EDITORIAL_SESSION_SECRET', 'EDITORIAL_ALLOWED_ORIGINS', 'DATABASE_URL', 'VERCEL'];
  const anterior = Object.fromEntries(claves.map(k => [k, process.env[k]]));
  try {
    claves.forEach(k => delete process.env[k]);
    assert.equal(configuracionEditorial(), null);
    process.env.EDITORIAL_LOCAL_DIR = 'carpeta-local-de-prueba';
    assert.deepEqual(configuracionEditorial(), { modo: 'local' });
    process.env.VERCEL = '1';
    assert.equal(configuracionEditorial(), null);
    process.env.EDITORIAL_STORAGE = 'postgres';
    process.env.DATABASE_URL = 'postgres://ejemplo-invalido/prueba';
    process.env.EDITORIAL_PASSWORD_SCRYPT = await crearVerificador('clave-de-prueba');
    process.env.EDITORIAL_SESSION_SECRET = randomBytes(32).toString('hex');
    process.env.EDITORIAL_ALLOWED_ORIGINS = 'https://oficial.example';
    const config = configuracionEditorial();
    assert.equal(config?.modo, 'postgres');
    assert.equal(origenEditorialPermitido('https://oficial.example/api/editorial', config), true);
    assert.equal(origenEditorialPermitido('https://oficial.example.ajeno.example/api/editorial', config), false);
    for (const origen of ['https://*.example', 'https://oficial.example/ruta', 'http://oficial.example', 'null', 'https://usuario:clave@oficial.example']) {
      process.env.EDITORIAL_ALLOWED_ORIGINS = origen;
      assert.equal(configuracionEditorial(), null);
    }
    process.env.EDITORIAL_ALLOWED_ORIGINS = 'http://127.0.0.1:3219';
    assert.equal(configuracionEditorial(), null);
    delete process.env.VERCEL;
    assert.equal(configuracionEditorial()?.modo, 'postgres');
  } finally {
    for (const k of claves) { if (anterior[k] === undefined) delete process.env[k]; else process.env[k] = anterior[k]; }
  }
});

test('ediciones: catálogo, revisión, restauración y texto vacío sin permitir claves arbitrarias', () => {
  const id = Object.keys(catalogo)[0];
  validarCambio(id, '', 0);
  validarCambio(id, null, 1);
  assert.throws(() => validarCambio('__proto__', 'x', 1));
  assert.throws(() => validarCambio(id, 'x'.repeat(4001), 1));
  for (const revision of [-1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validarCambio(id, 'x', revision));
  assert.deepEqual(validarEstado({ revision: 3, textos: { [id]: '' } }), { revision: 3, textos: { [id]: '' } });
  assert.throws(() => validarEstado({ revision: 0, textos: { [id]: null } }));
});
